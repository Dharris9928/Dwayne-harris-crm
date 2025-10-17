-- Fix track_user_session function to use correct column names
CREATE OR REPLACE FUNCTION public.track_user_session(
  _user_id uuid,
  _session_token_hash text,
  _ip_address inet DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  session_id UUID;
  config_record RECORD;
  session_count INTEGER;
BEGIN
  -- Get session configuration
  SELECT * INTO config_record FROM public.session_config LIMIT 1;
  
  -- Check if session already exists
  SELECT id INTO session_id
  FROM public.user_sessions
  WHERE user_id = _user_id
    AND session_token_hash = _session_token_hash
    AND expires_at > now();
  
  IF session_id IS NOT NULL THEN
    -- Update existing session (using idle_timeout_minutes correctly)
    UPDATE public.user_sessions
    SET last_activity_at = now(),
        expires_at = now() + (config_record.idle_timeout_minutes || ' minutes')::INTERVAL
    WHERE id = session_id;
    
    RETURN session_id;
  END IF;
  
  -- Check concurrent session limit
  SELECT COUNT(*) INTO session_count
  FROM public.user_sessions
  WHERE user_id = _user_id
    AND expires_at > now();
  
  IF session_count >= config_record.max_concurrent_sessions THEN
    -- Terminate oldest session
    DELETE FROM public.user_sessions
    WHERE id = (
      SELECT id FROM public.user_sessions
      WHERE user_id = _user_id
        AND expires_at > now()
      ORDER BY last_activity_at ASC
      LIMIT 1
    );
  END IF;
  
  -- Create new session (using absolute_timeout_hours correctly)
  INSERT INTO public.user_sessions (
    user_id,
    session_token_hash,
    ip_address,
    user_agent,
    expires_at
  ) VALUES (
    _user_id,
    _session_token_hash,
    _ip_address,
    _user_agent,
    now() + (config_record.absolute_timeout_hours || ' hours')::INTERVAL
  )
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$function$;

-- Create has_record_access function for record-level access control
-- Admins and sales managers automatically have access to all records
CREATE OR REPLACE FUNCTION public.has_record_access(
  _user_id uuid,
  _table_name text,
  _record_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Admins and sales managers have access to everything
  IF has_elevated_access(_user_id) THEN
    RETURN true;
  END IF;
  
  -- Check if user has explicit approval
  IF EXISTS (
    SELECT 1 
    FROM public.record_access_approvals
    WHERE user_id = _user_id
      AND table_name = _table_name
      AND record_id = _record_id
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN true;
  END IF;
  
  -- Check based on table-specific ownership
  CASE _table_name
    WHEN 'companies' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.companies
        WHERE id = _record_id
          AND (created_by = _user_id OR assigned_to = _user_id)
      );
    WHEN 'contacts' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.contacts c
        JOIN public.companies co ON c.company_id = co.id
        WHERE c.id = _record_id
          AND (co.created_by = _user_id OR co.assigned_to = _user_id)
      );
    WHEN 'opportunities' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.opportunities
        WHERE id = _record_id
          AND (created_by = _user_id OR assigned_to = _user_id)
      );
    ELSE
      RETURN false;
  END CASE;
END;
$function$;