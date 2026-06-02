-- Enable MFA tracking and enforcement
-- Table to track MFA requirements by role
CREATE TABLE IF NOT EXISTS public.mfa_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  is_required BOOLEAN NOT NULL DEFAULT false,
  grace_period_days INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table to track user MFA enrollment status
CREATE TABLE IF NOT EXISTS public.user_mfa_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  enrolled_at TIMESTAMPTZ,
  grace_period_expires_at TIMESTAMPTZ,
  last_prompted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.mfa_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mfa_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mfa_requirements
CREATE POLICY "All authenticated users can view MFA requirements"
  ON public.mfa_requirements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage MFA requirements"
  ON public.mfa_requirements
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_mfa_status
CREATE POLICY "Users can view their own MFA status"
  ON public.user_mfa_status
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all MFA status"
  ON public.user_mfa_status
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own MFA status"
  ON public.user_mfa_status
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert MFA status"
  ON public.user_mfa_status
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to check if MFA is required for user
CREATE OR REPLACE FUNCTION public.is_mfa_required(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  is_required BOOLEAN;
  grace_expires TIMESTAMPTZ;
  mfa_enabled BOOLEAN;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if MFA is required for this role
  SELECT mr.is_required INTO is_required
  FROM public.mfa_requirements mr
  WHERE mr.role = user_role;
  
  IF NOT is_required THEN
    RETURN false;
  END IF;
  
  -- Check if user has MFA enabled
  SELECT ums.mfa_enabled, ums.grace_period_expires_at
  INTO mfa_enabled, grace_expires
  FROM public.user_mfa_status ums
  WHERE ums.user_id = _user_id;
  
  -- If MFA already enabled, requirement is met
  IF mfa_enabled THEN
    RETURN false; -- Not required to set up (already done)
  END IF;
  
  -- Check grace period
  IF grace_expires IS NOT NULL AND grace_expires > now() THEN
    RETURN false; -- Still in grace period
  END IF;
  
  -- MFA is required and not set up
  RETURN true;
END;
$$;

-- Function to initialize MFA status for new users
CREATE OR REPLACE FUNCTION public.initialize_mfa_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  grace_days INTEGER;
  is_required BOOLEAN;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = NEW.id
  LIMIT 1;
  
  IF user_role IS NULL THEN
    user_role := 'sales_rep'::app_role;
  END IF;
  
  -- Get MFA requirements for role
  SELECT mr.is_required, mr.grace_period_days
  INTO is_required, grace_days
  FROM public.mfa_requirements mr
  WHERE mr.role = user_role;
  
  -- Default grace period if not configured
  IF grace_days IS NULL THEN
    grace_days := 30;
  END IF;
  
  -- Insert MFA status with grace period if required
  INSERT INTO public.user_mfa_status (
    user_id,
    mfa_enabled,
    grace_period_expires_at
  ) VALUES (
    NEW.id,
    false,
    CASE WHEN is_required THEN now() + (grace_days || ' days')::INTERVAL ELSE NULL END
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to initialize MFA status on profile creation
CREATE TRIGGER initialize_user_mfa_status
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_mfa_status();

-- Insert default MFA requirements
INSERT INTO public.mfa_requirements (role, is_required, grace_period_days) VALUES
  ('admin', true, 30),
  ('sales_manager', true, 30),
  ('sales_rep', false, 30),
  ('read_only', false, 30)
ON CONFLICT (role) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_mfa_status_user_id ON public.user_mfa_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_status_grace_expires ON public.user_mfa_status(grace_period_expires_at) WHERE grace_period_expires_at IS NOT NULL;

-- Update triggers
CREATE TRIGGER update_mfa_requirements_updated_at
  BEFORE UPDATE ON public.mfa_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_mfa_status_updated_at
  BEFORE UPDATE ON public.user_mfa_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();