-- Add segment_rationale to company_ai_insights to explain segment assignment
ALTER TABLE public.company_ai_insights 
ADD COLUMN segment_rationale text;