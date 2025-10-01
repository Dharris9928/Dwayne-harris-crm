-- Populate scoring configuration for Builder and Contractor lead scoring

-- BUILDER: Annual Volume Ranges (max 15 points)
INSERT INTO scoring_configuration (field_name, range_value, score_points, industry_type, category, description) VALUES
('annual_volume_range', '1,000+', 15, 'Builder', 'Firmographic', 'Top tier - 1,000+ homes annually'),
('annual_volume_range', '500-999', 12, 'Builder', 'Firmographic', 'Large volume builder'),
('annual_volume_range', '250-499', 10, 'Builder', 'Firmographic', 'Mid-large volume builder'),
('annual_volume_range', '100-249', 8, 'Builder', 'Firmographic', 'Mid volume builder'),
('annual_volume_range', '50-99', 6, 'Builder', 'Firmographic', 'Growing builder'),
('annual_volume_range', '25-49', 4, 'Builder', 'Firmographic', 'Small-mid builder'),
('annual_volume_range', '10-24', 3, 'Builder', 'Firmographic', 'Small builder'),
('annual_volume_range', '5-9', 2, 'Builder', 'Firmographic', 'Boutique builder'),
('annual_volume_range', '1-4', 2, 'Builder', 'Firmographic', 'Very small builder');

-- BUILDER: Average Home Price Ranges (max 15 points)
INSERT INTO scoring_configuration (field_name, range_value, score_points, industry_type, category, description) VALUES
('average_home_price_range', '$3M+', 15, 'Builder', 'Firmographic', 'Ultra-luxury homes'),
('average_home_price_range', '$2M-$2.99M', 13, 'Builder', 'Firmographic', 'High luxury homes'),
('average_home_price_range', '$1M-$1.99M', 12, 'Builder', 'Firmographic', 'Luxury homes'),
('average_home_price_range', '$750K-$999K', 10, 'Builder', 'Firmographic', 'Premium homes'),
('average_home_price_range', '$500K-$749K', 8, 'Builder', 'Firmographic', 'Upper-mid homes'),
('average_home_price_range', '$350K-$499K', 6, 'Builder', 'Firmographic', 'Mid-market homes'),
('average_home_price_range', '$250K-$349K', 4, 'Builder', 'Firmographic', 'Entry-level homes'),
('average_home_price_range', '$150K-$249K', 3, 'Builder', 'Firmographic', 'Affordable homes'),
('average_home_price_range', '<$150K', 2, 'Builder', 'Firmographic', 'Budget homes');

-- CONTRACTOR: Annual Volume Ranges (max 12 points)
INSERT INTO scoring_configuration (field_name, range_value, score_points, industry_type, category, description) VALUES
('annual_volume_range', '10,000+', 12, 'Contractor', 'Firmographic', 'Very large contractor'),
('annual_volume_range', '5,000-9,999', 10, 'Contractor', 'Firmographic', 'Large contractor'),
('annual_volume_range', '2,500-4,999', 8, 'Contractor', 'Firmographic', 'Mid-large contractor'),
('annual_volume_range', '1,000-2,499', 6, 'Contractor', 'Firmographic', 'Mid-size contractor'),
('annual_volume_range', '500-999', 4, 'Contractor', 'Firmographic', 'Growing contractor'),
('annual_volume_range', '250-499', 3, 'Contractor', 'Firmographic', 'Small-mid contractor'),
('annual_volume_range', '100-249', 2, 'Contractor', 'Firmographic', 'Small contractor'),
('annual_volume_range', '<100', 1, 'Contractor', 'Firmographic', 'Very small contractor');

-- CONTRACTOR: Annual Revenue Ranges (max 12 points)
INSERT INTO scoring_configuration (field_name, range_value, score_points, industry_type, category, description) VALUES
('annual_revenue_range', '$50M+', 12, 'Contractor', 'Firmographic', 'Very large revenue'),
('annual_revenue_range', '$25M-$49M', 10, 'Contractor', 'Firmographic', 'Large revenue'),
('annual_revenue_range', '$10M-$24M', 8, 'Contractor', 'Firmographic', 'Mid-large revenue'),
('annual_revenue_range', '$5M-$9M', 6, 'Contractor', 'Firmographic', 'Mid revenue'),
('annual_revenue_range', '$2M-$4M', 4, 'Contractor', 'Firmographic', 'Small-mid revenue'),
('annual_revenue_range', '$1M-$1.9M', 3, 'Contractor', 'Firmographic', 'Small revenue'),
('annual_revenue_range', '<$1M', 2, 'Contractor', 'Firmographic', 'Very small revenue');

-- BOTH: Employee Ranges (max 10 points for Builder, 8 for Contractor)
INSERT INTO scoring_configuration (field_name, range_value, score_points, industry_type, category, description) VALUES
('total_employees_range', '500+', 10, 'Builder', 'Firmographic', 'Very large organization'),
('total_employees_range', '250-499', 8, 'Builder', 'Firmographic', 'Large organization'),
('total_employees_range', '100-249', 7, 'Builder', 'Firmographic', 'Mid-large organization'),
('total_employees_range', '50-99', 6, 'Builder', 'Firmographic', 'Mid-size organization'),
('total_employees_range', '25-49', 5, 'Builder', 'Firmographic', 'Growing organization'),
('total_employees_range', '10-24', 4, 'Builder', 'Firmographic', 'Small organization'),
('total_employees_range', '5-9', 3, 'Builder', 'Firmographic', 'Very small organization'),
('total_employees_range', '1-4', 2, 'Builder', 'Firmographic', 'Micro organization'),
('total_employees_range', '500+', 8, 'Contractor', 'Firmographic', 'Very large organization'),
('total_employees_range', '250-499', 7, 'Contractor', 'Firmographic', 'Large organization'),
('total_employees_range', '100-249', 6, 'Contractor', 'Firmographic', 'Mid-large organization'),
('total_employees_range', '50-99', 5, 'Contractor', 'Firmographic', 'Mid-size organization'),
('total_employees_range', '25-49', 4, 'Contractor', 'Firmographic', 'Growing organization'),
('total_employees_range', '10-24', 3, 'Contractor', 'Firmographic', 'Small organization'),
('total_employees_range', '5-9', 2, 'Contractor', 'Firmographic', 'Very small organization'),
('total_employees_range', '1-4', 1, 'Contractor', 'Firmographic', 'Micro organization');

-- BOTH: Years in Business Ranges (max 10 points for Builder, 8 for Contractor)
INSERT INTO scoring_configuration (field_name, range_value, score_points, industry_type, category, description) VALUES
('years_in_business_range', '30+', 10, 'Builder', 'Firmographic', 'Very established'),
('years_in_business_range', '20-29', 8, 'Builder', 'Firmographic', 'Well established'),
('years_in_business_range', '15-19', 7, 'Builder', 'Firmographic', 'Established'),
('years_in_business_range', '10-14', 6, 'Builder', 'Firmographic', 'Mature business'),
('years_in_business_range', '5-9', 4, 'Builder', 'Firmographic', 'Growing business'),
('years_in_business_range', '3-4', 3, 'Builder', 'Firmographic', 'Young business'),
('years_in_business_range', '0-2', 2, 'Builder', 'Firmographic', 'Startup'),
('years_in_business_range', '30+', 8, 'Contractor', 'Firmographic', 'Very established'),
('years_in_business_range', '20-29', 7, 'Contractor', 'Firmographic', 'Well established'),
('years_in_business_range', '15-19', 6, 'Contractor', 'Firmographic', 'Established'),
('years_in_business_range', '10-14', 5, 'Contractor', 'Firmographic', 'Mature business'),
('years_in_business_range', '5-9', 3, 'Contractor', 'Firmographic', 'Growing business'),
('years_in_business_range', '3-4', 2, 'Contractor', 'Firmographic', 'Young business'),
('years_in_business_range', '0-2', 1, 'Contractor', 'Firmographic', 'Startup');

-- BOTH: Website Quality (max 10 points)
INSERT INTO scoring_configuration (field_name, range_value, score_points, industry_type, category, description) VALUES
('website_quality', 'Professional', 10, 'Both', 'Digital Engagement', 'Modern, responsive, professional site'),
('website_quality', 'Good', 7, 'Both', 'Digital Engagement', 'Functional, decent design'),
('website_quality', 'Basic', 4, 'Both', 'Digital Engagement', 'Simple, outdated design'),
('website_quality', 'Poor', 2, 'Both', 'Digital Engagement', 'Very basic or broken'),
('website_quality', 'None', 0, 'Both', 'Digital Engagement', 'No website');

-- BOTH: LinkedIn Activity Level (max 10 points)
INSERT INTO scoring_configuration (field_name, range_value, score_points, industry_type, category, description) VALUES
('linkedin_activity_level', 'Very Active', 10, 'Both', 'Digital Engagement', 'Regular posts, engagement'),
('linkedin_activity_level', 'Active', 7, 'Both', 'Digital Engagement', 'Regular updates'),
('linkedin_activity_level', 'Moderate', 5, 'Both', 'Digital Engagement', 'Occasional activity'),
('linkedin_activity_level', 'Low', 2, 'Both', 'Digital Engagement', 'Minimal activity'),
('linkedin_activity_level', 'None', 0, 'Both', 'Digital Engagement', 'No activity');

-- BOTH: Technology Adoption Level (max 10 points)
INSERT INTO scoring_configuration (field_name, range_value, score_points, industry_type, category, description) VALUES
('technology_adoption_level', 'Early Adopter', 10, 'Both', 'Digital Engagement', 'Cutting-edge tech user'),
('technology_adoption_level', 'Progressive', 7, 'Both', 'Digital Engagement', 'Modern tech stack'),
('technology_adoption_level', 'Mainstream', 5, 'Both', 'Digital Engagement', 'Standard tech tools'),
('technology_adoption_level', 'Conservative', 3, 'Both', 'Digital Engagement', 'Traditional approach'),
('technology_adoption_level', 'Laggard', 1, 'Both', 'Digital Engagement', 'Resists new technology');

-- BOTH: Nest Installation Volume Ranges (bonus points)
INSERT INTO scoring_configuration (field_name, range_value, score_points, industry_type, category, description) VALUES
('nest_installation_volume_range', '500+', 10, 'Both', 'Digital Engagement', 'Very high Nest volume'),
('nest_installation_volume_range', '250-499', 8, 'Both', 'Digital Engagement', 'High Nest volume'),
('nest_installation_volume_range', '100-249', 6, 'Both', 'Digital Engagement', 'Medium Nest volume'),
('nest_installation_volume_range', '50-99', 4, 'Both', 'Digital Engagement', 'Growing Nest adoption'),
('nest_installation_volume_range', '25-49', 3, 'Both', 'Digital Engagement', 'Some Nest experience'),
('nest_installation_volume_range', '10-24', 2, 'Both', 'Digital Engagement', 'Limited Nest experience'),
('nest_installation_volume_range', '1-9', 1, 'Both', 'Digital Engagement', 'Minimal Nest experience'),
('nest_installation_volume_range', 'None', 0, 'Both', 'Digital Engagement', 'No Nest installations');