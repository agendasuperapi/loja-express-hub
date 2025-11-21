-- Add allow_quantity column to product_addons table
ALTER TABLE product_addons
ADD COLUMN IF NOT EXISTS allow_quantity BOOLEAN DEFAULT FALSE;

-- Add comment to column
COMMENT ON COLUMN product_addons.allow_quantity IS 'Allows customers to select multiple quantities of this addon (e.g., 2x bacon, 3x cheese)';
