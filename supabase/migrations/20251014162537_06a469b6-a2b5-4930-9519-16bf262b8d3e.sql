-- Create table for password reset codes
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '15 minutes'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Admins can view all codes
CREATE POLICY "Admins can view all reset codes"
  ON public.password_reset_codes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can create reset codes
CREATE POLICY "Admins can create reset codes"
  ON public.password_reset_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_password_reset_codes_user_id ON public.password_reset_codes(user_id);
CREATE INDEX idx_password_reset_codes_code_hash ON public.password_reset_codes(code_hash);
CREATE INDEX idx_password_reset_codes_expires_at ON public.password_reset_codes(expires_at);

-- Function to cleanup expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.password_reset_codes
  WHERE expires_at < now() OR used_at IS NOT NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;