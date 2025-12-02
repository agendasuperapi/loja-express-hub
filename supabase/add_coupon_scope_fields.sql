-- Add scope fields to coupons table for category/product filtering
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'all',
ADD COLUMN IF NOT EXISTS category_names text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS product_ids uuid[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.coupons.applies_to IS 'Scope of the coupon: all, category, or product';
COMMENT ON COLUMN public.coupons.category_names IS 'Array of category names the coupon applies to';
COMMENT ON COLUMN public.coupons.product_ids IS 'Array of product IDs the coupon applies to';
