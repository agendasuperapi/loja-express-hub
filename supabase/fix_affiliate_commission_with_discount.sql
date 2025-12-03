-- Script para corrigir comissões existentes
-- Recalcula usando o valor COM DESCONTO (subtotal - coupon_discount)

-- Atualizar order_total e commission_amount dos registros existentes
UPDATE affiliate_earnings ae
SET 
  order_total = o.subtotal - COALESCE(o.coupon_discount, 0),
  commission_amount = CASE 
    WHEN ae.commission_type = 'percentage' THEN 
      ROUND(((o.subtotal - COALESCE(o.coupon_discount, 0)) * ae.commission_value) / 100, 2)
    ELSE 
      ae.commission_value
  END
FROM orders o
WHERE ae.order_id = o.id;

-- Verificar resultado (descomente para testar)
-- SELECT 
--   ae.id,
--   o.order_number,
--   o.subtotal as order_subtotal,
--   o.coupon_discount,
--   ae.order_total as valor_base_comissao,
--   ae.commission_type,
--   ae.commission_value,
--   ae.commission_amount
-- FROM affiliate_earnings ae
-- JOIN orders o ON o.id = ae.order_id
-- ORDER BY ae.created_at DESC
-- LIMIT 10;
