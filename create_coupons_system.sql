-- Create enum for discount type
DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type discount_type NOT NULL,
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_value NUMERIC DEFAULT 0 CHECK (min_order_value >= 0),
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, code)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_coupons_store_code ON public.coupons(store_id, code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupons_store_active ON public.coupons(store_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Store owners can view their coupons" ON public.coupons;
DROP POLICY IF EXISTS "Store owners can insert their coupons" ON public.coupons;
DROP POLICY IF EXISTS "Store owners can update their coupons" ON public.coupons;
DROP POLICY IF EXISTS "Store owners can delete their coupons" ON public.coupons;
DROP POLICY IF EXISTS "Customers can validate active coupons" ON public.coupons;

-- Store owners can view their coupons
CREATE POLICY "Store owners can view their coupons"
  ON public.coupons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = coupons.store_id
      AND (stores.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Store owners can insert their coupons
CREATE POLICY "Store owners can insert their coupons"
  ON public.coupons
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = coupons.store_id
      AND (stores.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Store owners can update their coupons
CREATE POLICY "Store owners can update their coupons"
  ON public.coupons
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = coupons.store_id
      AND (stores.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Store owners can delete their coupons
CREATE POLICY "Store owners can delete their coupons"
  ON public.coupons
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = coupons.store_id
      AND (stores.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Customers can validate coupons (read-only for active coupons)
CREATE POLICY "Customers can validate active coupons"
  ON public.coupons
  FOR SELECT
  USING (
    is_active = true
    AND valid_from <= NOW()
    AND (valid_until IS NULL OR valid_until >= NOW())
  );

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add coupon tracking to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS coupon_code TEXT,
ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC DEFAULT 0;

-- Create function to validate and apply coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_store_id UUID,
  p_code TEXT,
  p_order_total NUMERIC
)
RETURNS TABLE (
  is_valid BOOLEAN,
  discount_type discount_type,
  discount_value NUMERIC,
  discount_amount NUMERIC,
  error_message TEXT
) AS $$
DECLARE
  v_coupon RECORD;
  v_discount_amount NUMERIC;
BEGIN
  -- Find the coupon
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE store_id = p_store_id
    AND UPPER(code) = UPPER(p_code)
    AND is_active = true
    AND valid_from <= NOW()
    AND (valid_until IS NULL OR valid_until >= NOW());

  -- Check if coupon exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::discount_type, NULL::NUMERIC, 0::NUMERIC, 'Cupom inválido ou expirado'::TEXT;
    RETURN;
  END IF;

  -- Check minimum order value
  IF p_order_total < v_coupon.min_order_value THEN
    RETURN QUERY SELECT 
      false, 
      NULL::discount_type, 
      NULL::NUMERIC, 
      0::NUMERIC, 
      'Valor mínimo do pedido não atingido: R$ ' || v_coupon.min_order_value::TEXT;
    RETURN;
  END IF;

  -- Check max uses
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN QUERY SELECT false, NULL::discount_type, NULL::NUMERIC, 0::NUMERIC, 'Cupom esgotado'::TEXT;
    RETURN;
  END IF;

  -- Calculate discount amount
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount_amount := (p_order_total * v_coupon.discount_value / 100);
    -- Ensure discount doesn't exceed 100%
    IF v_discount_amount > p_order_total THEN
      v_discount_amount := p_order_total;
    END IF;
  ELSE
    v_discount_amount := v_coupon.discount_value;
    -- Ensure discount doesn't exceed order total
    IF v_discount_amount > p_order_total THEN
      v_discount_amount := p_order_total;
    END IF;
  END IF;

  -- Return valid coupon with discount info
  RETURN QUERY SELECT 
    true, 
    v_coupon.discount_type, 
    v_coupon.discount_value, 
    v_discount_amount,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to increment coupon usage when order is created
CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.coupon_code IS NOT NULL THEN
    UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE store_id = NEW.store_id
      AND UPPER(code) = UPPER(NEW.coupon_code);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_increment_coupon_usage ON public.orders;
CREATE TRIGGER trigger_increment_coupon_usage
  AFTER INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.coupon_code IS NOT NULL)
  EXECUTE FUNCTION public.increment_coupon_usage();
