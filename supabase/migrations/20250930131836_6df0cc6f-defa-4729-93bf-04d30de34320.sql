-- Create enums for the CRM system
CREATE TYPE app_role AS ENUM ('admin', 'sales_manager', 'sales_rep', 'read_only');

CREATE TYPE industry_type AS ENUM ('Builder', 'Contractor');

CREATE TYPE builder_segment AS ENUM (
  'Production/Tract Builders',
  'Regional Mid-Volume Builders', 
  'Spec Home Builders',
  'Luxury Custom Builders',
  'Multi-Family Developers',
  'Affordable Housing Builders',
  'Active Adult/55+ Specialists'
);

CREATE TYPE contractor_segment AS ENUM (
  'Smart Home Champions',
  'Customer Experience Innovators',
  'High-Volume Installers',
  'Premium Service Specialists',
  'Regional Growth Contractors',
  'Specialty HVAC Integrators',
  'Service-First Traditionalists',
  'Emergency/Repair Specialists'
);

CREATE TYPE segment_confidence AS ENUM ('High 90%+', 'Medium 70-89%', 'Low <70%');

CREATE TYPE revenue_range AS ENUM ('<$500K', '$500K-$999K', '$1M-$2.9M', '$3M-$5.9M', '$6M-$10M', '$10M+');

CREATE TYPE priority_tier AS ENUM ('P1: 80-100', 'P2: 60-79', 'P3: 40-59');

CREATE TYPE company_status AS ENUM ('Lead', 'Contacted', 'Engaged', 'Pilot', 'Active', 'Inactive', 'Lost');

CREATE TYPE decision_tier AS ENUM ('Primary', 'Secondary', 'Influencer');

CREATE TYPE contact_method AS ENUM ('Email', 'Phone', 'LinkedIn', 'Text');

CREATE TYPE activity_type AS ENUM ('Email', 'Phone', 'LinkedIn Connection', 'LinkedIn Message', 'Meeting', 'Demo', 'Training');

CREATE TYPE activity_outcome AS ENUM ('Sent', 'Opened', 'Clicked', 'Replied', 'Connected', 'Completed', 'No Answer', 'Bounced');

-- Create user profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  role app_role DEFAULT 'sales_rep',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  industry_type industry_type NOT NULL,
  builder_segment builder_segment,
  contractor_segment contractor_segment,
  segment_confidence segment_confidence DEFAULT 'Medium 70-89%',
  website_url text,
  linkedin_company_url text,
  primary_phone text,
  total_employees integer,
  annual_revenue_range revenue_range,
  years_in_business integer,
  lead_score integer DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  priority_tier priority_tier,
  nest_pro_partner_id text,
  status company_status DEFAULT 'Lead',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Companies policies - all authenticated users can CRUD companies
CREATE POLICY "Authenticated users can view companies" ON public.companies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create companies" ON public.companies
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can update companies" ON public.companies
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete companies" ON public.companies
  FOR DELETE TO authenticated USING (true);

-- Create company branches table
CREATE TABLE public.company_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  branch_name text NOT NULL,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  branch_revenue decimal,
  annual_volume integer,
  geographic_coverage text[],
  is_headquarters boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_branches ENABLE ROW LEVEL SECURITY;

-- Branches policies
CREATE POLICY "Authenticated users can view branches" ON public.company_branches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create branches" ON public.company_branches
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update branches" ON public.company_branches
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete branches" ON public.company_branches
  FOR DELETE TO authenticated USING (true);

-- Create contacts table
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES public.company_branches(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  title text,
  decision_tier decision_tier DEFAULT 'Influencer',
  email text,
  phone text,
  mobile text,
  linkedin_url text,
  linkedin_connections integer,
  linkedin_activity_score integer CHECK (linkedin_activity_score >= 1 AND linkedin_activity_score <= 10),
  preferred_contact_method contact_method DEFAULT 'Email',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Contacts policies
CREATE POLICY "Authenticated users can view contacts" ON public.contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create contacts" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts" ON public.contacts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete contacts" ON public.contacts
  FOR DELETE TO authenticated USING (true);

-- Create outreach activities table
CREATE TABLE public.outreach_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.company_branches(id) ON DELETE SET NULL,
  activity_type activity_type NOT NULL,
  sequence_name text,
  sequence_day integer,
  sequence_phase text,
  subject_line text,
  message_content text,
  outcome activity_outcome DEFAULT 'Sent',
  scheduled_date date,
  completed_date date,
  notes text,
  created_by uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.outreach_activities ENABLE ROW LEVEL SECURITY;

-- Activities policies
CREATE POLICY "Authenticated users can view activities" ON public.outreach_activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create activities" ON public.outreach_activities
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can update activities" ON public.outreach_activities
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete activities" ON public.outreach_activities
  FOR DELETE TO authenticated USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();