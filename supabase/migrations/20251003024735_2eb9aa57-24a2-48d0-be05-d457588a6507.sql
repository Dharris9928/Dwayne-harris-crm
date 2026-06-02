-- Drop old constraints
ALTER TABLE enrichment_logs 
DROP CONSTRAINT IF EXISTS enrichment_logs_provider_check;

ALTER TABLE enrichment_logs 
DROP CONSTRAINT IF EXISTS enrichment_logs_enrichment_type_check;

-- Add updated constraints with all providers and enrichment types
ALTER TABLE enrichment_logs 
ADD CONSTRAINT enrichment_logs_provider_check 
CHECK (provider = ANY (ARRAY[
  'lovable_ai'::text, 
  'claude'::text, 
  'deepseek'::text, 
  'apollo'::text, 
  'perplexity'::text,
  'lovable_ai_manual'::text,
  'claude_manual'::text,
  'deepseek_manual'::text,
  'apollo_manual'::text,
  'perplexity_manual'::text
]));

ALTER TABLE enrichment_logs 
ADD CONSTRAINT enrichment_logs_enrichment_type_check 
CHECK (enrichment_type = ANY (ARRAY[
  'standard'::text, 
  'deep'::text,
  'manual_reapply'::text
]));