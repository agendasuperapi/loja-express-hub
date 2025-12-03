-- Função para buscar pedidos com comissões do afiliado
-- Suporta tanto o sistema novo (store_affiliates) quanto o legado (affiliates)
DROP FUNCTION IF EXISTS public.get_affiliate_orders(UUID);

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
  order_subtotal NUMERIC,
  coupon_discount NUMERIC,
  commission_amount NUMERIC,
  commission_status TEXT,
  coupon_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Buscar email do affiliate_account para usar nas queries
  SELECT email INTO v_email FROM affiliate_accounts WHERE id = p_affiliate_account_id;
  
  RAISE NOTICE '[get_affiliate_orders] affiliate_account_id: %, email: %', p_affiliate_account_id, v_email;

  RETURN QUERY
  
  -- Sistema novo: via store_affiliates (store_affiliate_id preenchido)
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
    o.subtotal as order_subtotal,
    COALESCE(o.coupon_discount, 0::NUMERIC) as coupon_discount,
    ae.commission_amount,
    ae.status::TEXT as commission_status,
    o.coupon_code::TEXT
  FROM affiliate_earnings ae
  JOIN store_affiliates sa ON sa.id = ae.store_affiliate_id
  JOIN orders o ON o.id = ae.order_id
  JOIN stores s ON s.id = o.store_id
  WHERE sa.affiliate_account_id = p_affiliate_account_id
  AND sa.is_active = true
  
  UNION ALL
  
  -- Sistema legado: via email do afiliado (compara affiliate.email com affiliate_account.email)
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
    o.subtotal as order_subtotal,
    COALESCE(o.coupon_discount, 0::NUMERIC) as coupon_discount,
    ae.commission_amount,
    ae.status::TEXT as commission_status,
    o.coupon_code::TEXT
  FROM affiliate_earnings ae
  JOIN affiliates a ON a.id = ae.affiliate_id
  JOIN orders o ON o.id = ae.order_id
  JOIN stores s ON s.id = o.store_id
  WHERE LOWER(a.email) = LOWER(v_email)
  AND a.is_active = true
  AND ae.store_affiliate_id IS NULL  -- Apenas os que NÃO estão no sistema novo
  
  UNION ALL
  
  -- Sistema legado alternativo: via user_id (para afiliados vinculados a auth.users)
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
    o.subtotal as order_subtotal,
    COALESCE(o.coupon_discount, 0::NUMERIC) as coupon_discount,
    ae.commission_amount,
    ae.status::TEXT as commission_status,
    o.coupon_code::TEXT
  FROM affiliate_earnings ae
  JOIN affiliates a ON a.id = ae.affiliate_id
  JOIN orders o ON o.id = ae.order_id
  JOIN stores s ON s.id = o.store_id
  JOIN auth.users u ON u.id = a.user_id
  WHERE LOWER(u.email) = LOWER(v_email)
  AND a.is_active = true
  AND ae.store_affiliate_id IS NULL
  AND a.user_id IS NOT NULL
  -- Evitar duplicatas com a query anterior
  AND NOT EXISTS (
    SELECT 1 FROM affiliates a2 
    WHERE LOWER(a2.email) = LOWER(v_email) 
    AND a2.id = a.id
  )
  
  ORDER BY order_date DESC;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_affiliate_orders(UUID) TO anon, authenticated, service_role;
