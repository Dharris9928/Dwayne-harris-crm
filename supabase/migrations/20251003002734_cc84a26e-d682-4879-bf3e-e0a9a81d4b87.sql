-- Fix security issue: Ensure profiles table requires authentication for all access
-- Drop existing SELECT policies on profiles table
DROP POLICY IF EXISTS "Users view own profile; elevated users view all" ON public.profiles;
DROP POLICY IF EXISTS "Approved users can view companies" ON public.profiles;

-- Create new explicit SELECT policy that requires authentication
CREATE POLICY "Users must be authenticated to view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- User must be authenticated (enforced by TO authenticated)
  auth.uid() IS NOT NULL 
  AND is_user_approved(auth.uid()) 
  AND (
    -- Users can view their own profile
    id = auth.uid() 
    -- OR elevated users can view all profiles
    OR has_elevated_access(auth.uid())
  )
);

-- Ensure RLS is enabled (should already be, but let's be explicit)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON POLICY "Users must be authenticated to view profiles" ON public.profiles IS 
'Requires authentication and approval. Users can only view their own profile unless they have elevated access.';