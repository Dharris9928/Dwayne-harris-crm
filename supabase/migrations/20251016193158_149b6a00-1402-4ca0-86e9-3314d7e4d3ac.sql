-- Phase 4: Enhance field-level masking system with audit logging

-- Create audit log for field access attempts
CREATE TABLE IF NOT EXISTS public.field_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  access_granted BOOLEAN NOT NULL DEFAULT false,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_ip TEXT,
  user_agent TEXT
);

-- Enable RLS on field access log
ALTER TABLE public.field_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view field access logs
CREATE POLICY "Only admins can view field access logs"
  ON public.field_access_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert field access logs
CREATE POLICY "System can log field access"
  ON public.field_access_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add more granular field permissions for financial data
INSERT INTO public.field_permissions (table_name, field_name, min_role_required, is_pii, masking_pattern) VALUES
  ('companies', 'estimated_annual_revenue', 'sales_manager', false, '$***,***'),
  ('companies', 'funding_stage', 'sales_rep', false, NULL),
  ('companies', 'last_funding_amount', 'sales_manager', false, '$***,***'),
  ('opportunities', 'deal_value', 'sales_rep', false, '$***,***'),
  ('opportunities', 'commission_amount', 'sales_manager', false, '$***,***')
ON CONFLICT (table_name, field_name) DO NOTHING;

-- Function to log field access attempts
CREATE OR REPLACE FUNCTION public.log_field_access(
  _table_name TEXT,
  _field_name TEXT,
  _record_id TEXT,
  _access_granted BOOLEAN
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create index for better performance on field access logs
CREATE INDEX IF NOT EXISTS idx_field_access_log_user ON public.field_access_log(user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_access_log_record ON public.field_access_log(table_name, record_id, accessed_at DESC);