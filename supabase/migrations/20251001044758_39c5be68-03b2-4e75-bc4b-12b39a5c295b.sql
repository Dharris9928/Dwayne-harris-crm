-- Add documentation comment explaining security model for company_hierarchy view
-- The view is secured via security_invoker=on, which makes it respect RLS policies
-- from the underlying companies table. Users can only see hierarchy for companies
-- they have access to based on the companies table RLS policies.

COMMENT ON VIEW public.company_hierarchy IS 
'Recursive view showing company hierarchy structure. Security is enforced via security_invoker=on, which makes this view respect Row Level Security policies from the underlying companies table. Users can only view hierarchy for companies they created or if they have elevated access (admin/sales_manager roles).';

-- Verify the view has security_invoker enabled (should already be set)
-- This ensures the view uses the querying user's permissions, not the view owner's
ALTER VIEW public.company_hierarchy SET (security_invoker = on);