-- Fix security issue: Ensure contacts table explicitly blocks all unauthenticated access
-- and add additional safeguards for sensitive contact data

-- First, ensure RLS is enabled
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Drop all existing SELECT policies to rebuild with stronger authentication requirements
DROP POLICY IF EXISTS "Elevated users can view all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Read only users can view their company contacts" ON public.contacts;
DROP POLICY IF EXISTS "Sales reps can view their company contacts" ON public.contacts;

-- Create new explicit SELECT policies with TO authenticated clause
CREATE POLICY "Elevated users can view all contacts - authenticated only"
ON public.contacts
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND is_user_approved(auth.uid()) 
  AND has_elevated_access(auth.uid())
);

CREATE POLICY "Read only users can view their company contacts - authenticated only"
ON public.contacts
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND is_user_approved(auth.uid()) 
  AND has_role(auth.uid(), 'read_only'::app_role) 
  AND (EXISTS (
    SELECT 1
    FROM companies c
    WHERE c.id = contacts.company_id 
      AND c.created_by = auth.uid()
  ))
);

CREATE POLICY "Sales reps can view their company contacts - authenticated only"
ON public.contacts
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND is_user_approved(auth.uid()) 
  AND has_role(auth.uid(), 'sales_rep'::app_role) 
  AND (EXISTS (
    SELECT 1
    FROM companies c
    WHERE c.id = contacts.company_id 
      AND c.created_by = auth.uid()
  ))
);

-- Update INSERT policies to be more explicit
DROP POLICY IF EXISTS "Elevated users can create contacts" ON public.contacts;
DROP POLICY IF EXISTS "Sales reps can create contacts" ON public.contacts;

CREATE POLICY "Elevated users can create contacts - authenticated only"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND is_user_approved(auth.uid()) 
  AND has_elevated_access(auth.uid())
);

CREATE POLICY "Sales reps can create contacts - authenticated only"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND is_user_approved(auth.uid()) 
  AND has_role(auth.uid(), 'sales_rep'::app_role) 
  AND (EXISTS (
    SELECT 1
    FROM companies c
    WHERE c.id = contacts.company_id 
      AND c.created_by = auth.uid()
  ))
);

-- Update UPDATE policies to be more explicit
DROP POLICY IF EXISTS "Elevated users can update all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Sales reps can update their company contacts" ON public.contacts;

CREATE POLICY "Elevated users can update all contacts - authenticated only"
ON public.contacts
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND is_user_approved(auth.uid()) 
  AND has_elevated_access(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND is_user_approved(auth.uid()) 
  AND has_elevated_access(auth.uid())
);

CREATE POLICY "Sales reps can update their company contacts - authenticated only"
ON public.contacts
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND is_user_approved(auth.uid()) 
  AND has_role(auth.uid(), 'sales_rep'::app_role) 
  AND (EXISTS (
    SELECT 1
    FROM companies c
    WHERE c.id = contacts.company_id 
      AND c.created_by = auth.uid()
  ))
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND is_user_approved(auth.uid()) 
  AND has_role(auth.uid(), 'sales_rep'::app_role) 
  AND (EXISTS (
    SELECT 1
    FROM companies c
    WHERE c.id = contacts.company_id 
      AND c.created_by = auth.uid()
  ))
);

-- Update DELETE policy to be more explicit
DROP POLICY IF EXISTS "Only admins can delete contacts" ON public.contacts;

CREATE POLICY "Only admins can delete contacts - authenticated only"
ON public.contacts
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Add comments for documentation
COMMENT ON TABLE public.contacts IS 'Contains sensitive PII - all policies require authentication and role-based authorization';
COMMENT ON COLUMN public.contacts.email IS 'Sensitive PII - protected by RLS';
COMMENT ON COLUMN public.contacts.phone IS 'Sensitive PII - protected by RLS';
COMMENT ON COLUMN public.contacts.mobile IS 'Sensitive PII - protected by RLS';