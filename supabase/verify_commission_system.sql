-- Script de verificação do sistema de comissões
-- Execute no SQL Editor do Supabase

-- 1. Verificar se os triggers estão ativos
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'orders'
AND trigger_name LIKE '%commission%';

-- 2. Verificar configuração do afiliado LUANAOFF10
SELECT 
  'store_affiliates' as fonte,
  sa.id,
  aa.email,
  aa.name,
  sa.default_commission_type,
  sa.default_commission_value,
  sa.is_active
FROM store_affiliates sa
JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
WHERE LOWER(aa.email) = 'luanateste04@gmail.com';

-- 3. Verificar cupom vinculado ao afiliado
SELECT 
  c.code,
  c.discount_type,
  c.discount_value,
  c.is_active,
  sac.store_affiliate_id
FROM store_affiliate_coupons sac
JOIN coupons c ON c.id = sac.coupon_id
JOIN store_affiliates sa ON sa.id = sac.store_affiliate_id
JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
WHERE LOWER(aa.email) = 'luanateste04@gmail.com';

-- 4. Verificar comissões existentes para o afiliado
SELECT 
  ae.id,
  o.order_number,
  ae.order_total,
  ae.commission_type,
  ae.commission_value,
  ae.commission_amount,
  ae.status,
  ae.created_at
FROM affiliate_earnings ae
JOIN orders o ON o.id = ae.order_id
JOIN store_affiliates sa ON sa.id = ae.store_affiliate_id
JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
WHERE LOWER(aa.email) = 'luanateste04@gmail.com'
ORDER BY ae.created_at DESC
LIMIT 10;

-- 5. IMPORTANTE: Se commission_value = 0, atualize para 10%
-- UPDATE store_affiliates sa
-- SET default_commission_value = 10
-- FROM affiliate_accounts aa
-- WHERE aa.id = sa.affiliate_account_id
-- AND LOWER(aa.email) = 'luanateste04@gmail.com'
-- AND sa.default_commission_value = 0;
