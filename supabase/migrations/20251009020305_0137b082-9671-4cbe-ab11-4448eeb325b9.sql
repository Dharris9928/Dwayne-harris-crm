-- Add assigned_to column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_assigned_to ON public.companies(assigned_to);

-- Update RLS policies to allow assigned users to view their companies
DROP POLICY IF EXISTS "Assigned users can view their companies" ON public.companies;
CREATE POLICY "Assigned users can view their companies"
ON public.companies
FOR SELECT
USING (assigned_to = auth.uid() AND is_user_approved(auth.uid()));

-- Allow assigned users to update their companies
DROP POLICY IF EXISTS "Assigned users can update their companies" ON public.companies;
CREATE POLICY "Assigned users can update their companies"
ON public.companies
FOR UPDATE
USING (assigned_to = auth.uid() AND is_user_approved(auth.uid()))
WITH CHECK (assigned_to = auth.uid() AND is_user_approved(auth.uid()));

-- Update activities RLS to allow assigned users to see activities for their companies
DROP POLICY IF EXISTS "Assigned users can view their company activities" ON public.outreach_activities;
CREATE POLICY "Assigned users can view their company activities"
ON public.outreach_activities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = outreach_activities.company_id
    AND c.assigned_to = auth.uid()
  )
  OR assigned_to = auth.uid()
);

-- Allow assigned users to view contacts for their assigned companies
DROP POLICY IF EXISTS "Assigned users can view their company contacts" ON public.contacts;
CREATE POLICY "Assigned users can view their company contacts"
ON public.contacts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_user_approved(auth.uid())
  AND EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = contacts.company_id
    AND c.assigned_to = auth.uid()
  )
);