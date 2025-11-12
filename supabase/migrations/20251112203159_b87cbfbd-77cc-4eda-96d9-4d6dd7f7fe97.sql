-- Add is_active column to product_categories
ALTER TABLE product_categories
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(store_id, is_active);