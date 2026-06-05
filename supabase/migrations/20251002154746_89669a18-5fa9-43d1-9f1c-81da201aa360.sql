-- Secure access to company_hierarchy view via functions only

-- 1) Revoke direct access to the view from all client roles
DO $$
BEGIN
  -- Revoke from PUBLIC, anon, authenticated if the view exists
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'company_hierarchy'
  ) THEN
    REVOKE ALL ON TABLE public.company_hierarchy FROM PUBLIC;
    REVOKE ALL ON TABLE public.company_hierarchy FROM anon;
    REVOKE ALL ON TABLE public.company_hierarchy FROM authenticated;

    -- Harden the view with security barrier
    ALTER VIEW public.company_hierarchy SET (security_barrier = true);

    COMMENT ON VIEW public.company_hierarchy IS 'Access restricted: use security-definer functions get_company_hierarchy() or get_company_hierarchy_for_company(uuid).';
  END IF;
END $$;

-- 2) Restrict function execution to authenticated users (not PUBLIC)
DO $$
BEGIN
  -- get_company_hierarchy()
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_company_hierarchy' AND pg_get_function_arguments(p.oid) = ''
  ) THEN
    REVOKE ALL ON FUNCTION public.get_company_hierarchy() FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.get_company_hierarchy() FROM anon;
    GRANT EXECUTE ON FUNCTION public.get_company_hierarchy() TO authenticated;
  END IF;

  -- get_company_hierarchy_for_company(uuid)
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_company_hierarchy_for_company'
  ) THEN
    REVOKE ALL ON FUNCTION public.get_company_hierarchy_for_company(uuid) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.get_company_hierarchy_for_company(uuid) FROM anon;
    GRANT EXECUTE ON FUNCTION public.get_company_hierarchy_for_company(uuid) TO authenticated;
  END IF;
END $$;

-- 3) Documentation
COMMENT ON FUNCTION public.get_company_hierarchy IS 'Returns company hierarchy rows filtered by user access via companies RLS/role checks. Use this instead of direct view access.';
COMMENT ON FUNCTION public.get_company_hierarchy_for_company IS 'Returns company hierarchy for a specific company id, enforcing user access via companies RLS/role checks.';