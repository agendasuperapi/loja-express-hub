-- Add display_order column to product_flavors table
ALTER TABLE product_flavors ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Update existing records to have sequential display_order based on created_at
WITH ranked_flavors AS (
  SELECT 
    id, 
    ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY created_at) - 1 AS new_order
  FROM product_flavors
)
UPDATE product_flavors
SET display_order = ranked_flavors.new_order
FROM ranked_flavors
WHERE product_flavors.id = ranked_flavors.id;
