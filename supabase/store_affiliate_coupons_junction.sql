-- Create junction table for store_affiliate-coupon relationship (many-to-many)
-- This allows affiliates to have multiple coupons per store
CREATE TABLE IF NOT EXISTS public.store_affiliate_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_affiliate_id UUID NOT NULL REFERENCES public.store_affiliates(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_affiliate_id, coupon_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_store_affiliate_coupons_sa ON public.store_affiliate_coupons(store_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_store_affiliate_coupons_coupon ON public.store_affiliate_coupons(coupon_id);

-- Enable RLS
ALTER TABLE public.store_affiliate_coupons ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Store owners can manage store affiliate coupons"
  ON public.store_affiliate_coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.store_affiliates sa
      JOIN public.stores s ON sa.store_id = s.id
      WHERE sa.id = store_affiliate_coupons.store_affiliate_id
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Affiliates can view their own store coupons"
  ON public.store_affiliate_coupons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.store_affiliates sa
      WHERE sa.id = store_affiliate_coupons.store_affiliate_id
      -- Allow via service role for edge functions
    )
  );

-- Grant permissions for service role
GRANT ALL ON public.store_affiliate_coupons TO service_role;
GRANT SELECT ON public.store_affiliate_coupons TO anon, authenticated;
