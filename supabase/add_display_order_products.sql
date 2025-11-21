-- Add display_order column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Set default values based on creation date (older products first)
UPDATE public.products 
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY created_at ASC) as row_num
  FROM public.products
  WHERE display_order = 0 OR display_order IS NULL
) AS subquery
WHERE products.id = subquery.id;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_products_display_order ON public.products(store_id, display_order);
