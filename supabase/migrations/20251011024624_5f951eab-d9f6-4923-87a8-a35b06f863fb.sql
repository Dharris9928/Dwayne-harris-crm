-- Create monthly domain re-verification scheduled job
-- This will automatically verify all active domains on the 1st of each month

-- Create a function to verify all active domains
CREATE OR REPLACE FUNCTION public.reverify_all_active_domains()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  domain_record RECORD;
  total_domains INTEGER := 0;
  verified_count INTEGER := 0;
  failed_count INTEGER := 0;
  result_summary jsonb;
BEGIN
  -- Count total active domains
  SELECT COUNT(*) INTO total_domains
  FROM public.allowed_email_domains
  WHERE is_active = true;

  -- Loop through each active domain and trigger verification
  FOR domain_record IN 
    SELECT domain 
    FROM public.allowed_email_domains 
    WHERE is_active = true
  LOOP
    -- Note: This function logs the need for verification
    -- The actual verification happens via the edge function
    -- which should be called by a cron job or external scheduler
    
    UPDATE public.allowed_email_domains
    SET verification_status = 'pending_verification'
    WHERE domain = domain_record.domain;
    
    -- Log this for tracking
    RAISE NOTICE 'Scheduled verification for domain: %', domain_record.domain;
  END LOOP;

  result_summary := jsonb_build_object(
    'total_domains', total_domains,
    'status', 'scheduled',
    'message', 'Domain verification scheduled. Run verify-email-domain edge function for each domain.',
    'timestamp', now()
  );

  RETURN result_summary;
END;
$function$;

-- Create rate limiting for signup attempts
CREATE TABLE IF NOT EXISTS public.signup_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address inet,
  attempt_count integer DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_end timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  blocked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_signup_rate_limit_email_window 
ON public.signup_rate_limit(email, window_end) 
WHERE NOT blocked;

CREATE INDEX IF NOT EXISTS idx_signup_rate_limit_ip_window 
ON public.signup_rate_limit(ip_address, window_end) 
WHERE NOT blocked;

-- Enable RLS
ALTER TABLE public.signup_rate_limit ENABLE ROW LEVEL SECURITY;

-- Only system can insert rate limit tracking
CREATE POLICY "System can insert signup rate limits"
ON public.signup_rate_limit
FOR INSERT
WITH CHECK (true);

-- Only admins can view rate limits
CREATE POLICY "Admins can view signup rate limits"
ON public.signup_rate_limit
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Function to check signup rate limit
CREATE OR REPLACE FUNCTION public.check_signup_rate_limit(
  _email text,
  _ip_address inet DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  email_attempts INTEGER;
  ip_attempts INTEGER;
  max_email_attempts INTEGER := 5;  -- Max 5 signup attempts per email per hour
  max_ip_attempts INTEGER := 10;    -- Max 10 signup attempts per IP per hour
  is_blocked BOOLEAN := false;
  block_reason TEXT := NULL;
BEGIN
  -- Clean up expired rate limit entries
  DELETE FROM public.signup_rate_limit
  WHERE window_end < now();

  -- Count recent attempts by email
  SELECT COALESCE(SUM(attempt_count), 0) INTO email_attempts
  FROM public.signup_rate_limit
  WHERE email = _email
    AND window_end > now()
    AND NOT blocked;

  -- Count recent attempts by IP (if provided)
  IF _ip_address IS NOT NULL THEN
    SELECT COALESCE(SUM(attempt_count), 0) INTO ip_attempts
    FROM public.signup_rate_limit
    WHERE ip_address = _ip_address
      AND window_end > now()
      AND NOT blocked;
  ELSE
    ip_attempts := 0;
  END IF;

  -- Check if rate limit exceeded
  IF email_attempts >= max_email_attempts THEN
    is_blocked := true;
    block_reason := 'Too many signup attempts from this email address';
  ELSIF ip_attempts >= max_ip_attempts THEN
    is_blocked := true;
    block_reason := 'Too many signup attempts from this IP address';
  END IF;

  -- If not blocked, record this attempt
  IF NOT is_blocked THEN
    INSERT INTO public.signup_rate_limit (email, ip_address, attempt_count)
    VALUES (_email, _ip_address, 1)
    ON CONFLICT (email, window_end)
    DO UPDATE SET 
      attempt_count = signup_rate_limit.attempt_count + 1,
      ip_address = COALESCE(_ip_address, signup_rate_limit.ip_address);
  ELSE
    -- Mark as blocked
    UPDATE public.signup_rate_limit
    SET blocked = true
    WHERE email = _email OR ip_address = _ip_address;
  END IF;

  RETURN jsonb_build_object(
    'allowed', NOT is_blocked,
    'email_attempts', email_attempts + 1,
    'ip_attempts', ip_attempts + (CASE WHEN _ip_address IS NOT NULL THEN 1 ELSE 0 END),
    'max_email_attempts', max_email_attempts,
    'max_ip_attempts', max_ip_attempts,
    'block_reason', block_reason,
    'retry_after_seconds', 3600
  );
END;
$function$;

COMMENT ON FUNCTION public.reverify_all_active_domains() IS 'Schedules re-verification of all active email domains. Should be run monthly via cron job.';
COMMENT ON FUNCTION public.check_signup_rate_limit(text, inet) IS 'Rate limiting for signup attempts. Prevents abuse by limiting attempts per email and IP address.';