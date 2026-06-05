-- Drop the on_freeze_logout trigger that's checking for role_frozen field
-- which doesn't exist on the profiles table
DROP TRIGGER IF EXISTS on_freeze_logout ON profiles;

-- The force_logout_on_freeze function is designed for a table with role_frozen column
-- It should not be used on profiles table