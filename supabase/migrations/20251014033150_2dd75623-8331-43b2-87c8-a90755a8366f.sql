-- Create opportunities table
CREATE TABLE opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  opportunity_name text NOT NULL,
  stage text NOT NULL DEFAULT 'prospecting',
  amount numeric,
  probability integer CHECK (probability >= 0 AND probability <= 100),
  expected_close_date date,
  closed_date date,
  assigned_to uuid REFERENCES profiles(id),
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text
);

-- Enable RLS
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own opportunities"
  ON opportunities FOR SELECT
  USING (
    has_elevated_access(auth.uid()) OR 
    created_by = auth.uid() OR
    assigned_to = auth.uid()
  );

CREATE POLICY "Users can create opportunities for their companies"
  ON opportunities FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = opportunities.company_id 
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can update their opportunities"
  ON opportunities FOR UPDATE
  USING (
    has_elevated_access(auth.uid()) OR 
    created_by = auth.uid() OR
    assigned_to = auth.uid()
  );

CREATE POLICY "Admins can delete opportunities"
  ON opportunities FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create opportunity_products table for tracking products/quotes
CREATE TABLE opportunity_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  discount_percent integer DEFAULT 0,
  total_price numeric GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percent / 100.0)) STORED,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for opportunity_products
ALTER TABLE opportunity_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products for their opportunities"
  ON opportunity_products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = opportunity_products.opportunity_id
      AND (has_elevated_access(auth.uid()) OR o.created_by = auth.uid() OR o.assigned_to = auth.uid())
    )
  );

CREATE POLICY "Users can manage products for their opportunities"
  ON opportunity_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = opportunity_products.opportunity_id
      AND (has_elevated_access(auth.uid()) OR o.created_by = auth.uid() OR o.assigned_to = auth.uid())
    )
  );

-- Add opportunity_id to company_communications for tracking
ALTER TABLE company_communications 
ADD COLUMN opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_opportunities_company_id ON opportunities(company_id);
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_assigned_to ON opportunities(assigned_to);
CREATE INDEX idx_opportunity_products_opportunity_id ON opportunity_products(opportunity_id);
CREATE INDEX idx_company_communications_opportunity_id ON company_communications(opportunity_id);

-- Trigger for updated_at
CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();