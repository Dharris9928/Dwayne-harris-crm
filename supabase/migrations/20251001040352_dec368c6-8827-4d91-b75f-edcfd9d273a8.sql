-- ==================================================
-- STEP 1: Convert ENUM columns to VARCHAR FIRST
-- ==================================================

-- Add new segment column
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS segment VARCHAR(100);

-- Migrate data from builder_segment and contractor_segment to segment  
UPDATE companies 
SET segment = COALESCE(builder_segment, contractor_segment)
WHERE segment IS NULL AND (builder_segment IS NOT NULL OR contractor_segment IS NOT NULL);

-- Convert ENUM columns to VARCHAR (must happen BEFORE dropping the ENUMs)
DO $$
BEGIN
  -- Convert industry_type if it's an ENUM
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'industry_type') THEN
    ALTER TABLE companies ALTER COLUMN industry_type TYPE VARCHAR(20) USING industry_type::text;
  END IF;
  
  -- Convert status if it's an ENUM
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_status') THEN
    ALTER TABLE companies ALTER COLUMN status TYPE VARCHAR(20) USING status::text;
  END IF;
  
  -- Convert priority_tier if it's an ENUM
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_tier') THEN
    ALTER TABLE companies ALTER COLUMN priority_tier TYPE VARCHAR(20) USING priority_tier::text;
  END IF;
  
  -- Convert annual_revenue_range if it's an ENUM
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'annual_revenue_range') THEN
    ALTER TABLE companies ALTER COLUMN annual_revenue_range TYPE VARCHAR(50) USING annual_revenue_range::text;
  END IF;
END $$;

-- Convert other text columns to specific VARCHAR sizes
ALTER TABLE companies 
  ALTER COLUMN segment_confidence TYPE VARCHAR(20),
  ALTER COLUMN price_point_category TYPE VARCHAR(50),
  ALTER COLUMN service_area_type TYPE VARCHAR(50),
  ALTER COLUMN partner_relationship_status TYPE VARCHAR(50);

-- Add company_type and nest_pro_industry if they don't exist
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS company_type VARCHAR(20) DEFAULT 'standalone',
  ADD COLUMN IF NOT EXISTS nest_pro_industry VARCHAR(50);

-- ==================================================
-- STEP 2: NOW drop the ENUM types
-- ==================================================

DROP TYPE IF EXISTS builder_segment CASCADE;
DROP TYPE IF EXISTS contractor_segment CASCADE;
DROP TYPE IF EXISTS company_segment CASCADE;
DROP TYPE IF EXISTS industry_type CASCADE;
DROP TYPE IF EXISTS company_status CASCADE;
DROP TYPE IF EXISTS priority_tier CASCADE;
DROP TYPE IF EXISTS annual_revenue_range CASCADE;

-- ==================================================
-- STEP 3: Drop old segment columns
-- ==================================================

ALTER TABLE companies 
  DROP COLUMN IF EXISTS builder_segment,
  DROP COLUMN IF EXISTS contractor_segment;

-- ==================================================
-- STEP 4: Set default values
-- ==================================================

UPDATE companies SET status = 'Lead' WHERE status IS NULL;
UPDATE companies SET company_type = 'standalone' WHERE company_type IS NULL;
UPDATE companies SET priority_tier = 'Unscored' WHERE priority_tier IS NULL;
UPDATE companies SET lead_score = 0 WHERE lead_score IS NULL;
UPDATE companies SET is_parent_company = false WHERE is_parent_company IS NULL;

-- ==================================================
-- STEP 5: Drop all old constraints
-- ==================================================

ALTER TABLE companies 
  DROP CONSTRAINT IF EXISTS companies_industry_type_check,
  DROP CONSTRAINT IF EXISTS companies_segment_check,
  DROP CONSTRAINT IF EXISTS companies_segment_valid,
  DROP CONSTRAINT IF EXISTS companies_builder_segment_check,
  DROP CONSTRAINT IF EXISTS companies_contractor_segment_check,
  DROP CONSTRAINT IF EXISTS companies_segment_confidence_check,
  DROP CONSTRAINT IF EXISTS companies_status_check,
  DROP CONSTRAINT IF EXISTS companies_company_type_check,
  DROP CONSTRAINT IF EXISTS companies_priority_tier_check,
  DROP CONSTRAINT IF EXISTS companies_price_point_category_check,
  DROP CONSTRAINT IF EXISTS companies_service_area_type_check,
  DROP CONSTRAINT IF EXISTS companies_annual_revenue_range_check,
  DROP CONSTRAINT IF EXISTS companies_partner_relationship_status_check,
  DROP CONSTRAINT IF EXISTS companies_state_check,
  DROP CONSTRAINT IF EXISTS companies_lead_score_check,
  DROP CONSTRAINT IF EXISTS companies_maintenance_contract_percentage_check,
  DROP CONSTRAINT IF EXISTS companies_emergency_service_percentage_check,
  DROP CONSTRAINT IF EXISTS check_no_self_parent;

-- ==================================================
-- STEP 6: Add new CHECK constraints
-- ==================================================

ALTER TABLE companies 
  ADD CONSTRAINT companies_industry_type_check 
    CHECK (industry_type IN ('Builder', 'Contractor')),
  
  ADD CONSTRAINT companies_segment_valid CHECK (
    segment IS NULL OR 
    (
      (industry_type = 'Builder' AND segment IN (
        'production_tract', 'regional_mid_volume', 'spec_home',
        'luxury_custom', 'multi_family', 'affordable_housing', 'active_adult'
      ))
      OR
      (industry_type = 'Contractor' AND segment IN (
        'smart_home_champions', 'customer_experience', 'high_volume',
        'premium_specialists', 'regional_growth', 'specialty_integrators',
        'traditionalists', 'emergency_repair'
      ))
    )
  ),
  
  ADD CONSTRAINT companies_segment_confidence_check 
    CHECK (segment_confidence IS NULL OR segment_confidence IN ('High', 'Medium', 'Low')),
  
  ADD CONSTRAINT companies_status_check 
    CHECK (status IN ('Lead', 'Contacted', 'Engaged', 'Pilot', 'Active', 'Inactive', 'Lost')),
  
  ADD CONSTRAINT companies_company_type_check 
    CHECK (company_type IN ('standalone', 'parent', 'subsidiary')),
  
  ADD CONSTRAINT companies_priority_tier_check 
    CHECK (priority_tier IN ('P1', 'P2', 'P3', 'Unscored')),
  
  ADD CONSTRAINT companies_price_point_category_check 
    CHECK (price_point_category IS NULL OR price_point_category IN ('entry_level', 'move_up', 'premium', 'luxury')),
  
  ADD CONSTRAINT companies_service_area_type_check 
    CHECK (service_area_type IS NULL OR service_area_type IN ('local', 'metro', 'regional', 'multi_state')),
  
  ADD CONSTRAINT companies_annual_revenue_range_check 
    CHECK (annual_revenue_range IS NULL OR annual_revenue_range IN ('<$500K', '$500K-$999K', '$1M-$2.9M', '$3M-$5.9M', '$6M-$10M', '$10M+')),
  
  ADD CONSTRAINT companies_partner_relationship_status_check 
    CHECK (partner_relationship_status IS NULL OR partner_relationship_status IN ('Matched', 'Introduced', 'Active', 'Inactive')),
  
  ADD CONSTRAINT companies_state_check 
    CHECK (state IN (
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    )),
  
  ADD CONSTRAINT companies_lead_score_check 
    CHECK (lead_score >= 0 AND lead_score <= 100),
  
  ADD CONSTRAINT companies_maintenance_contract_percentage_check 
    CHECK (maintenance_contract_percentage IS NULL OR (maintenance_contract_percentage >= 0 AND maintenance_contract_percentage <= 100)),
  
  ADD CONSTRAINT companies_emergency_service_percentage_check 
    CHECK (emergency_service_percentage IS NULL OR (emergency_service_percentage >= 0 AND emergency_service_percentage <= 100)),
  
  ADD CONSTRAINT check_no_self_parent 
    CHECK (parent_company_id IS NULL OR parent_company_id != id);