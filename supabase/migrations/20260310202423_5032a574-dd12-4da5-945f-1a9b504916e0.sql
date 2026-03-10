
-- Fix contacts_masked view to also be SECURITY INVOKER
DROP VIEW IF EXISTS public.contacts_masked;
CREATE VIEW public.contacts_masked
WITH (security_invoker = true)
AS
SELECT 
    id,
    company_id,
    branch_id,
    first_name,
    last_name,
    title,
    mask_pii_field(COALESCE(decrypt_text(email_encrypted), email), 'contacts'::text, 'email'::text) AS email,
    mask_pii_field(COALESCE(decrypt_text(phone_encrypted), phone), 'contacts'::text, 'phone'::text) AS phone,
    mask_pii_field(COALESCE(decrypt_text(mobile_encrypted), mobile), 'contacts'::text, 'mobile'::text) AS mobile,
    linkedin_url,
    notes,
    preferred_contact_method,
    decision_tier,
    linkedin_connections,
    linkedin_activity_score,
    created_at,
    updated_at
FROM contacts
WHERE (auth.uid() IS NOT NULL) AND is_user_approved(auth.uid());
