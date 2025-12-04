-- Script para corrigir commission_value = 0 em affiliate_item_earnings
-- Atualiza itens que têm commission_amount > 0 mas commission_value = 0

-- 1. DIAGNÓSTICO: Ver itens com problema
SELECT 
  aie.id,
  aie.product_name,
  aie.item_subtotal,
  aie.item_value_with_discount,
  aie.commission_type,
  aie.commission_value as valor_atual,
  aie.commission_amount,
  ae.commission_type as earning_type,
  ae.commission_value as earning_value,
  sa.default_commission_type,
  sa.default_commission_value
FROM affiliate_item_earnings aie
JOIN affiliate_earnings ae ON ae.id = aie.earning_id
LEFT JOIN store_affiliates sa ON sa.id = ae.store_affiliate_id
WHERE aie.commission_value = 0
AND aie.commission_amount > 0;

-- 2. CORREÇÃO: Atualizar commission_value e commission_type baseado na hierarquia
UPDATE affiliate_item_earnings aie
SET 
  commission_value = COALESCE(
    -- Primeiro: valor do affiliate_earnings
    NULLIF(ae.commission_value, 0),
    -- Segundo: valor do store_affiliates
    NULLIF(sa.default_commission_value, 0),
    -- Terceiro: valor do affiliates (legado)
    NULLIF(a.default_commission_value, 0),
    -- Fallback: calcular a partir do commission_amount
    CASE 
      WHEN aie.item_value_with_discount > 0 THEN 
        ROUND((aie.commission_amount / aie.item_value_with_discount) * 100, 2)
      ELSE 0
    END
  ),
  commission_type = COALESCE(
    NULLIF(ae.commission_type, ''),
    NULLIF(sa.default_commission_type, ''),
    NULLIF(a.default_commission_type, ''),
    'percentage'
  )
FROM affiliate_earnings ae
LEFT JOIN store_affiliates sa ON sa.id = ae.store_affiliate_id
LEFT JOIN affiliates a ON a.id = ae.affiliate_id
WHERE aie.earning_id = ae.id
AND aie.commission_value = 0
AND aie.commission_amount > 0;

-- 3. VERIFICAÇÃO: Confirmar correção
SELECT 
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE commission_value = 0) as items_com_value_zero,
  COUNT(*) FILTER (WHERE commission_amount = 0) as items_com_amount_zero,
  COUNT(*) FILTER (WHERE commission_value > 0 AND commission_amount > 0) as items_completos
FROM affiliate_item_earnings;
