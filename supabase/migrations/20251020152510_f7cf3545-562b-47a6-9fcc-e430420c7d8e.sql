-- Create email_logs table to track all outgoing emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_email TEXT NOT NULL DEFAULT 'Nest Pro <info@nestproconnector.com>',
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered', 'bounced', 'opened')),
  resend_email_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_user ON public.email_logs(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON public.email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all email logs
CREATE POLICY "Admins can view all email logs"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Users can view their own email logs
CREATE POLICY "Users can view their own email logs"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

-- Service role can insert email logs
CREATE POLICY "Service role can insert email logs"
  ON public.email_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create RPC function to log emails
CREATE OR REPLACE FUNCTION public.log_email(
  p_recipient_email TEXT,
  p_recipient_user_id UUID,
  p_subject TEXT,
  p_email_type TEXT,
  p_status TEXT DEFAULT 'sent',
  p_resend_email_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.email_logs (
    recipient_email,
    recipient_user_id,
    subject,
    email_type,
    status,
    resend_email_id,
    error_message,
    metadata
  ) VALUES (
    p_recipient_email,
    p_recipient_user_id,
    p_subject,
    p_email_type,
    p_status,
    p_resend_email_id,
    p_error_message,
    p_metadata
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

COMMENT ON TABLE public.email_logs IS 
'Tracks all outgoing emails sent via Resend. Used for monitoring delivery, debugging issues, and audit compliance.';

COMMENT ON FUNCTION public.log_email IS 
'Logs an outgoing email to the email_logs table. Used by edge functions to track all email communications.';