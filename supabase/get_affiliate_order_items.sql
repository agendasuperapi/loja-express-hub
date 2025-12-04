-- Função para buscar itens de um pedido com detalhes de comissão do afiliado
-- ATUALIZADO v3: Fallback melhorado para sempre calcular comissão proporcional corretamente
-- Garante que itens mostrem comissão mesmo quando affiliate_item_earnings não existe

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
  is_coupon_eligible BOOLEAN,
  coupon_scope TEXT,
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
  v_earning_id UUID;
  v_has_item_earnings BOOLEAN;
  v_commission_type TEXT;
  v_commission_value NUMERIC;
  v_total_commission NUMERIC;
  v_order_subtotal NUMERIC;
  v_coupon_discount NUMERIC;
  v_valor_base NUMERIC;
  v_items_count INT;
BEGIN
  -- Buscar earning_id do pedido
  IF p_store_affiliate_id IS NOT NULL THEN
    SELECT ae.id, ae.commission_type, ae.commission_value, ae.commission_amount
    INTO v_earning_id, v_commission_type, v_commission_value, v_total_commission
    FROM affiliate_earnings ae
    WHERE ae.order_id = p_order_id
    AND ae.store_affiliate_id = p_store_affiliate_id;
  ELSE
    SELECT ae.id, ae.commission_type, ae.commission_value, ae.commission_amount
    INTO v_earning_id, v_commission_type, v_commission_value, v_total_commission
    FROM affiliate_earnings ae
    WHERE ae.order_id = p_order_id
    ORDER BY (ae.store_affiliate_id IS NULL) DESC
    LIMIT 1;
  END IF;

  -- Se não encontrou earning, retornar vazio
  IF v_earning_id IS NULL THEN
    RETURN;
  END IF;

  -- Verificar se existem registros em affiliate_item_earnings com comissão > 0
  SELECT EXISTS(
    SELECT 1 FROM affiliate_item_earnings 
    WHERE earning_id = v_earning_id 
    AND commission_amount > 0
  ) INTO v_has_item_earnings;

  -- Se há registros detalhados COM comissão, usar eles
  IF v_has_item_earnings THEN
    RETURN QUERY
    SELECT 
      aie.order_item_id as item_id,
      aie.product_id,
      aie.product_name::TEXT,
      COALESCE(aie.product_category, 'Sem categoria')::TEXT as product_category,
      oi.quantity::INT,
      oi.unit_price,
      aie.item_subtotal as subtotal,
      aie.item_discount,
      aie.item_value_with_discount,
      aie.is_coupon_eligible,
      aie.coupon_scope::TEXT,
      aie.commission_type::TEXT,
      CASE 
        WHEN aie.is_coupon_eligible THEN 'com_desconto'
        ELSE 'sem_desconto'
      END::TEXT as commission_source,
      aie.commission_value,
      aie.commission_amount as item_commission
    FROM affiliate_item_earnings aie
    JOIN order_items oi ON oi.id = aie.order_item_id
    WHERE aie.earning_id = v_earning_id
    ORDER BY oi.created_at;
  ELSE
    -- Fallback: Cálculo proporcional para pedidos antigos ou sem item_earnings
    -- Buscar subtotal e desconto do pedido
    SELECT o.subtotal, COALESCE(o.coupon_discount, 0) 
    INTO v_order_subtotal, v_coupon_discount
    FROM orders o
    WHERE o.id = p_order_id;

    -- Contar itens do pedido
    SELECT COUNT(*) INTO v_items_count
    FROM order_items oi
    WHERE oi.order_id = p_order_id
    AND oi.deleted_at IS NULL;

    -- Garantir valores válidos
    IF v_order_subtotal IS NULL OR v_order_subtotal <= 0 THEN
      v_order_subtotal := 1;
    END IF;

    v_valor_base := v_order_subtotal - v_coupon_discount;
    
    IF v_valor_base <= 0 THEN
      v_valor_base := v_order_subtotal; -- Usar subtotal se valor base for 0
    END IF;

    IF v_commission_type IS NULL THEN
      v_commission_type := 'percentage';
      v_commission_value := 0;
    END IF;

    IF v_total_commission IS NULL THEN
      v_total_commission := 0;
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
      -- Desconto proporcional do item
      ROUND((oi.subtotal / v_order_subtotal) * v_coupon_discount, 2) as item_discount,
      -- Valor com desconto
      ROUND(oi.subtotal - ((oi.subtotal / v_order_subtotal) * v_coupon_discount), 2) as item_value_with_discount,
      true as is_coupon_eligible,
      'all'::TEXT as coupon_scope,
      v_commission_type::TEXT as commission_type,
      'proporcional'::TEXT as commission_source,
      v_commission_value as commission_value,
      -- IMPORTANTE: Distribuir comissão total proporcionalmente pelo subtotal de cada item
      CASE 
        WHEN v_total_commission > 0 AND v_order_subtotal > 0 THEN 
          ROUND((oi.subtotal / v_order_subtotal) * v_total_commission, 2)
        ELSE 
          0
      END as item_commission
    FROM order_items oi
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
    AND oi.deleted_at IS NULL
    ORDER BY oi.created_at;
  END IF;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_affiliate_order_items(UUID, UUID) TO anon, authenticated, service_role;
