-- Script de migração retroativa para preencher affiliate_item_earnings
-- Para pedidos antigos que têm comissão em affiliate_earnings mas não têm detalhes por item
-- Execute este script no SQL Editor do Supabase

-- 1. Primeiro, verificar quantos registros serão criados
SELECT 
  COUNT(DISTINCT ae.id) as earnings_sem_itens,
  SUM(ae.commission_amount) as total_comissao_afetada
FROM affiliate_earnings ae
WHERE ae.commission_amount > 0
AND NOT EXISTS (
  SELECT 1 FROM affiliate_item_earnings aie WHERE aie.earning_id = ae.id
);

-- 2. Inserir registros proporcionais para cada item dos pedidos antigos
INSERT INTO affiliate_item_earnings (
  earning_id,
  order_item_id,
  product_id,
  product_name,
  product_category,
  item_subtotal,
  item_discount,
  item_value_with_discount,
  is_coupon_eligible,
  coupon_scope,
  commission_type,
  commission_value,
  commission_amount
)
SELECT 
  ae.id as earning_id,
  oi.id as order_item_id,
  oi.product_id,
  oi.product_name,
  COALESCE(p.category, 'Sem categoria') as product_category,
  oi.subtotal as item_subtotal,
  -- Desconto proporcional
  ROUND((oi.subtotal / NULLIF(o.subtotal, 0)) * COALESCE(o.coupon_discount, 0), 2) as item_discount,
  -- Valor com desconto
  ROUND(oi.subtotal - ((oi.subtotal / NULLIF(o.subtotal, 0)) * COALESCE(o.coupon_discount, 0)), 2) as item_value_with_discount,
  true as is_coupon_eligible,
  'all' as coupon_scope,
  ae.commission_type,
  ae.commission_value,
  -- Comissão proporcional baseada no subtotal do item
  ROUND((oi.subtotal / NULLIF(o.subtotal, 0)) * ae.commission_amount, 2) as commission_amount
FROM affiliate_earnings ae
JOIN orders o ON o.id = ae.order_id
JOIN order_items oi ON oi.order_id = o.id AND oi.deleted_at IS NULL
LEFT JOIN products p ON p.id = oi.product_id
WHERE ae.commission_amount > 0
AND NOT EXISTS (
  SELECT 1 FROM affiliate_item_earnings aie WHERE aie.earning_id = ae.id
);

-- 3. Verificar resultado
SELECT 
  ae.id as earning_id,
  o.order_number,
  ae.commission_amount as total_comissao,
  COUNT(aie.id) as qtd_itens,
  SUM(aie.commission_amount) as soma_comissoes_itens
FROM affiliate_earnings ae
JOIN orders o ON o.id = ae.order_id
LEFT JOIN affiliate_item_earnings aie ON aie.earning_id = ae.id
WHERE ae.commission_amount > 0
GROUP BY ae.id, o.order_number, ae.commission_amount
ORDER BY ae.created_at DESC
LIMIT 20;
