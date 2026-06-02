-- Add missing columns to Companies table
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS annual_volume INTEGER,
  ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS state VARCHAR(2),
  ADD COLUMN IF NOT EXISTS zip VARCHAR(10),
  ADD COLUMN IF NOT EXISTS primary_email VARCHAR(255);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_state ON companies(state);
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_annual_volume ON companies(annual_volume);
CREATE INDEX IF NOT EXISTS idx_companies_revenue_range ON companies(annual_revenue_range);