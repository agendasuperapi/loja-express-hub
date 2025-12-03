-- Função para buscar itens de um pedido com detalhes de comissão do afiliado
-- Busca a comissão registrada no momento do pedido (affiliate_earnings) ao invés da configuração atual
CREATE OR REPLACE FUNCTION public.get_affiliate_order_items(
  p_order_id UUID,
  p_store_affiliate_id UUID
)
RETURNS TABLE (
  item_id UUID,
  product_id UUID,
  product_name TEXT,
  product_category TEXT,
  quantity INT,
  unit_price NUMERIC,
  subtotal NUMERIC,
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
  v_order_total NUMERIC;
BEGIN
  -- Buscar comissão do momento do pedido (não a configuração atual!)
  SELECT 
    ae.commission_type,
    ae.commission_value,
    ae.commission_amount,
    ae.order_total
  INTO v_commission_type, v_commission_value, v_total_commission, v_order_total
  FROM affiliate_earnings ae
  WHERE ae.order_id = p_order_id
  AND ae.store_affiliate_id = p_store_affiliate_id;

  -- Se não encontrou earning, usar valores padrão
  IF v_commission_type IS NULL THEN
    v_commission_type := 'percentage';
    v_commission_value := 0;
    v_total_commission := 0;
    v_order_total := 0;
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
    v_commission_type::TEXT as commission_type,
    'pedido'::TEXT as commission_source,
    v_commission_value as commission_value,
    -- Distribuir a comissão total proporcionalmente ao subtotal do item
    CASE 
      WHEN v_order_total > 0 THEN 
        ROUND((oi.subtotal / v_order_total) * v_total_commission, 2)
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
