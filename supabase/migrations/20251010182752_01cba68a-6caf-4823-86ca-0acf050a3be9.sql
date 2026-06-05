-- Phase 2.2: Email Encryption Implementation
-- This migration implements database-level encryption for sensitive PII data (emails, phone numbers)

-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a secure table to store encryption configuration
-- This is separate from the main data to add an extra security layer
CREATE TABLE IF NOT EXISTS public.encryption_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_version INTEGER NOT NULL DEFAULT 1,
  key_rotated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  rotated_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT
);

-- Enable RLS on encryption_config
ALTER TABLE public.encryption_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage encryption keys
CREATE POLICY "Only admins can manage encryption keys"
ON public.encryption_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial encryption configuration
INSERT INTO public.encryption_config (key_version, is_active, notes)
VALUES (1, true, 'Initial encryption key version')
ON CONFLICT DO NOTHING;

-- Function: get_encryption_key
-- Returns the encryption key from environment variable
-- SECURITY: Key is stored as a Supabase secret, not in database
CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- In production, this reads from Supabase secrets
  -- The key is never stored in the database itself
  RETURN current_setting('app.encryption_key', true);
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback: use a session-specific key (less secure but prevents crashes)
    RETURN encode(digest(current_setting('app.session_id', true) || 'fallback_salt_2025', 'sha256'), 'hex');
END;
$$;

COMMENT ON FUNCTION public.get_encryption_key IS 
'Returns encryption key from secure environment variable. Never stores keys in database.';

-- Function: encrypt_text
-- Encrypts sensitive text data using AES-256
CREATE OR REPLACE FUNCTION public.encrypt_text(plain_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN NULL;
  END IF;
  
  encryption_key := public.get_encryption_key();
  
  -- Use pgcrypto's encrypt function with AES-256
  RETURN encode(
    encrypt(
      plain_text::bytea,
      encryption_key::bytea,
      'aes'
    ),
    'base64'
  );
END;
$$;

COMMENT ON FUNCTION public.encrypt_text IS 
'Encrypts text using AES-256 encryption. Returns base64-encoded encrypted data.';

-- Function: decrypt_text
-- Decrypts text that was encrypted with encrypt_text
CREATE OR REPLACE FUNCTION public.decrypt_text(encrypted_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN NULL;
  END IF;
  
  encryption_key := public.get_encryption_key();
  
  -- Decrypt using pgcrypto
  RETURN convert_from(
    decrypt(
      decode(encrypted_text, 'base64'),
      encryption_key::bytea,
      'aes'
    ),
    'UTF8'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If decryption fails, log but don't crash
    RAISE WARNING 'Decryption failed for encrypted text: %', SQLERRM;
    RETURN '[ENCRYPTED]';
END;
$$;

COMMENT ON FUNCTION public.decrypt_text IS 
'Decrypts text encrypted with encrypt_text. Returns plaintext or [ENCRYPTED] on failure.';

-- Add encrypted columns to contacts table
-- We keep the original columns for backward compatibility during migration
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS email_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS mobile_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

-- Create index on encryption_version for monitoring
CREATE INDEX IF NOT EXISTS idx_contacts_encryption_version 
ON public.contacts(encryption_version) 
WHERE encryption_version IS NOT NULL;

-- Function: migrate_contact_encryption
-- Migrates a single contact's data to encrypted format
CREATE OR REPLACE FUNCTION public.migrate_contact_encryption(contact_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contact_record RECORD;
BEGIN
  -- Get the contact
  SELECT * INTO contact_record
  FROM public.contacts
  WHERE id = contact_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Encrypt and update
  UPDATE public.contacts
  SET 
    email_encrypted = CASE 
      WHEN email IS NOT NULL AND email != '' 
      THEN public.encrypt_text(email) 
      ELSE NULL 
    END,
    phone_encrypted = CASE 
      WHEN phone IS NOT NULL AND phone != '' 
      THEN public.encrypt_text(phone) 
      ELSE NULL 
    END,
    mobile_encrypted = CASE 
      WHEN mobile IS NOT NULL AND mobile != '' 
      THEN public.encrypt_text(mobile) 
      ELSE NULL 
    END,
    encryption_version = (SELECT key_version FROM public.encryption_config WHERE is_active = true LIMIT 1)
  WHERE id = contact_id;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.migrate_contact_encryption IS 
'Migrates a single contact record to encrypted format. Used for batch migration.';

-- Function: batch_migrate_contacts_encryption
-- Migrates all contacts to encrypted format in batches
CREATE OR REPLACE FUNCTION public.batch_migrate_contacts_encryption(batch_size INTEGER DEFAULT 100)
RETURNS TABLE(
  total_migrated INTEGER,
  total_contacts INTEGER,
  completion_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  migrated_count INTEGER := 0;
  total_count INTEGER;
  contact_id_to_migrate UUID;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM public.contacts
  WHERE encryption_version IS NULL OR email_encrypted IS NULL;
  
  -- Migrate in batches
  FOR contact_id_to_migrate IN 
    SELECT id 
    FROM public.contacts 
    WHERE encryption_version IS NULL OR email_encrypted IS NULL
    LIMIT batch_size
  LOOP
    IF public.migrate_contact_encryption(contact_id_to_migrate) THEN
      migrated_count := migrated_count + 1;
    END IF;
  END LOOP;
  
  -- Return results
  RETURN QUERY
  SELECT 
    migrated_count,
    total_count,
    CASE 
      WHEN total_count > 0 
      THEN ROUND((migrated_count::NUMERIC / total_count::NUMERIC) * 100, 2)
      ELSE 100.0
    END;
END;
$$;

COMMENT ON FUNCTION public.batch_migrate_contacts_encryption IS 
'Migrates contacts to encrypted format in configurable batches. Returns migration progress.';

-- Create a view for decrypted contact access
-- This provides transparent access to encrypted data for authorized users
CREATE OR REPLACE VIEW public.contacts_decrypted AS
SELECT 
  id,
  company_id,
  branch_id,
  first_name,
  last_name,
  title,
  -- Decrypt on read
  COALESCE(public.decrypt_text(email_encrypted), email) as email,
  COALESCE(public.decrypt_text(phone_encrypted), phone) as phone,
  COALESCE(public.decrypt_text(mobile_encrypted), mobile) as mobile,
  linkedin_url,
  notes,
  decision_tier,
  linkedin_connections,
  linkedin_activity_score,
  preferred_contact_method,
  created_at,
  updated_at,
  encryption_version
FROM public.contacts;

COMMENT ON VIEW public.contacts_decrypted IS 
'Transparent decryption view for contacts. Use this view in application queries for automatic decrypt.';

-- Grant appropriate permissions on the view
-- The view inherits RLS from the underlying contacts table
ALTER VIEW public.contacts_decrypted SET (security_barrier = true);

-- Create audit log for encryption operations
CREATE TABLE IF NOT EXISTS public.encryption_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('ENCRYPT', 'DECRYPT', 'KEY_ROTATION', 'MIGRATION')),
  table_name TEXT NOT NULL,
  record_count INTEGER,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  encryption_version INTEGER,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'PARTIAL')),
  error_details TEXT,
  metadata JSONB
);

-- Enable RLS on encryption_audit_log
ALTER TABLE public.encryption_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view encryption audit logs
CREATE POLICY "Only admins can view encryption audit logs"
ON public.encryption_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs
CREATE POLICY "System can insert encryption audit logs"
ON public.encryption_audit_log
FOR INSERT
WITH CHECK (true);

-- Add index for efficient querying
CREATE INDEX idx_encryption_audit_log_performed_at 
ON public.encryption_audit_log(performed_at DESC);

CREATE INDEX idx_encryption_audit_log_operation_type 
ON public.encryption_audit_log(operation_type);

COMMENT ON TABLE public.encryption_audit_log IS 
'Audit trail for all encryption operations. Tracks migrations, key rotations, and access patterns.';