-- Script para adicionar comissão do pedido #85489517 que não foi registrada
-- Execute este script no SQL Editor do Supabase

-- 1. Primeiro, verificar o pedido e o cupom utilizado
SELECT 
  o.id as order_id,
  o.order_number,
  o.coupon_code,
  o.total,
  o.subtotal,
  o.store_id,
  o.created_at
FROM orders o
WHERE o.order_number LIKE '%85489517%';

-- 2. Verificar se já existe comissão para este pedido
SELECT * FROM affiliate_earnings 
WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE '%85489517%');

-- 3. Buscar o afiliado vinculado ao cupom usado no pedido
-- (Substitua 'CODIGO_CUPOM' pelo código do cupom mostrado na query 1)
WITH order_info AS (
  SELECT o.id as order_id, o.coupon_code, o.total, o.subtotal, o.store_id
  FROM orders o
  WHERE o.order_number LIKE '%85489517%'
  LIMIT 1
),
coupon_info AS (
  SELECT c.id as coupon_id, c.code
  FROM coupons c, order_info oi
  WHERE c.store_id = oi.store_id
  AND LOWER(c.code) = LOWER(oi.coupon_code)
  LIMIT 1
),
affiliate_info AS (
  -- Tentar via affiliate_coupons (junction)
  SELECT 
    a.id as affiliate_id,
    a.default_commission_type,
    a.default_commission_value,
    sa.id as store_affiliate_id,
    'affiliate_coupons' as source
  FROM affiliate_coupons ac
  JOIN affiliates a ON a.id = ac.affiliate_id
  JOIN coupon_info ci ON ac.coupon_id = ci.coupon_id
  LEFT JOIN affiliate_accounts aa ON LOWER(aa.email) = LOWER(a.email)
  LEFT JOIN store_affiliates sa ON sa.affiliate_account_id = aa.id AND sa.store_id = a.store_id
  WHERE a.is_active = true
  
  UNION ALL
  
  -- Fallback via affiliates.coupon_id
  SELECT 
    a.id as affiliate_id,
    a.default_commission_type,
    a.default_commission_value,
    sa.id as store_affiliate_id,
    'affiliates_coupon_id' as source
  FROM affiliates a
  JOIN coupon_info ci ON a.coupon_id = ci.coupon_id
  LEFT JOIN affiliate_accounts aa ON LOWER(aa.email) = LOWER(a.email)
  LEFT JOIN store_affiliates sa ON sa.affiliate_account_id = aa.id AND sa.store_id = a.store_id
  WHERE a.is_active = true
  
  UNION ALL
  
  -- Via store_affiliate_coupons
  SELECT 
    COALESCE(a.id, sa.id) as affiliate_id,
    sa.default_commission_type,
    sa.default_commission_value,
    sa.id as store_affiliate_id,
    'store_affiliate_coupons' as source
  FROM store_affiliate_coupons sac
  JOIN store_affiliates sa ON sa.id = sac.store_affiliate_id
  JOIN coupon_info ci ON sac.coupon_id = ci.coupon_id
  LEFT JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
  LEFT JOIN affiliates a ON LOWER(a.email) = LOWER(aa.email) AND a.store_id = sa.store_id
  WHERE sa.is_active = true
)
SELECT * FROM affiliate_info LIMIT 1;

-- 4. INSERIR A COMISSÃO MANUALMENTE
-- Descomente e ajuste os valores abaixo após verificar as queries acima:

/*
INSERT INTO affiliate_earnings (
  affiliate_id,
  store_affiliate_id,
  order_id,
  order_total,
  commission_amount,
  commission_type,
  commission_value,
  status
)
SELECT 
  ai.affiliate_id,
  ai.store_affiliate_id,
  oi.order_id,
  oi.total,
  CASE 
    WHEN ai.default_commission_type = 'percentage' THEN (oi.subtotal * ai.default_commission_value / 100)
    ELSE ai.default_commission_value
  END as commission_amount,
  ai.default_commission_type,
  ai.default_commission_value,
  'pending'
FROM order_info oi
CROSS JOIN (
  -- Cole aqui o resultado da query 3 como subquery, ou substitua por valores diretos:
  SELECT 
    'AFFILIATE_ID_AQUI'::uuid as affiliate_id,
    'STORE_AFFILIATE_ID_AQUI'::uuid as store_affiliate_id,
    'percentage' as default_commission_type,
    10.0 as default_commission_value -- ajuste a porcentagem
) ai
WHERE NOT EXISTS (
  SELECT 1 FROM affiliate_earnings ae WHERE ae.order_id = oi.order_id
);
*/

-- Versão simplificada (ajuste os valores após rodar as queries acima):
-- INSERT INTO affiliate_earnings (affiliate_id, store_affiliate_id, order_id, order_total, commission_amount, commission_type, commission_value, status)
-- VALUES (
--   'UUID_DO_AFFILIATE',
--   'UUID_DO_STORE_AFFILIATE', -- pode ser NULL se não existir
--   'UUID_DO_ORDER',
--   VALOR_TOTAL_DO_PEDIDO,
--   VALOR_DA_COMISSAO,
--   'percentage',
--   PORCENTAGEM_DA_COMISSAO,
--   'pending'
-- );
