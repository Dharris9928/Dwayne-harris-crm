-- Create security definer function to check user roles
-- This prevents recursive RLS policy issues
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- Create helper function to check if user has elevated permissions
CREATE OR REPLACE FUNCTION public.has_elevated_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role IN ('admin', 'sales_manager')
  )
$$;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can delete companies" ON public.companies;

-- CREATE SECURE RLS POLICIES

-- SELECT: Admins/Managers see all, others see only their own
CREATE POLICY "Users can view companies based on role"
ON public.companies
FOR SELECT
TO authenticated
USING (
  public.has_elevated_access(auth.uid()) 
  OR created_by = auth.uid()
);

-- INSERT: All authenticated users can create companies (will be assigned to them)
CREATE POLICY "Users can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- UPDATE: Admins/Managers can update all, others can update only their own
CREATE POLICY "Users can update companies based on role"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  public.has_elevated_access(auth.uid()) 
  OR created_by = auth.uid()
)
WITH CHECK (
  public.has_elevated_access(auth.uid()) 
  OR created_by = auth.uid()
);

-- DELETE: Only admins/managers can delete
CREATE POLICY "Elevated users can delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (public.has_elevated_access(auth.uid()));

-- Add comment explaining the security model
COMMENT ON TABLE public.companies IS 'Companies table with role-based access control. Admins and sales_managers can see all records. Sales_reps and read_only users can only see records they created.';