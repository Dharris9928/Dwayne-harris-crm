-- Phase 1: Database Schema Changes for Upload Log Batch Tracking & Rollback System

-- 1.1 Add new columns to import_export_logs table
ALTER TABLE public.import_export_logs
ADD COLUMN IF NOT EXISTS batch_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS rollback_available BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rolled_back_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rolled_back_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS affected_tables TEXT[];

-- Create index on batch_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_import_export_logs_batch_id ON public.import_export_logs(batch_id);

-- 1.2 Add import_batch_id tracking column to data tables
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS import_batch_id UUID;

ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS import_batch_id UUID;

ALTER TABLE public.company_communications
ADD COLUMN IF NOT EXISTS import_batch_id UUID;

ALTER TABLE public.apollo_email_activities
ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- 1.3 Add previous_engagement_values for rollback support on apollo_email_activities
ALTER TABLE public.apollo_email_activities
ADD COLUMN IF NOT EXISTS previous_engagement_values JSONB;

-- Create indexes on import_batch_id for efficient rollback queries
CREATE INDEX IF NOT EXISTS idx_companies_import_batch_id ON public.companies(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_import_batch_id ON public.contacts(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_communications_import_batch_id ON public.company_communications(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apollo_email_activities_import_batch_id ON public.apollo_email_activities(import_batch_id) WHERE import_batch_id IS NOT NULL;