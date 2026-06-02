-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update handle_new_user function with email domain validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email text;
  is_admin_exception boolean;
  is_valid_domain boolean;
  user_role app_role;
  user_approval approval_status;
BEGIN
  user_email := lower(new.email);
  
  -- Check if this is the admin exception email
  is_admin_exception := (user_email = 'dharris9928@gmail.com');
  
  -- Check if email domain is allowed
  is_valid_domain := (
    user_email LIKE '%@google.com' OR
    user_email LIKE '%@gfieldsales.com' OR
    user_email LIKE '%@nestprorep.com' OR
    is_admin_exception
  );
  
  -- Reject signup if domain is not allowed
  IF NOT is_valid_domain THEN
    RAISE EXCEPTION 'Registration restricted to authorized email domains only';
  END IF;
  
  -- Determine role and approval status
  IF is_admin_exception THEN
    user_role := 'admin'::app_role;
    user_approval := 'approved'::approval_status;
  ELSE
    user_role := 'sales_rep'::app_role;
    user_approval := 'pending'::approval_status;
  END IF;
  
  -- Insert profile with appropriate approval status
  INSERT INTO public.profiles (id, first_name, last_name, approval_status, approved_at)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    user_approval,
    CASE WHEN is_admin_exception THEN now() ELSE NULL END
  );
  
  -- Insert role (admin for exception, sales_rep for others)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, user_role);
  
  RETURN new;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();