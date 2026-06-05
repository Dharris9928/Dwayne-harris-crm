-- Create table for import/export activity logs
CREATE TABLE public.import_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('import', 'export')),
  table_name TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  successful_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  file_format TEXT,
  filters_applied JSONB,
  error_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_export_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view their own import/export logs"
  ON public.import_export_logs
  FOR SELECT
  USING (user_id = auth.uid() OR has_elevated_access(auth.uid()));

-- Authenticated users can create logs
CREATE POLICY "Users can create import/export logs"
  ON public.import_export_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can view all logs
CREATE POLICY "Admins can view all import/export logs"
  ON public.import_export_logs
  FOR SELECT
  USING (has_elevated_access(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_import_export_logs_user_id ON public.import_export_logs(user_id);
CREATE INDEX idx_import_export_logs_created_at ON public.import_export_logs(created_at DESC);