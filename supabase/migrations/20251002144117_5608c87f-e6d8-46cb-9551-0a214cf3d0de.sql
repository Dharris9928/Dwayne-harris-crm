-- ==================================================
-- MIGRATE OLD REVENUE RANGES TO NEW RANGES
-- ==================================================

-- Migrate Contractor revenue ranges
UPDATE Companies
SET annual_revenue_range = CASE
  WHEN annual_revenue_range = '$10M+' THEN '$10M-$24M'
  WHEN annual_revenue_range = '$6M-$10M' THEN '$5M-$9M'
  WHEN annual_revenue_range = '$3M-$5.9M' THEN '$2M-$4M'
  WHEN annual_revenue_range = '$1M-$2.9M' THEN '$1M-$1.9M'
  WHEN annual_revenue_range = '$500K-$999K' THEN '<$1M'
  WHEN annual_revenue_range = '<$500K' THEN '<$1M'
  ELSE annual_revenue_range
END
WHERE industry_type = 'Contractor'
AND annual_revenue_range IN ('$10M+', '$6M-$10M', '$3M-$5.9M', '$1M-$2.9M', '$500K-$999K', '<$500K');