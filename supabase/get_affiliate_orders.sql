-- Função para buscar pedidos com comissões do afiliado
-- Suporta tanto o sistema novo (store_affiliates) quanto o legado (affiliates)
-- Usa DISTINCT ON para evitar duplicação de pedidos
-- v2: Prioriza registros com comissão > 0
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
  
  RETURN QUERY
  
  -- Usar DISTINCT ON para eliminar duplicatas por order_id
  -- Prioriza: 1) registros com comissão > 0, 2) sistema novo, 3) data mais recente
  SELECT DISTINCT ON (combined.order_id)
    combined.earning_id,
    combined.order_id,
    combined.order_number,
    combined.customer_name,
    combined.order_date,
    combined.store_id,
    combined.store_name,
    combined.store_affiliate_id,
    combined.order_total,
    combined.order_subtotal,
    combined.coupon_discount,
    combined.commission_amount,
    combined.commission_status,
    combined.coupon_code
  FROM (
    -- Sistema novo: via store_affiliates
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
      o.coupon_code::TEXT,
      1 as priority
    FROM affiliate_earnings ae
    JOIN store_affiliates sa ON sa.id = ae.store_affiliate_id
    JOIN orders o ON o.id = ae.order_id
    JOIN stores s ON s.id = o.store_id
    WHERE sa.affiliate_account_id = p_affiliate_account_id
    AND sa.is_active = true
    
    UNION ALL
    
    -- Sistema legado: via email do afiliado
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
      o.coupon_code::TEXT,
      2 as priority
    FROM affiliate_earnings ae
    JOIN affiliates a ON a.id = ae.affiliate_id
    JOIN orders o ON o.id = ae.order_id
    JOIN stores s ON s.id = o.store_id
    WHERE LOWER(a.email) = LOWER(v_email)
    AND a.is_active = true
    AND ae.store_affiliate_id IS NULL
    
    UNION ALL
    
    -- Sistema legado alternativo: via user_id
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
      o.coupon_code::TEXT,
      3 as priority
    FROM affiliate_earnings ae
    JOIN affiliates a ON a.id = ae.affiliate_id
    JOIN orders o ON o.id = ae.order_id
    JOIN stores s ON s.id = o.store_id
    JOIN auth.users u ON u.id = a.user_id
    WHERE LOWER(u.email) = LOWER(v_email)
    AND a.is_active = true
    AND ae.store_affiliate_id IS NULL
    AND a.user_id IS NOT NULL
    AND LOWER(a.email) != LOWER(v_email)
  ) combined
  -- IMPORTANTE: Prioriza registros com comissão > 0 antes da prioridade do sistema
  ORDER BY combined.order_id, 
           CASE WHEN combined.commission_amount > 0 THEN 0 ELSE 1 END ASC,
           combined.priority ASC, 
           combined.order_date DESC;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_affiliate_orders(UUID) TO anon, authenticated, service_role;
