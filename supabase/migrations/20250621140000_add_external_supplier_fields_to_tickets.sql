-- Add external supplier costing fields to tickets
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS external_supplier_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS external_supplier_description TEXT,
ADD COLUMN IF NOT EXISTS external_supplier_cost NUMERIC(14,2);

