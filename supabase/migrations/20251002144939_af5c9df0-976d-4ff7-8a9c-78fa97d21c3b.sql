-- ==================================================
-- FIX: Restrict contact PII access to prevent data theft
-- Implements granular access control for contacts table
-- ==================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view contacts for their companies" ON public.contacts;
DROP POLICY IF EXISTS "Users can create contacts for their companies" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts for their companies" ON public.contacts;
DROP POLICY IF EXISTS "Elevated users can delete contacts" ON public.contacts;

-- CREATE SECURE POLICIES WITH GRANULAR ACCESS CONTROL

-- 1. SELECT Policy: Elevated users see all contacts, regular users only see their own
CREATE POLICY "Users can view contacts based on role"
ON public.contacts
FOR SELECT
TO authenticated
USING (
  -- Elevated users (admin/sales_manager) can see all contacts for companies they manage
  has_elevated_access(auth.uid()) AND EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = contacts.company_id
  )
  OR
  -- Regular users can only see contacts for companies they created
  EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = contacts.company_id
    AND c.created_by = auth.uid()
  )
);

-- 2. INSERT Policy: Users can create contacts for their companies only
CREATE POLICY "Users can create contacts for their companies"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = contacts.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

-- 3. UPDATE Policy: Users can update contacts for their companies
CREATE POLICY "Users can update contacts for their companies"
ON public.contacts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = contacts.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = contacts.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

-- 4. DELETE Policy: Only elevated users can delete contacts
CREATE POLICY "Elevated users can delete contacts"
ON public.contacts
FOR DELETE
TO authenticated
USING (has_elevated_access(auth.uid()));

-- Add helpful comment
COMMENT ON TABLE public.contacts IS 'Contains sensitive PII (email, phone, mobile). Access restricted by RLS policies based on user role and company ownership.';