-- Fix existing products that have sizes but has_sizes is false
UPDATE products
SET has_sizes = true
WHERE id IN (
  SELECT DISTINCT product_id 
  FROM product_sizes
)
AND (has_sizes IS NULL OR has_sizes = false);