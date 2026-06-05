-- Add financial stability indicator fields to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS revenue_growth_trend text,
ADD COLUMN IF NOT EXISTS profitability_level text,
ADD COLUMN IF NOT EXISTS financial_health_rating text;

-- Add check constraints for valid values
ALTER TABLE public.companies
ADD CONSTRAINT companies_revenue_growth_trend_check
CHECK (revenue_growth_trend IN ('High Growth 20%+', 'Moderate Growth 10-20%', 'Stable 0-10%', 'Declining', 'Unknown'));

ALTER TABLE public.companies
ADD CONSTRAINT companies_profitability_level_check
CHECK (profitability_level IN ('Highly Profitable', 'Profitable', 'Break-even', 'Struggling', 'Unknown'));

ALTER TABLE public.companies
ADD CONSTRAINT companies_financial_health_rating_check
CHECK (financial_health_rating IN ('Excellent', 'Good', 'Fair', 'At Risk', 'Unknown'));