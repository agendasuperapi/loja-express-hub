-- Função para buscar pedidos com comissões do afiliado
CREATE OR REPLACE FUNCTION public.get_affiliate_orders(p_affiliate_account_id UUID)
RETURNS TABLE (
  earning_id UUID,
  order_id UUID,
  order_number TEXT,
  customer_name TEXT,
  order_date TIMESTAMPTZ,
  store_id UUID,
  store_name TEXT,
  store_affiliate_id UUID,
  order_total NUMERIC,
  commission_amount NUMERIC,
  commission_status TEXT,
  coupon_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ae.id as earning_id,
    ae.order_id,
    o.order_number::TEXT,
    o.customer_name::TEXT,
    o.created_at as order_date,
    o.store_id,
    s.name::TEXT as store_name,
    ae.store_affiliate_id,
    ae.order_total,
    ae.commission_amount,
    ae.status::TEXT as commission_status,
    o.coupon_code::TEXT
  FROM affiliate_earnings ae
  JOIN store_affiliates sa ON sa.id = ae.store_affiliate_id
  JOIN orders o ON o.id = ae.order_id
  JOIN stores s ON s.id = o.store_id
  WHERE sa.affiliate_account_id = p_affiliate_account_id
  AND sa.is_active = true
  ORDER BY o.created_at DESC;
END;
$$;
