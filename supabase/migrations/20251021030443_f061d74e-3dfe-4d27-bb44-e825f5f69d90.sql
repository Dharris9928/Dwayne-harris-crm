-- Add opportunity_id column to outreach_activities table
ALTER TABLE public.outreach_activities 
ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_outreach_activities_opportunity ON public.outreach_activities(opportunity_id);