-- Create junction table for affiliate-coupon relationship (many-to-many)
CREATE TABLE IF NOT EXISTS public.affiliate_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(affiliate_id, coupon_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_coupons_affiliate ON public.affiliate_coupons(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_coupons_coupon ON public.affiliate_coupons(coupon_id);

-- Enable RLS
ALTER TABLE public.affiliate_coupons ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Store owners can manage their affiliate coupons"
  ON public.affiliate_coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates a
      JOIN public.stores s ON a.store_id = s.id
      WHERE a.id = affiliate_coupons.affiliate_id
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Affiliates can view their own coupons"
  ON public.affiliate_coupons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates a
      WHERE a.id = affiliate_coupons.affiliate_id
      AND a.user_id = auth.uid()
    )
  );
