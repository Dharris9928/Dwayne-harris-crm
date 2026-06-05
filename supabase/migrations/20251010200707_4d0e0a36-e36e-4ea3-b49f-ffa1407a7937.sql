-- 1) RLS: allow profile-only audit logs with NULL contact_id for ADMIN_PROFILE_VIEW
DROP POLICY IF EXISTS "Users can only log their own access" ON public.contact_access_logs;

-- Policy for regular contact access logs (requires contact_id)
CREATE POLICY "Users can log contact views"
ON public.contact_access_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND contact_id IS NOT NULL
  AND action IS NOT NULL
);

-- Policy for admin profile audit logs (no specific contact)
CREATE POLICY "Admins can log profile audit"
ON public.contact_access_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND action = 'ADMIN_PROFILE_VIEW'
  AND contact_id IS NULL
);

-- 2) Fix admin_get_all_profiles to use action column and keep NULL contact_id
CREATE OR REPLACE FUNCTION public.admin_get_all_profiles()
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