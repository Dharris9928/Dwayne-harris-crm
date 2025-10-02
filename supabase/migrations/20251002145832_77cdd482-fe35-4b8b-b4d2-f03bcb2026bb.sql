-- Strengthen RLS for contacts to protect PII and require approved users
-- 1) Ensure RLS is enabled (idempotent)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- 2) Replace SELECT/INSERT/UPDATE policies with approved-only versions
DROP POLICY IF EXISTS "Users can view contacts based on role" ON public.contacts;
DROP POLICY IF EXISTS "Users can create contacts for their companies" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts for their companies" ON public.contacts;

-- Keep existing DELETE policy for elevated users as-is

-- SELECT: Only approved users. Elevated users can view all contacts; others only for companies they created
CREATE POLICY "Approved users can view contacts they own or elevated"
ON public.contacts
FOR SELECT
TO authenticated
USING (
  public.is_user_approved(auth.uid())
  AND (
    public.has_elevated_access(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = contacts.company_id AND c.created_by = auth.uid()
    )
  )
);

-- INSERT: Only approved users can create contacts, and only for companies they own or if elevated
CREATE POLICY "Approved users can create contacts for their companies"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_user_approved(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = contacts.company_id AND (public.has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

-- UPDATE: Only approved users can update contacts, scoped to companies they own or elevated
CREATE POLICY "Approved users can update contacts for their companies"
ON public.contacts
FOR UPDATE
TO authenticated
USING (
  public.is_user_approved(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = contacts.company_id AND (public.has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
)
WITH CHECK (
  public.is_user_approved(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = contacts.company_id AND (public.has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

-- Notes:
-- - DELETE policy (elevated only) is retained to avoid breaking admin workflows
-- - These changes prevent any unapproved account from reading or modifying contact PII
