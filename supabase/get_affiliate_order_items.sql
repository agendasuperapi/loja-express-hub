-- Função para buscar itens de um pedido com detalhes de comissão do afiliado
-- ATUALIZADO: Calcula comissão sobre o valor COM DESCONTO do cupom
-- Distribui o desconto proporcionalmente entre os itens

-- Dropar função existente para alterar tipo de retorno
DROP FUNCTION IF EXISTS public.get_affiliate_order_items(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_affiliate_order_items(
  p_order_id UUID,
  p_store_affiliate_id UUID DEFAULT NULL
)
RETURNS TABLE (
  item_id UUID,
  product_id UUID,
  product_name TEXT,
  product_category TEXT,
  quantity INT,
  unit_price NUMERIC,
  subtotal NUMERIC,
  item_discount NUMERIC,
  item_value_with_discount NUMERIC,
  commission_type TEXT,
  commission_source TEXT,
  commission_value NUMERIC,
  item_commission NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_commission_type TEXT;
  v_commission_value NUMERIC;
  v_total_commission NUMERIC;
  v_order_subtotal NUMERIC;
  v_coupon_discount NUMERIC;
  v_valor_base NUMERIC;
BEGIN
  -- Buscar subtotal e desconto do pedido
  SELECT o.subtotal, COALESCE(o.coupon_discount, 0) 
  INTO v_order_subtotal, v_coupon_discount
  FROM orders o
  WHERE o.id = p_order_id;

  -- Calcular valor base (com desconto)
  v_valor_base := COALESCE(v_order_subtotal, 0) - v_coupon_discount;

  -- Buscar comissão do momento do pedido
  IF p_store_affiliate_id IS NOT NULL THEN
    -- Busca específica por store_affiliate_id
    SELECT 
      ae.commission_type,
      ae.commission_value,
      ae.commission_amount
    INTO v_commission_type, v_commission_value, v_total_commission
    FROM affiliate_earnings ae
    WHERE ae.order_id = p_order_id
    AND ae.store_affiliate_id = p_store_affiliate_id;
  ELSE
    -- Fallback: busca qualquer registro de comissão para este pedido
    -- Primeiro tenta por store_affiliate_id IS NULL, depois pega qualquer um
    SELECT 
      ae.commission_type,
      ae.commission_value,
      ae.commission_amount
    INTO v_commission_type, v_commission_value, v_total_commission
    FROM affiliate_earnings ae
    WHERE ae.order_id = p_order_id
    ORDER BY (ae.store_affiliate_id IS NULL) DESC -- Prioriza registros legados
    LIMIT 1;
  END IF;

  -- Se não encontrou earning, usar valores padrão
  IF v_commission_type IS NULL THEN
    v_commission_type := 'percentage';
    v_commission_value := 0;
    v_total_commission := 0;
  END IF;

  -- Se não encontrou subtotal, usar 1 para evitar divisão por zero
  IF v_order_subtotal IS NULL OR v_order_subtotal = 0 THEN
    v_order_subtotal := 1;
  END IF;

  RETURN QUERY
  SELECT 
    oi.id as item_id,
    oi.product_id,
    oi.product_name::TEXT,
    COALESCE(p.category, 'Sem categoria')::TEXT as product_category,
    oi.quantity::INT,
    oi.unit_price,
    oi.subtotal,
    -- Desconto proporcional do item: (item.subtotal / order_subtotal) * coupon_discount
    ROUND((oi.subtotal / v_order_subtotal) * v_coupon_discount, 2) as item_discount,
    -- Valor do item com desconto
    ROUND(oi.subtotal - ((oi.subtotal / v_order_subtotal) * v_coupon_discount), 2) as item_value_with_discount,
    v_commission_type::TEXT as commission_type,
    'pedido'::TEXT as commission_source,
    v_commission_value as commission_value,
    -- Distribuir a comissão total proporcionalmente usando valor com desconto
    CASE 
      WHEN v_valor_base > 0 THEN 
        ROUND((ROUND(oi.subtotal - ((oi.subtotal / v_order_subtotal) * v_coupon_discount), 2) / v_valor_base) * v_total_commission, 2)
      ELSE 
        0
    END as item_commission
  FROM order_items oi
  LEFT JOIN products p ON p.id = oi.product_id
  WHERE oi.order_id = p_order_id
  AND oi.deleted_at IS NULL
  ORDER BY oi.created_at;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_affiliate_order_items(UUID, UUID) TO anon, authenticated, service_role;
