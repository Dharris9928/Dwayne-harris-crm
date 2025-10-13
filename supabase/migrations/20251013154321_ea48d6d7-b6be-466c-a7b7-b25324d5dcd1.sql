-- Create auto-encryption trigger for contacts
CREATE OR REPLACE FUNCTION public.auto_encrypt_contact_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  active_key_version INTEGER;
BEGIN
  -- Get active encryption key version
  SELECT key_version INTO active_key_version
  FROM public.encryption_config
  WHERE is_active = true
  LIMIT 1;

  -- Encrypt email if provided and not already encrypted
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    NEW.email_encrypted := public.encrypt_text(NEW.email);
  END IF;

  -- Encrypt phone if provided and not already encrypted
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.phone_encrypted := public.encrypt_text(NEW.phone);
  END IF;

  -- Encrypt mobile if provided and not already encrypted
  IF NEW.mobile IS NOT NULL AND NEW.mobile != '' THEN
    NEW.mobile_encrypted := public.encrypt_text(NEW.mobile);
  END IF;

  -- Set encryption version
  NEW.encryption_version := active_key_version;

  RETURN NEW;
END;
$$;

-- Create trigger for contacts auto-encryption
DROP TRIGGER IF EXISTS encrypt_contact_fields ON public.contacts;
CREATE TRIGGER encrypt_contact_fields
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_encrypt_contact_fields();

-- Create function to get encryption statistics
CREATE OR REPLACE FUNCTION public.get_encryption_stats()
RETURNS TABLE(
  table_name TEXT,
  total_records BIGINT,
  encrypted_records BIGINT,
  pending_records BIGINT,
  encryption_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Contacts encryption stats
  RETURN QUERY
  SELECT
    'contacts'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE encryption_version IS NOT NULL)::BIGINT,
    COUNT(*) FILTER (WHERE encryption_version IS NULL)::BIGINT,
    ROUND((COUNT(*) FILTER (WHERE encryption_version IS NOT NULL)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2)
  FROM public.contacts;

  -- Companies encryption stats
  RETURN QUERY
  SELECT
    'companies'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE encryption_version IS NOT NULL)::BIGINT,
    COUNT(*) FILTER (WHERE encryption_version IS NULL)::BIGINT,
    ROUND((COUNT(*) FILTER (WHERE encryption_version IS NOT NULL)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2)
  FROM public.companies;
END;
$$;

-- Create automated key rotation scheduler function
CREATE OR REPLACE FUNCTION public.schedule_key_rotation(_days_until_rotation INTEGER DEFAULT 90)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_config RECORD;
  next_rotation_date TIMESTAMPTZ;
  result JSONB;
BEGIN
  -- Get current encryption config
  SELECT * INTO current_config
  FROM public.encryption_config
  WHERE is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No active encryption configuration found'
    );
  END IF;

  -- Calculate next rotation date
  next_rotation_date := NOW() + (_days_until_rotation || ' days')::INTERVAL;

  -- Update rotation schedule
  UPDATE public.encryption_config
  SET 
    rotation_schedule = jsonb_build_object(
      'next_rotation', next_rotation_date,
      'rotation_interval_days', _days_until_rotation,
      'scheduled_at', NOW()
    )
  WHERE id = current_config.id;

  result := jsonb_build_object(
    'success', true,
    'message', 'Key rotation scheduled successfully',
    'next_rotation_date', next_rotation_date,
    'rotation_interval_days', _days_until_rotation,
    'current_key_version', current_config.key_version
  );

  RETURN result;
END;
$$;

-- Create function to check if key rotation is due
CREATE OR REPLACE FUNCTION public.check_key_rotation_due()
RETURNS TABLE(
  is_due BOOLEAN,
  days_until_rotation INTEGER,
  next_rotation_date TIMESTAMPTZ,
  current_key_version INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  config_record RECORD;
  rotation_date TIMESTAMPTZ;
BEGIN
  SELECT * INTO config_record
  FROM public.encryption_config
  WHERE is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, NULL::TIMESTAMPTZ, 0;
    RETURN;
  END IF;

  -- Extract next rotation date from schedule
  rotation_date := (config_record.rotation_schedule->>'next_rotation')::TIMESTAMPTZ;

  IF rotation_date IS NULL THEN
    RETURN QUERY SELECT false, 0, NULL::TIMESTAMPTZ, config_record.key_version;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    (rotation_date <= NOW()),
    EXTRACT(DAY FROM (rotation_date - NOW()))::INTEGER,
    rotation_date,
    config_record.key_version;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_encryption_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_key_rotation_due() TO authenticated;