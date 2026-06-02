-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update encrypt_text to explicitly reference pgcrypto schema and cast algorithm to text
CREATE OR REPLACE FUNCTION public.encrypt_text(plain_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  encryption_key TEXT;
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN NULL;
  END IF;
  
  encryption_key := public.get_encryption_key();
  
  -- Use pgcrypto's encrypt with explicit schema and text cast for algorithm
  RETURN encode(
    pgcrypto.encrypt(
      plain_text::bytea,
      encryption_key::bytea,
      'aes'::text
    ),
    'base64'
  );
END;
$function$;

-- Update decrypt_text similarly
CREATE OR REPLACE FUNCTION public.decrypt_text(encrypted_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  encryption_key TEXT;
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN NULL;
  END IF;
  
  encryption_key := public.get_encryption_key();
  
  -- Decrypt using pgcrypto with explicit schema and text cast
  RETURN convert_from(
    pgcrypto.decrypt(
      decode(encrypted_text, 'base64'),
      encryption_key::bytea,
      'aes'::text
    ),
    'UTF8'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If decryption fails, log but don't crash
    RAISE WARNING 'Decryption failed for encrypted text: %', SQLERRM;
    RETURN '[ENCRYPTED]';
END;
$function$;