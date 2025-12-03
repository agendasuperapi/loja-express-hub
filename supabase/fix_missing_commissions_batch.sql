-- Script para inserir comissões faltantes em pedidos que usaram cupom de afiliado
-- Execute PASSO A PASSO para verificar cada etapa

-- =====================================================
-- PASSO 1: Verificar pedidos sem comissão que têm cupom
-- =====================================================
SELECT 
  o.id as order_id,
  o.order_number,
  o.coupon_code,
  o.subtotal,
  o.total,
  o.store_id,
  o.created_at,
  CASE WHEN ae.id IS NOT NULL THEN '✅ Tem comissão' ELSE '❌ SEM COMISSÃO' END as status_comissao
FROM orders o
LEFT JOIN affiliate_earnings ae ON ae.order_id = o.id
WHERE o.coupon_code IS NOT NULL
AND o.store_id = '6bc45f44-067a-4008-b6b5-767851233975' -- Ajuste o store_id se necessário
ORDER BY o.created_at DESC
LIMIT 20;

-- =====================================================
-- PASSO 2: Verificar a estrutura de cupons e afiliados
-- =====================================================
-- Ver todos os cupons ativos da loja e seus vínculos com afiliados
SELECT 
  c.id as coupon_id,
  c.code,
  c.discount_type,
  c.discount_value,
  'affiliate_coupons' as fonte,
  a.id as affiliate_id,
  a.email as affiliate_email,
  a.default_commission_type,
  a.default_commission_value,
  NULL::uuid as store_affiliate_id
FROM coupons c
JOIN affiliate_coupons ac ON ac.coupon_id = c.id
JOIN affiliates a ON a.id = ac.affiliate_id
WHERE c.store_id = '6bc45f44-067a-4008-b6b5-767851233975'
AND c.is_active = true
AND a.is_active = true

UNION ALL

SELECT 
  c.id as coupon_id,
  c.code,
  c.discount_type,
  c.discount_value,
  'affiliates.coupon_id' as fonte,
  a.id as affiliate_id,
  a.email as affiliate_email,
  a.default_commission_type,
  a.default_commission_value,
  NULL::uuid as store_affiliate_id
FROM affiliates a
JOIN coupons c ON c.id = a.coupon_id
WHERE a.store_id = '6bc45f44-067a-4008-b6b5-767851233975'
AND a.is_active = true

UNION ALL

SELECT 
  c.id as coupon_id,
  c.code,
  c.discount_type,
  c.discount_value,
  'store_affiliate_coupons' as fonte,
  NULL::uuid as affiliate_id,
  aa.email as affiliate_email,
  sa.default_commission_type,
  sa.default_commission_value,
  sa.id as store_affiliate_id
FROM store_affiliate_coupons sac
JOIN coupons c ON c.id = sac.coupon_id
JOIN store_affiliates sa ON sa.id = sac.store_affiliate_id
JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
WHERE sa.store_id = '6bc45f44-067a-4008-b6b5-767851233975'
AND sa.is_active = true;

-- =====================================================
-- PASSO 3: INSERIR COMISSÕES FALTANTES (EXECUTAR COM CUIDADO!)
-- =====================================================
-- Este INSERT adiciona comissões para todos os pedidos que:
-- 1. Têm cupom
-- 2. O cupom está vinculado a um afiliado
-- 3. Ainda não têm registro de comissão

INSERT INTO affiliate_earnings (
  affiliate_id,
  store_affiliate_id,
  order_id,
  order_total,
  commission_type,
  commission_value,
  commission_amount,
  status
)
SELECT 
  COALESCE(aff.affiliate_id, legacy_aff.id) as affiliate_id,
  aff.store_affiliate_id,
  o.id as order_id,
  o.total as order_total,
  COALESCE(aff.commission_type, legacy_aff.default_commission_type, 'percentage') as commission_type,
  COALESCE(aff.commission_value, legacy_aff.default_commission_value, 0) as commission_value,
  CASE 
    WHEN COALESCE(aff.commission_type, legacy_aff.default_commission_type, 'percentage') = 'percentage' 
    THEN ROUND((o.subtotal * COALESCE(aff.commission_value, legacy_aff.default_commission_value, 0)) / 100, 2)
    ELSE COALESCE(aff.commission_value, legacy_aff.default_commission_value, 0)
  END as commission_amount,
  'pending' as status
FROM orders o
JOIN coupons c ON UPPER(c.code) = UPPER(o.coupon_code) AND c.store_id = o.store_id
-- Tentar encontrar via store_affiliate_coupons (sistema novo)
LEFT JOIN LATERAL (
  SELECT 
    sa.id as store_affiliate_id,
    sa.default_commission_type as commission_type,
    sa.default_commission_value as commission_value,
    a.id as affiliate_id
  FROM store_affiliate_coupons sac
  JOIN store_affiliates sa ON sa.id = sac.store_affiliate_id
  JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
  LEFT JOIN affiliates a ON LOWER(a.email) = LOWER(aa.email) AND a.store_id = o.store_id
  WHERE sac.coupon_id = c.id
  AND sa.store_id = o.store_id
  AND sa.is_active = true
  LIMIT 1
) aff ON true
-- Fallback para sistema legado via affiliate_coupons
LEFT JOIN LATERAL (
  SELECT 
    a.id,
    a.default_commission_type,
    a.default_commission_value
  FROM affiliate_coupons ac
  JOIN affiliates a ON a.id = ac.affiliate_id
  WHERE ac.coupon_id = c.id
  AND a.store_id = o.store_id
  AND a.is_active = true
  LIMIT 1
) legacy_aff ON aff.store_affiliate_id IS NULL
-- Fallback adicional via affiliates.coupon_id
LEFT JOIN LATERAL (
  SELECT 
    a.id,
    a.default_commission_type,
    a.default_commission_value
  FROM affiliates a
  WHERE a.coupon_id = c.id
  AND a.store_id = o.store_id
  AND a.is_active = true
  LIMIT 1
) legacy_coupon_aff ON aff.store_affiliate_id IS NULL AND legacy_aff.id IS NULL
WHERE o.coupon_code IS NOT NULL
AND o.store_id = '6bc45f44-067a-4008-b6b5-767851233975'
-- Não inserir se já existe comissão
AND NOT EXISTS (
  SELECT 1 FROM affiliate_earnings ae WHERE ae.order_id = o.id
)
-- Garantir que encontramos um afiliado
AND (aff.store_affiliate_id IS NOT NULL OR legacy_aff.id IS NOT NULL OR legacy_coupon_aff.id IS NOT NULL);

-- =====================================================
-- PASSO 4: Verificar resultado
-- =====================================================
SELECT 
  ae.id,
  o.order_number,
  o.coupon_code,
  ae.commission_amount,
  ae.commission_type,
  ae.commission_value,
  ae.status,
  COALESCE(a.email, aa.email) as affiliate_email
FROM affiliate_earnings ae
JOIN orders o ON o.id = ae.order_id
LEFT JOIN affiliates a ON a.id = ae.affiliate_id
LEFT JOIN store_affiliates sa ON sa.id = ae.store_affiliate_id
LEFT JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
WHERE o.store_id = '6bc45f44-067a-4008-b6b5-767851233975'
ORDER BY ae.created_at DESC
LIMIT 20;
