-- Add use_default_commission field to affiliates table
-- This controls whether products without specific rules use the default commission

ALTER TABLE public.affiliates 
ADD COLUMN IF NOT EXISTS use_default_commission boolean NOT NULL DEFAULT true;

-- Add comment explaining the field
COMMENT ON COLUMN public.affiliates.use_default_commission IS 'When true, products without specific commission rules will use default_commission_type and default_commission_value';

-- Also add to store_affiliates for sync
ALTER TABLE public.store_affiliates 
ADD COLUMN IF NOT EXISTS use_default_commission boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.store_affiliates.use_default_commission IS 'When true, products without specific commission rules will use default_commission_type and default_commission_value';
