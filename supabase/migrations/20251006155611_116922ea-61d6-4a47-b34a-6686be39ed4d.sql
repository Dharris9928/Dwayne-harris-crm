-- Add HVAC Monitoring field to companies table
ALTER TABLE public.companies
ADD COLUMN hvac_monitoring text CHECK (hvac_monitoring IN ('Yes', 'No', 'Not Interested'));