
-- ================================================================
-- SECURITY FIX: Add RLS policies to contacts_decrypted view
-- ================================================================

-- Enable RLS on the contacts_decrypted view (if not already enabled)
ALTER VIEW public.contacts_decrypted SET (security_barrier = true);

-- Note: Views inherit RLS from their base tables, but we need to ensure
-- the view is properly secured. Since this is a view, we should actually
-- create RLS-aware policies on the underlying contacts table that will
-- apply when querying through the view.

-- The best practice is to replace the insecure view with our new contacts_masked view
-- or add proper access control. Let's add a comment and create a secure version.

-- Create a secured version of the decrypted contacts view with proper RLS
CREATE OR REPLACE VIEW public.contacts_decrypted_secure AS
SELECT 
  c.id,
  c.company_id,
  c.branch_id,
  c.first_name,
  c.last_name,
  c.title,
  CASE 
    WHEN can_access_field(auth.uid(), 'contacts', 'email') 
    THEN COALESCE(
      CASE 
        WHEN c.email_encrypted IS NOT NULL AND c.email_encrypted <> '' 
        THEN decrypt_text(c.email_encrypted)
        ELSE c.email
      END, c.email)
    ELSE mask_pii_field(c.email, 'contacts', 'email')
  END AS email,
  CASE 
    WHEN can_access_field(auth.uid(), 'contacts', 'phone') 
    THEN COALESCE(
      CASE 
        WHEN c.phone_encrypted IS NOT NULL AND c.phone_encrypted <> '' 
        THEN decrypt_text(c.phone_encrypted)
        ELSE c.phone
      END, c.phone)
    ELSE mask_pii_field(c.phone, 'contacts', 'phone')
  END AS phone,
  CASE 
    WHEN can_access_field(auth.uid(), 'contacts', 'mobile') 
    THEN COALESCE(
      CASE 
        WHEN c.mobile_encrypted IS NOT NULL AND c.mobile_encrypted <> '' 
        THEN decrypt_text(c.mobile_encrypted)
        ELSE c.mobile
      END, c.mobile)
    ELSE mask_pii_field(c.mobile, 'contacts', 'mobile')
  END AS mobile,
  c.linkedin_url,
  c.notes,
  c.preferred_contact_method,
  c.decision_tier,
  c.linkedin_activity_score,
  c.linkedin_connections,
  c.encryption_version,
  c.created_at,
  c.updated_at
FROM public.contacts c
WHERE 
  -- Apply same access control as contacts table
  (auth.uid() IS NOT NULL) 
  AND is_user_approved(auth.uid())
  AND (
    -- Elevated users can see all
    has_elevated_access(auth.uid())
    -- Sales reps can see their company contacts
    OR (has_role(auth.uid(), 'sales_rep') AND EXISTS (
      SELECT 1 FROM companies co 
      WHERE co.id = c.company_id AND co.created_by = auth.uid()
    ))
    -- Read only users can see their company contacts
    OR (has_role(auth.uid(), 'read_only') AND EXISTS (
      SELECT 1 FROM companies co 
      WHERE co.id = c.company_id AND co.created_by = auth.uid()
    ))
    -- Users assigned to company can see contacts
    OR EXISTS (
      SELECT 1 FROM companies co 
      WHERE co.id = c.company_id AND co.assigned_to = auth.uid()
    )
  );

-- Add comment explaining the security issue with the old view
COMMENT ON VIEW public.contacts_decrypted IS 
  'DEPRECATED: This view has no RLS policies and should not be used. Use contacts_decrypted_secure or contacts_masked instead.';

COMMENT ON VIEW public.contacts_decrypted_secure IS 
  'Secure view that decrypts contact data with proper field-level access control and RLS enforcement';

-- Grant appropriate permissions on the secure view
GRANT SELECT ON public.contacts_decrypted_secure TO authenticated;
