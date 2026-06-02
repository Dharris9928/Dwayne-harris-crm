-- Create impersonation_sessions table for server-side session tracking
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  impersonated_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  ended_at timestamptz,
  ip_address inet,
  user_agent text
);

CREATE INDEX idx_impersonation_sessions_admin ON impersonation_sessions(admin_user_id);
CREATE INDEX idx_impersonation_sessions_token ON impersonation_sessions(session_token) WHERE is_active = true;
CREATE INDEX idx_impersonation_sessions_expires ON impersonation_sessions(expires_at) WHERE is_active = true;

-- Enable RLS
ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Only admins can view impersonation sessions
CREATE POLICY "admins_view_impersonation_sessions" ON impersonation_sessions
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Only admins can create impersonation sessions
CREATE POLICY "admins_create_impersonation_sessions" ON impersonation_sessions
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') AND admin_user_id = auth.uid());

-- Only admins can update their own impersonation sessions
CREATE POLICY "admins_update_impersonation_sessions" ON impersonation_sessions
  FOR UPDATE USING (has_role(auth.uid(), 'admin') AND admin_user_id = auth.uid());

-- Create presentation_token_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS presentation_token_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  token_attempted text NOT NULL,
  success boolean DEFAULT false,
  attempted_at timestamptz DEFAULT now(),
  user_agent text
);

CREATE INDEX idx_token_attempts_ip_time ON presentation_token_attempts(ip_address, attempted_at);
CREATE INDEX idx_token_attempts_success ON presentation_token_attempts(success, attempted_at);

-- Enable RLS
ALTER TABLE presentation_token_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view token attempts
CREATE POLICY "admins_view_token_attempts" ON presentation_token_attempts
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Function to check IP-based rate limit for token validation
CREATE OR REPLACE FUNCTION check_presentation_token_rate_limit(
  _ip_address inet,
  _max_attempts integer DEFAULT 10,
  _window_minutes integer DEFAULT 1
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempt_count integer;
  v_result jsonb;
BEGIN
  -- Count attempts in the time window
  SELECT COUNT(*)
  INTO v_attempt_count
  FROM presentation_token_attempts
  WHERE ip_address = _ip_address
    AND attempted_at > (now() - (_window_minutes || ' minutes')::interval);
  
  -- Check if limit exceeded
  IF v_attempt_count >= _max_attempts THEN
    v_result := jsonb_build_object(
      'allowed', false,
      'current_count', v_attempt_count,
      'limit', _max_attempts,
      'window_minutes', _window_minutes,
      'retry_after', 60
    );
  ELSE
    v_result := jsonb_build_object(
      'allowed', true,
      'current_count', v_attempt_count,
      'limit', _max_attempts,
      'window_minutes', _window_minutes
    );
  END IF;
  
  RETURN v_result;
END;
$$;

-- Function to log token validation attempts
CREATE OR REPLACE FUNCTION log_token_validation_attempt(
  _ip_address inet,
  _token_attempted text,
  _success boolean,
  _user_agent text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO presentation_token_attempts (ip_address, token_attempted, success, user_agent)
  VALUES (_ip_address, _token_attempted, _success, _user_agent);
END;
$$;

-- Function to create security alert for suspicious activity
CREATE OR REPLACE FUNCTION check_and_alert_brute_force(
  _ip_address inet
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_failed_attempts integer;
BEGIN
  -- Count failed attempts in last hour
  SELECT COUNT(*)
  INTO v_failed_attempts
  FROM presentation_token_attempts
  WHERE ip_address = _ip_address
    AND success = false
    AND attempted_at > (now() - interval '1 hour');
  
  -- Create alert if threshold exceeded
  IF v_failed_attempts >= 20 THEN
    INSERT INTO bulk_access_alerts (
      alert_type,
      detected_at,
      ip_address,
      details
    ) VALUES (
      'TOKEN_BRUTE_FORCE',
      now(),
      _ip_address::text,
      jsonb_build_object(
        'failed_attempts', v_failed_attempts,
        'endpoint', 'validate-presentation-token',
        'window', '1 hour'
      )
    );
  END IF;
END;
$$;

COMMENT ON TABLE impersonation_sessions IS 'Server-side tracking of admin impersonation sessions with HMAC validation';
COMMENT ON TABLE presentation_token_attempts IS 'Rate limiting and brute force detection for presentation token validation';
COMMENT ON FUNCTION check_presentation_token_rate_limit IS 'Check if IP has exceeded rate limit for token validation attempts';
COMMENT ON FUNCTION log_token_validation_attempt IS 'Log each token validation attempt for security monitoring';
COMMENT ON FUNCTION check_and_alert_brute_force IS 'Create security alert when brute force attack is detected';