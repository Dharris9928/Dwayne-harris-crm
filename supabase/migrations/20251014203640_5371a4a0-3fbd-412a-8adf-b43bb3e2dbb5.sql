-- Add contractor_id field to opportunities table
ALTER TABLE public.opportunities
ADD COLUMN contractor_id uuid REFERENCES public.companies(id);

COMMENT ON COLUMN public.opportunities.contractor_id IS 'Optional reference to the contractor company performing the work';
