-- Fix search_path security warning for log_field_access function
CREATE OR REPLACE FUNCTION public.log_field_access(
  _table_name TEXT,
  _field_name TEXT,
  _record_id TEXT,
  _access_granted BOOLEAN
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.field_access_log (
    user_id,
    table_name,
    field_name,
    record_id,
    access_granted
  ) VALUES (
    auth.uid(),
    _table_name,
    _field_name,
    _record_id,
    _access_granted
  );
END;
$$;