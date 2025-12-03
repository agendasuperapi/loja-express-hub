-- Função para buscar itens de um pedido com detalhes de comissão do afiliado
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
BEGIN
  -- Buscar configuração padrão de comissão do afiliado
  SELECT 
    sa.default_commission_type,
    sa.default_commission_value
  INTO v_commission_type, v_commission_value
  FROM store_affiliates sa
  WHERE sa.id = p_store_affiliate_id;

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
    'geral'::TEXT as commission_source,
    v_commission_value as commission_value,
    CASE 
      WHEN v_commission_type = 'percentage' THEN 
        ROUND((oi.subtotal * v_commission_value / 100), 2)
      ELSE 
        ROUND((v_commission_value / (SELECT COUNT(*) FROM order_items WHERE order_id = p_order_id)), 2)
    END as item_commission
  FROM order_items oi
  LEFT JOIN products p ON p.id = oi.product_id
  WHERE oi.order_id = p_order_id
  AND oi.deleted_at IS NULL
  ORDER BY oi.created_at;
END;
$$;
