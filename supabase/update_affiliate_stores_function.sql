-- Atualização da função get_affiliate_stores para incluir informações do cupom
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
  coupon_code TEXT,
  coupon_discount_type TEXT,
  coupon_discount_value NUMERIC,
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
    c.code as coupon_code,
    c.discount_type::TEXT as coupon_discount_type,
    c.discount_value as coupon_discount_value,
    COALESCE(SUM(ae.order_total), 0) as total_sales,
    COALESCE(SUM(ae.commission_amount), 0) as total_commission,
    COALESCE(SUM(CASE WHEN ae.status = 'pending' THEN ae.commission_amount ELSE 0 END), 0) as pending_commission
  FROM store_affiliates sa
  JOIN stores s ON s.id = sa.store_id
  LEFT JOIN coupons c ON c.id = sa.coupon_id
  LEFT JOIN affiliate_earnings ae ON ae.store_affiliate_id = sa.id
  WHERE sa.affiliate_account_id = p_affiliate_account_id
  AND sa.is_active = true
  GROUP BY sa.id, s.id, s.name, s.slug, s.logo_url, sa.default_commission_type, sa.default_commission_value, sa.status, c.code, c.discount_type, c.discount_value;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_affiliate_stores(UUID) TO anon, authenticated;
