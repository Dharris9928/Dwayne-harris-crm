-- Add invitation tracking fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS temp_password TEXT,
ADD COLUMN IF NOT EXISTS invitation_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invitation_email_delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invitation_email_opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invitation_email_status TEXT DEFAULT 'pending';

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.temp_password IS 'Temporary password for invited users (encrypted in production)';
COMMENT ON COLUMN public.profiles.invitation_email_status IS 'Status: pending, sent, delivered, opened, bounced, failed';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_invitation_status ON public.profiles(invitation_email_status);
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON public.profiles(approval_status);