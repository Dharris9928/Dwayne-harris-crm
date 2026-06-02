-- ==================================================
-- FINAL MIGRATION - Complete conversion properly
-- ==================================================

-- STEP 1: Drop the revenue range constraint first
ALTER TABLE companies 
  DROP CONSTRAINT IF EXISTS companies_annual_revenue_range_check;

-- STEP 2: Convert the ENUM column to VARCHAR
ALTER TABLE companies 
  ALTER COLUMN annual_revenue_range TYPE VARCHAR(50) USING annual_revenue_range::text;

-- STEP 3: Drop ENUM types
DROP TYPE IF EXISTS revenue_range CASCADE;
DROP TYPE IF EXISTS industry_type CASCADE;
DROP TYPE IF EXISTS company_status CASCADE;
DROP TYPE IF EXISTS priority_tier CASCADE;

-- STEP 4: Drop all remaining old constraints
ALTER TABLE companies 
  DROP CONSTRAINT IF EXISTS companies_industry_type_check,
  DROP CONSTRAINT IF EXISTS companies_segment_check,
  DROP CONSTRAINT IF EXISTS companies_segment_valid,
  DROP CONSTRAINT IF EXISTS companies_segment_confidence_check,
  DROP CONSTRAINT IF EXISTS companies_status_check,
  DROP CONSTRAINT IF EXISTS companies_company_type_check,
  DROP CONSTRAINT IF EXISTS companies_priority_tier_check,
  DROP CONSTRAINT IF EXISTS companies_price_point_category_check,
  DROP CONSTRAINT IF EXISTS companies_service_area_type_check,
  DROP CONSTRAINT IF EXISTS companies_partner_relationship_status_check,
  DROP CONSTRAINT IF EXISTS companies_state_check,
  DROP CONSTRAINT IF EXISTS companies_lead_score_check,
  DROP CONSTRAINT IF EXISTS companies_maintenance_contract_percentage_check,
  DROP CONSTRAINT IF EXISTS companies_emergency_service_percentage_check,
  DROP CONSTRAINT IF EXISTS check_no_self_parent;

-- STEP 5: Add all new CHECK constraints
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