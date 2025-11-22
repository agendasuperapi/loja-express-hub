-- Add product_layout_template column to stores table
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS product_layout_template TEXT DEFAULT 'template-4';

-- Add comment explaining the column
COMMENT ON COLUMN stores.product_layout_template IS 'Layout template for product display on storefront. Options: template-2, template-3, template-4, template-6, template-list';
