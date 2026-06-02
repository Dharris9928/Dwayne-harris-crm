-- Align admin_get_all_profiles return type with enum approval_status to match selected column
DROP FUNCTION IF EXISTS public.admin_get_all_profiles();

CREATE FUNCTION public.admin_get_all_profiles()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  approval_status approval_status,
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

  -- Log admin profile access audit (no specific contact)
  INSERT INTO public.contact_access_logs (
    user_id,
    contact_id,
    action,
    ip_address,
    accessed_at
  ) VALUES (
    auth.uid(),
    NULL,
    'ADMIN_PROFILE_VIEW',
    inet_client_addr(),
    now()
  );

  -- Return profiles with emails
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.approval_status,
    p.created_at,
    au.email
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;