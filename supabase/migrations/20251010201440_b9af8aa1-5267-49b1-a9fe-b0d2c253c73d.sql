-- Remove audit insert from admin_get_all_profiles to avoid RLS/policy conflicts
DROP FUNCTION IF EXISTS public.admin_get_all_profiles();

CREATE FUNCTION public.admin_get_all_profiles()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  approval_status text,
  created_at timestamptz,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Return profiles with emails; cast enum to text explicitly
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.approval_status::text,
    p.created_at,
    au.email
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;