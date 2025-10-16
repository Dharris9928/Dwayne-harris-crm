-- Security Enhancement: Strengthen RLS policies for critical tables (Fixed)
-- This migration adds explicit authentication checks and prevents enumeration attacks

-- 1. Strengthen profiles table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Elevated users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND id = auth.uid()
);

CREATE POLICY "Elevated users can view all profiles - authenticated only"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND has_elevated_access(auth.uid())
);

-- 2. Strengthen contacts table policies - ensure all have auth checks
DROP POLICY IF EXISTS "Sales reps can view their company contacts - authenticated only" ON public.contacts;
DROP POLICY IF EXISTS "Assigned users can view their company contacts" ON public.contacts;
DROP POLICY IF EXISTS "Read only users can view their company contacts - authenticated" ON public.contacts;

CREATE POLICY "Sales reps can view their company contacts - authenticated only"
ON public.contacts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_user_approved(auth.uid()) 
  AND has_role(auth.uid(), 'sales_rep'::app_role) 
  AND EXISTS (
    SELECT 1
    FROM companies c
    WHERE c.id = contacts.company_id 
    AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Assigned users can view their company contacts - authenticated"
ON public.contacts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_user_approved(auth.uid()) 
  AND EXISTS (
    SELECT 1
    FROM companies c
    WHERE c.id = contacts.company_id 
    AND c.assigned_to = auth.uid()
  )
);

CREATE POLICY "Read only users can view their company contacts - authenticated"
ON public.contacts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_user_approved(auth.uid()) 
  AND has_role(auth.uid(), 'read_only'::app_role) 
  AND EXISTS (
    SELECT 1
    FROM companies c
    WHERE c.id = contacts.company_id 
    AND c.created_by = auth.uid()
  )
);

-- 3. Strengthen companies table policies
DROP POLICY IF EXISTS "Sales reps can view their companies" ON public.companies;
DROP POLICY IF EXISTS "Assigned users can view their companies" ON public.companies;
DROP POLICY IF EXISTS "Read only users can view their companies" ON public.companies;

CREATE POLICY "Sales reps can view their companies - authenticated only"
ON public.companies
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'sales_rep'::app_role) 
  AND created_by = auth.uid()
);

CREATE POLICY "Assigned users can view their companies - authenticated only"
ON public.companies
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND assigned_to = auth.uid() 
  AND is_user_approved(auth.uid())
);

CREATE POLICY "Read only users can view their companies - authenticated only"
ON public.companies
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'read_only'::app_role) 
  AND created_by = auth.uid()
);

-- 4. Restrict sales_reps table access
DROP POLICY IF EXISTS "All authenticated users can view sales reps" ON public.sales_reps;

CREATE POLICY "Only elevated users can view sales reps"
ON public.sales_reps
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND has_elevated_access(auth.uid())
);

-- 5. Add company access validation to opportunities
DROP POLICY IF EXISTS "Users can view their own opportunities" ON public.opportunities;

CREATE POLICY "Users can view their own opportunities - with company validation"
ON public.opportunities
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    has_elevated_access(auth.uid()) 
    OR created_by = auth.uid() 
    OR assigned_to = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM companies c
    WHERE c.id = opportunities.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid() OR c.assigned_to = auth.uid())
  )
);

-- 6. Add monitoring for bulk access to communications
CREATE OR REPLACE FUNCTION public.check_bulk_communication_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_count INTEGER;
BEGIN
  -- Count accesses in last 5 minutes
  SELECT COUNT(DISTINCT company_id) INTO access_count
  FROM public.company_communications
  WHERE created_at > now() - interval '5 minutes';
  
  -- Alert if more than 50 companies accessed
  IF access_count > 50 THEN
    INSERT INTO public.bulk_access_alerts (
      user_id,
      alert_type,
      record_count,
      table_name,
      alert_details
    ) VALUES (
      auth.uid(),
      'BULK_COMMUNICATION_ACCESS',
      access_count,
      'company_communications',
      jsonb_build_object(
        'time_window', '5 minutes',
        'threshold', 50
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS monitor_bulk_communication_access ON public.company_communications;
CREATE TRIGGER monitor_bulk_communication_access
  AFTER INSERT ON public.company_communications
  FOR EACH ROW
  EXECUTE FUNCTION public.check_bulk_communication_access();

COMMENT ON POLICY "Authenticated users can view their own profile" ON public.profiles IS 
'Security enhancement: Explicit auth check prevents anonymous enumeration';

COMMENT ON POLICY "Only elevated users can view sales reps" ON public.sales_reps IS 
'Security enhancement: Restricts sales rep data to authorized personnel only';

COMMENT ON FUNCTION public.check_bulk_communication_access() IS 
'Security monitoring: Detects and alerts on bulk communication access patterns';