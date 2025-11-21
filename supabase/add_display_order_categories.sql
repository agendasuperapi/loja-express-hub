-- Add display_order column to product_categories table
ALTER TABLE public.product_categories 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Set default values based on name (alphabetical order for existing categories)
UPDATE public.product_categories 
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY name ASC) as row_num
  FROM public.product_categories
  WHERE display_order = 0 OR display_order IS NULL
) AS subquery
WHERE product_categories.id = subquery.id;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_product_categories_display_order ON public.product_categories(store_id, display_order);
