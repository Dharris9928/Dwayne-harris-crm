-- Add missing columns to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS linkedin_company_url text;

-- Create product_type enum for installation history
CREATE TYPE public.product_type AS ENUM (
  'Thermostat NT',
  'Thermostat NLT4',
  'Doorbell Wired',
  'Doorbell Wireless',
  'Camera Indoor',
  'Camera Outdoor Wired',
  'Camera Outdoor Wireless',
  'Camera Floodlight',
  'Nest Hub'
);

-- Create training_type enum
CREATE TYPE public.training_type AS ENUM (
  'Touch 1: Business Benefits',
  'Touch 2: Product Training',
  'Touch 3: Sales Training',
  'HVAC Monitoring Certification'
);

-- Create program_type enum
CREATE TYPE public.program_type AS ENUM (
  'HVAC Monitoring',
  'Smart Home Ecosystem',
  'Builder Integration'
);

-- Create program_status enum
CREATE TYPE public.program_status AS ENUM (
  'Proposed',
  'Approved',
  'Active',
  'Completed',
  'Cancelled'
);

-- Create relationship_status enum
CREATE TYPE public.relationship_status AS ENUM (
  'Matched',
  'Introduced',
  'Active',
  'Inactive'
);

-- Create segmentation_scores table
CREATE TABLE public.segmentation_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  builder_volume_score integer CHECK (builder_volume_score >= 0 AND builder_volume_score <= 15),
  builder_price_point_score integer CHECK (builder_price_point_score >= 0 AND builder_price_point_score <= 10),
  builder_geographic_score integer CHECK (builder_geographic_score >= 0 AND builder_geographic_score <= 10),
  builder_stability_score integer CHECK (builder_stability_score >= 0 AND builder_stability_score <= 15),
  contractor_volume_score integer CHECK (contractor_volume_score >= 0 AND contractor_volume_score <= 6),
  contractor_premium_score integer CHECK (contractor_premium_score >= 0 AND contractor_premium_score <= 12),
  contractor_technology_score integer CHECK (contractor_technology_score >= 0 AND contractor_technology_score <= 10),
  contractor_growth_score integer CHECK (contractor_growth_score >= 0 AND contractor_growth_score <= 8),
  contractor_emergency_score integer CHECK (contractor_emergency_score >= 0 AND contractor_emergency_score <= 10),
  website_quality_score integer CHECK (website_quality_score >= 0 AND website_quality_score <= 10),
  social_media_score integer CHECK (social_media_score >= 0 AND social_media_score <= 10),
  technology_adoption_score integer CHECK (technology_adoption_score >= 0 AND technology_adoption_score <= 10),
  total_score integer CHECK (total_score >= 0 AND total_score <= 100),
  calculated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create installation_history table
CREATE TABLE public.installation_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.company_branches(id) ON DELETE SET NULL,
  product_type product_type NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  installation_date date NOT NULL,
  pro_id_reference text,
  project_name text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create training_certifications table
CREATE TABLE public.training_certifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  training_type training_type NOT NULL,
  scheduled_date date,
  completed_date date,
  certification_issued boolean DEFAULT false,
  certification_number text,
  expiration_date date,
  score integer CHECK (score >= 0 AND score <= 100),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create pilot_programs table
CREATE TABLE public.pilot_programs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.company_branches(id) ON DELETE SET NULL,
  program_type program_type NOT NULL,
  start_date date,
  end_date date,
  status program_status NOT NULL DEFAULT 'Proposed',
  target_installations integer,
  actual_installations integer DEFAULT 0,
  success_metrics jsonb,
  roi_data jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create nest_pro_partners table
CREATE TABLE public.nest_pro_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_name text NOT NULL,
  service_areas text[],
  specializations text[],
  builder_capacity boolean DEFAULT false,
  contractor_capacity boolean DEFAULT false,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create company_partner_matches table
CREATE TABLE public.company_partner_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.nest_pro_partners(id) ON DELETE CASCADE,
  match_score integer CHECK (match_score >= 0 AND match_score <= 100),
  match_reason text,
  introduction_date date,
  relationship_status relationship_status NOT NULL DEFAULT 'Matched',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.segmentation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nest_pro_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_partner_matches ENABLE ROW LEVEL SECURITY;

-- RLS policies for segmentation_scores
CREATE POLICY "Authenticated users can view segmentation scores"
ON public.segmentation_scores FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create segmentation scores"
ON public.segmentation_scores FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update segmentation scores"
ON public.segmentation_scores FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete segmentation scores"
ON public.segmentation_scores FOR DELETE
USING (true);

-- RLS policies for installation_history
CREATE POLICY "Authenticated users can view installation history"
ON public.installation_history FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create installation history"
ON public.installation_history FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update installation history"
ON public.installation_history FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete installation history"
ON public.installation_history FOR DELETE
USING (true);

-- RLS policies for training_certifications
CREATE POLICY "Authenticated users can view training certifications"
ON public.training_certifications FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create training certifications"
ON public.training_certifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update training certifications"
ON public.training_certifications FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete training certifications"
ON public.training_certifications FOR DELETE
USING (true);

-- RLS policies for pilot_programs
CREATE POLICY "Authenticated users can view pilot programs"
ON public.pilot_programs FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create pilot programs"
ON public.pilot_programs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update pilot programs"
ON public.pilot_programs FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete pilot programs"
ON public.pilot_programs FOR DELETE
USING (true);

-- RLS policies for nest_pro_partners
CREATE POLICY "Authenticated users can view nest pro partners"
ON public.nest_pro_partners FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create nest pro partners"
ON public.nest_pro_partners FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update nest pro partners"
ON public.nest_pro_partners FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete nest pro partners"
ON public.nest_pro_partners FOR DELETE
USING (true);

-- RLS policies for company_partner_matches
CREATE POLICY "Authenticated users can view company partner matches"
ON public.company_partner_matches FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create company partner matches"
ON public.company_partner_matches FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update company partner matches"
ON public.company_partner_matches FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete company partner matches"
ON public.company_partner_matches FOR DELETE
USING (true);

-- Add triggers for updated_at column
CREATE TRIGGER update_pilot_programs_updated_at
BEFORE UPDATE ON public.pilot_programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_segmentation_scores_company ON public.segmentation_scores(company_id);
CREATE INDEX idx_installation_history_company ON public.installation_history(company_id);
CREATE INDEX idx_installation_history_branch ON public.installation_history(branch_id);
CREATE INDEX idx_training_certifications_company ON public.training_certifications(company_id);
CREATE INDEX idx_training_certifications_contact ON public.training_certifications(contact_id);
CREATE INDEX idx_pilot_programs_company ON public.pilot_programs(company_id);
CREATE INDEX idx_pilot_programs_branch ON public.pilot_programs(branch_id);
CREATE INDEX idx_company_partner_matches_company ON public.company_partner_matches(company_id);
CREATE INDEX idx_company_partner_matches_partner ON public.company_partner_matches(partner_id);