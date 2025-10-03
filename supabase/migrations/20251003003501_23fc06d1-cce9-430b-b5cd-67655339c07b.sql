-- Fix security definer view issue by enabling security_invoker mode
-- This ensures the view respects RLS policies of the underlying tables

-- Drop and recreate the view with security_invoker option
DROP VIEW IF EXISTS public.company_hierarchy CASCADE;

CREATE VIEW public.company_hierarchy 
WITH (security_invoker = on)
AS
WITH RECURSIVE hierarchy AS (
  -- Base case: companies with no parent
  SELECT 
    id,
    company_name,
    parent_company_id,
    0 as level,
    company_name::text as full_path,
    ARRAY[id] as path
  FROM companies
  WHERE parent_company_id IS NULL
  
  UNION ALL
  
  -- Recursive case: companies with parents
  SELECT 
    c.id,
    c.company_name,
    c.parent_company_id,
    h.level + 1,
    h.full_path || ' > ' || c.company_name,
    h.path || c.id
  FROM companies c
  INNER JOIN hierarchy h ON c.parent_company_id = h.id
)
SELECT * FROM hierarchy;

-- Revoke all public and anonymous access
REVOKE ALL ON public.company_hierarchy FROM PUBLIC;
REVOKE ALL ON public.company_hierarchy FROM anon;

-- Grant SELECT to authenticated users only
GRANT SELECT ON public.company_hierarchy TO authenticated;

-- Add documentation
COMMENT ON VIEW public.company_hierarchy IS 
'View of company organizational structure with security_invoker=on. This ensures the view respects RLS policies from the underlying companies table, so users only see hierarchies for companies they have access to. For additional filtering, use get_company_hierarchy() or get_company_hierarchy_for_company() functions.';