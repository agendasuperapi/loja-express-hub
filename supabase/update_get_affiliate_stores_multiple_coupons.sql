-- Update get_affiliate_stores function to return multiple coupons as JSONB array with scope info
CREATE OR REPLACE FUNCTION public.get_affiliate_stores(p_affiliate_account_id UUID)
RETURNS TABLE (
  store_affiliate_id UUID,
  store_id UUID,
  store_name TEXT,
  store_slug TEXT,
  store_logo TEXT,
  commission_type TEXT,
  commission_value NUMERIC,
  status TEXT,
  -- Legacy single coupon fields (for backwards compatibility)
  coupon_code TEXT,
  coupon_discount_type TEXT,
  coupon_discount_value NUMERIC,
  -- New: array of all coupons
  coupons JSONB,
  total_sales NUMERIC,
  total_commission NUMERIC,
  pending_commission NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id as store_affiliate_id,
    s.id as store_id,
    s.name as store_name,
    s.slug as store_slug,
    s.logo_url as store_logo,
    sa.default_commission_type as commission_type,
    sa.default_commission_value as commission_value,
    sa.status,
    -- Legacy: first coupon (from junction table or legacy field)
    COALESCE(
      (SELECT c.code FROM store_affiliate_coupons sac 
       JOIN coupons c ON c.id = sac.coupon_id 
       WHERE sac.store_affiliate_id = sa.id 
       LIMIT 1),
      legacy_c.code
    ) as coupon_code,
    COALESCE(
      (SELECT c.discount_type::TEXT FROM store_affiliate_coupons sac 
       JOIN coupons c ON c.id = sac.coupon_id 
       WHERE sac.store_affiliate_id = sa.id 
       LIMIT 1),
      legacy_c.discount_type::TEXT
    ) as coupon_discount_type,
    COALESCE(
      (SELECT c.discount_value FROM store_affiliate_coupons sac 
       JOIN coupons c ON c.id = sac.coupon_id 
       WHERE sac.store_affiliate_id = sa.id 
       LIMIT 1),
      legacy_c.discount_value
    ) as coupon_discount_value,
    -- New: all coupons as JSONB array with scope info
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'code', c.code,
          'discount_type', c.discount_type::TEXT,
          'discount_value', c.discount_value,
          'applies_to', c.applies_to,
          'category_names', c.category_names,
          'product_ids', c.product_ids
        ))
        FROM store_affiliate_coupons sac
        JOIN coupons c ON c.id = sac.coupon_id
        WHERE sac.store_affiliate_id = sa.id
      ),
      -- Fallback to legacy coupon_id if no junction table entries
      CASE 
        WHEN legacy_c.id IS NOT NULL THEN 
          jsonb_build_array(jsonb_build_object(
            'code', legacy_c.code,
            'discount_type', legacy_c.discount_type::TEXT,
            'discount_value', legacy_c.discount_value,
            'applies_to', legacy_c.applies_to,
            'category_names', legacy_c.category_names,
            'product_ids', legacy_c.product_ids
          ))
        ELSE NULL
      END
    ) as coupons,
    COALESCE(SUM(ae.order_total), 0) as total_sales,
    COALESCE(SUM(ae.commission_amount), 0) as total_commission,
    COALESCE(SUM(CASE WHEN ae.status = 'pending' THEN ae.commission_amount ELSE 0 END), 0) as pending_commission
  FROM store_affiliates sa
  JOIN stores s ON s.id = sa.store_id
  LEFT JOIN coupons legacy_c ON legacy_c.id = sa.coupon_id
  LEFT JOIN affiliate_earnings ae ON ae.store_affiliate_id = sa.id
  WHERE sa.affiliate_account_id = p_affiliate_account_id
  AND sa.is_active = true
  GROUP BY sa.id, s.id, s.name, s.slug, s.logo_url, sa.default_commission_type, sa.default_commission_value, sa.status, legacy_c.id, legacy_c.code, legacy_c.discount_type, legacy_c.discount_value, legacy_c.applies_to, legacy_c.category_names, legacy_c.product_ids;
END;
$$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.get_affiliate_stores(UUID) TO anon, authenticated, service_role;
