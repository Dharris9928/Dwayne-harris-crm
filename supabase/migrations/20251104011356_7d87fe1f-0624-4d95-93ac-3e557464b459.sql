-- Create presentations table
CREATE TABLE IF NOT EXISTS public.presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  token_expires_at timestamp with time zone DEFAULT (now() + interval '14 days'),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  ai_conversation jsonb DEFAULT '[]'::jsonb
);

-- Create access logs table
CREATE TABLE IF NOT EXISTS public.presentation_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id uuid REFERENCES public.presentations(id) ON DELETE CASCADE,
  accessed_at timestamp with time zone DEFAULT now(),
  ip_address text,
  user_agent text,
  duration_seconds integer
);

-- Enable RLS
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for presentations
CREATE POLICY "Admins can manage presentations"
  ON public.presentations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view presentations via valid token"
  ON public.presentations
  FOR SELECT
  USING (
    is_active = true 
    AND token_expires_at > now()
  );

-- RLS Policies for access logs
CREATE POLICY "System can insert access logs"
  ON public.presentation_access_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view access logs"
  ON public.presentation_access_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to validate presentation token
CREATE OR REPLACE FUNCTION public.validate_presentation_token(token_text text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(p)::jsonb
  FROM presentations p
  WHERE p.token = token_text
    AND p.is_active = true
    AND p.token_expires_at > now();
$$;

-- Function to log presentation access
CREATE OR REPLACE FUNCTION public.log_presentation_access(
  _presentation_id uuid,
  _ip_address text,
  _user_agent text,
  _duration_seconds integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.presentation_access_logs (
    presentation_id,
    ip_address,
    user_agent,
    duration_seconds
  ) VALUES (
    _presentation_id,
    _ip_address,
    _user_agent,
    _duration_seconds
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_presentations_updated_at
  BEFORE UPDATE ON public.presentations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();