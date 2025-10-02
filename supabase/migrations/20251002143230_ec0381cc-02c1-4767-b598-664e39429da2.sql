-- ==================================================
-- FIX CONTRACTOR REVENUE SCORING CONFIGURATION
-- ==================================================

BEGIN;

-- Delete old/incorrect revenue scoring entries
DELETE FROM scoring_configuration 
WHERE field_name = 'annual_revenue_range' 
AND industry_type = 'Contractor';

-- Insert correct revenue scoring configuration
INSERT INTO scoring_configuration (field_name, industry_type, range_value, score_points, category, description) VALUES
('annual_revenue_range', 'Contractor', '$50M+', 12, 'revenue', 'Very large contractor - highest revenue'),
('annual_revenue_range', 'Contractor', '$25M-$49M', 11, 'revenue', 'Large contractor'),
('annual_revenue_range', 'Contractor', '$10M-$24M', 10, 'revenue', 'Large contractor'),
('annual_revenue_range', 'Contractor', '$5M-$9M', 8, 'revenue', 'Medium-large contractor'),
('annual_revenue_range', 'Contractor', '$2M-$4M', 6, 'revenue', 'Medium contractor'),
('annual_revenue_range', 'Contractor', '$1M-$1.9M', 4, 'revenue', 'Small-medium contractor'),
('annual_revenue_range', 'Contractor', '<$1M', 2, 'revenue', 'Small contractor');

-- Also add Builder revenue scoring for consistency (if not already present)
DELETE FROM scoring_configuration 
WHERE field_name = 'annual_revenue_range' 
AND industry_type = 'Builder';

INSERT INTO scoring_configuration (field_name, industry_type, range_value, score_points, category, description) VALUES
('annual_revenue_range', 'Builder', '$100M+', 12, 'revenue', 'Major national builder'),
('annual_revenue_range', 'Builder', '$50M-$99M', 11, 'revenue', 'Large production builder'),
('annual_revenue_range', 'Builder', '$25M-$49M', 10, 'revenue', 'Large regional builder'),
('annual_revenue_range', 'Builder', '$10M-$24M', 8, 'revenue', 'Regional builder'),
('annual_revenue_range', 'Builder', '$5M-$9M', 6, 'revenue', 'Small-medium builder'),
('annual_revenue_range', 'Builder', '$2M-$4M', 4, 'revenue', 'Small builder'),
('annual_revenue_range', 'Builder', '<$2M', 2, 'revenue', 'Very small builder');

COMMIT;