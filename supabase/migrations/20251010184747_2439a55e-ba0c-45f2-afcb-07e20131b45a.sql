-- Create sync configuration table
CREATE TABLE IF NOT EXISTS public.sync_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_name TEXT NOT NULL,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('bigquery', 'warehouse', 'analytics')),
  schedule_cron TEXT NOT NULL DEFAULT '0 2 * * *', -- Daily at 2 AM
  is_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failed', 'running')),
  configuration JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create sync logs table
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_config_id UUID REFERENCES public.sync_configurations(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  sync_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sync_logs_config_id ON public.sync_logs(sync_config_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON public.sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_configurations_enabled ON public.sync_configurations(is_enabled) WHERE is_enabled = true;

-- Enable RLS
ALTER TABLE public.sync_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sync_configurations (admin only)
CREATE POLICY "Admins can view sync configurations"
  ON public.sync_configurations
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage sync configurations"
  ON public.sync_configurations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for sync_logs (admin only)
CREATE POLICY "Admins can view sync logs"
  ON public.sync_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_sync_configurations_updated_at
  BEFORE UPDATE ON public.sync_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to cleanup old sync logs
CREATE OR REPLACE FUNCTION public.cleanup_old_sync_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.sync_logs
  WHERE created_at < now() - (retention_days || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Insert default BigQuery sync configuration
INSERT INTO public.sync_configurations (sync_name, sync_type, schedule_cron, is_enabled, configuration)
VALUES (
  'BigQuery Data Warehouse Sync',
  'bigquery',
  '0 2 * * *',
  false, -- Disabled until credentials are added
  jsonb_build_object(
    'project_id', '',
    'dataset_id', 'crm_data',
    'tables', array['companies', 'contacts', 'activities', 'opportunities']
  )
);