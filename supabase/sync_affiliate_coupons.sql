-- Script para sincronizar cupons de afiliados entre sistemas legado e novo
-- Execute este script no SQL Editor do Supabase

-- 1. Sincronizar affiliate_coupons -> store_affiliate_coupons
-- Para afiliados que têm cupons na tabela legada mas não na nova

INSERT INTO store_affiliate_coupons (store_affiliate_id, coupon_id)
SELECT DISTINCT sa.id, ac.coupon_id
FROM affiliate_coupons ac
JOIN affiliates a ON a.id = ac.affiliate_id
JOIN affiliate_accounts aa ON LOWER(aa.email) = LOWER(a.email)
JOIN store_affiliates sa ON sa.affiliate_account_id = aa.id AND sa.store_id = a.store_id
WHERE NOT EXISTS (
  SELECT 1 FROM store_affiliate_coupons sac 
  WHERE sac.store_affiliate_id = sa.id AND sac.coupon_id = ac.coupon_id
)
ON CONFLICT (store_affiliate_id, coupon_id) DO NOTHING;

-- 2. Sincronizar affiliates.coupon_id -> store_affiliates.coupon_id (campo legacy)
UPDATE store_affiliates sa
SET coupon_id = a.coupon_id
FROM affiliates a
JOIN affiliate_accounts aa ON LOWER(aa.email) = LOWER(a.email)
WHERE sa.affiliate_account_id = aa.id 
AND sa.store_id = a.store_id
AND sa.coupon_id IS NULL 
AND a.coupon_id IS NOT NULL;

-- 3. Também inserir coupon_id dos affiliates na store_affiliate_coupons
INSERT INTO store_affiliate_coupons (store_affiliate_id, coupon_id)
SELECT DISTINCT sa.id, a.coupon_id
FROM affiliates a
JOIN affiliate_accounts aa ON LOWER(aa.email) = LOWER(a.email)
JOIN store_affiliates sa ON sa.affiliate_account_id = aa.id AND sa.store_id = a.store_id
WHERE a.coupon_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM store_affiliate_coupons sac 
  WHERE sac.store_affiliate_id = sa.id AND sac.coupon_id = a.coupon_id
)
ON CONFLICT (store_affiliate_id, coupon_id) DO NOTHING;

-- 4. Verificar resultados
SELECT 
  'store_affiliate_coupons' as table_name,
  COUNT(*) as total_records
FROM store_affiliate_coupons
UNION ALL
SELECT 
  'affiliate_coupons' as table_name,
  COUNT(*) as total_records
FROM affiliate_coupons
UNION ALL
SELECT 
  'store_affiliates com coupon_id' as table_name,
  COUNT(*) as total_records
FROM store_affiliates WHERE coupon_id IS NOT NULL
UNION ALL
SELECT 
  'affiliates com coupon_id' as table_name,
  COUNT(*) as total_records
FROM affiliates WHERE coupon_id IS NOT NULL;
