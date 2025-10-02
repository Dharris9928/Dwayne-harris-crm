-- Create enrichment logs table to track all AI enrichment attempts
CREATE TABLE public.enrichment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('lovable_ai', 'claude')),
  enrichment_type TEXT NOT NULL CHECK (enrichment_type IN ('standard', 'deep')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'rate_limited', 'low_confidence')),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  fields_enriched JSONB,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create AI insights table for storing analysis separate from company data
CREATE TABLE public.company_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE NOT NULL,
  market_positioning TEXT,
  competitive_advantages TEXT[],
  growth_indicators TEXT[],
  smart_home_readiness_score INTEGER CHECK (smart_home_readiness_score >= 0 AND smart_home_readiness_score <= 100),
  recommended_approach TEXT,
  confidence_level TEXT CHECK (confidence_level IN ('high', 'medium', 'low')),
  last_enriched_at TIMESTAMPTZ DEFAULT now(),
  enriched_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enrichment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for enrichment_logs
CREATE POLICY "Users can view enrichment logs for their companies"
ON public.enrichment_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = enrichment_logs.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can create enrichment logs for their companies"
ON public.enrichment_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = enrichment_logs.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
  AND created_by = auth.uid()
);

-- RLS Policies for company_ai_insights
CREATE POLICY "Users can view AI insights for their companies"
ON public.company_ai_insights
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_ai_insights.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can create AI insights for their companies"
ON public.company_ai_insights
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_ai_insights.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
  AND enriched_by = auth.uid()
);

CREATE POLICY "Users can update AI insights for their companies"
ON public.company_ai_insights
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_ai_insights.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

-- Create indexes for performance
CREATE INDEX idx_enrichment_logs_company_id ON public.enrichment_logs(company_id);
CREATE INDEX idx_enrichment_logs_created_at ON public.enrichment_logs(created_at DESC);
CREATE INDEX idx_company_ai_insights_company_id ON public.company_ai_insights(company_id);