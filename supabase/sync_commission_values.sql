-- Script para sincronizar valores de comissão entre affiliates e store_affiliates
-- Execute no SQL Editor do Supabase

-- =====================================================
-- PASSO 1: DIAGNÓSTICO - Ver configurações atuais
-- =====================================================
SELECT 
  'DIAGNÓSTICO' as etapa,
  a.id as affiliate_id,
  a.email,
  a.name,
  a.default_commission_type as affiliates_type,
  a.default_commission_value as affiliates_value,
  sa.id as store_affiliate_id,
  sa.default_commission_type as store_affiliates_type,
  sa.default_commission_value as store_affiliates_value,
  CASE 
    WHEN sa.default_commission_value = 0 AND a.default_commission_value > 0 THEN '⚠️ PRECISA SINCRONIZAR'
    WHEN sa.default_commission_value = a.default_commission_value THEN '✅ OK'
    ELSE '⚠️ VALORES DIFERENTES'
  END as status
FROM affiliates a
JOIN affiliate_accounts aa ON LOWER(aa.email) = LOWER(a.email)
JOIN store_affiliates sa ON sa.affiliate_account_id = aa.id AND sa.store_id = a.store_id
ORDER BY a.email;

-- =====================================================
-- PASSO 2: SINCRONIZAR - Copiar valores de affiliates para store_affiliates
-- =====================================================
UPDATE store_affiliates sa
SET 
  default_commission_type = a.default_commission_type,
  default_commission_value = a.default_commission_value
FROM affiliates a
JOIN affiliate_accounts aa ON LOWER(aa.email) = LOWER(a.email)
WHERE sa.affiliate_account_id = aa.id
AND sa.store_id = a.store_id
AND (
  sa.default_commission_value = 0 
  OR sa.default_commission_value IS NULL
  OR sa.default_commission_value != a.default_commission_value
)
AND a.default_commission_value > 0;

-- =====================================================
-- PASSO 3: VERIFICAR - Confirmar sincronização
-- =====================================================
SELECT 
  'VERIFICAÇÃO' as etapa,
  a.email,
  a.name,
  a.default_commission_type as affiliates_type,
  a.default_commission_value as affiliates_value,
  sa.default_commission_type as store_affiliates_type,
  sa.default_commission_value as store_affiliates_value,
  CASE 
    WHEN sa.default_commission_value = a.default_commission_value THEN '✅ SINCRONIZADO'
    ELSE '❌ FALHOU'
  END as status
FROM affiliates a
JOIN affiliate_accounts aa ON LOWER(aa.email) = LOWER(a.email)
JOIN store_affiliates sa ON sa.affiliate_account_id = aa.id AND sa.store_id = a.store_id
ORDER BY a.email;

-- =====================================================
-- PASSO 4: ATUALIZAR COMISSÕES EXISTENTES (OPCIONAL)
-- Recalcular comissões que foram registradas com valor incorreto
-- =====================================================
-- ATENÇÃO: Execute apenas se quiser recalcular comissões existentes

/*
UPDATE affiliate_earnings ae
SET 
  commission_value = sa.default_commission_value,
  commission_type = sa.default_commission_type,
  commission_amount = CASE 
    WHEN sa.default_commission_type = 'percentage' THEN ROUND((
      SELECT o.subtotal FROM orders o WHERE o.id = ae.order_id
    ) * sa.default_commission_value / 100, 2)
    ELSE sa.default_commission_value
  END
FROM store_affiliates sa
WHERE ae.store_affiliate_id = sa.id
AND sa.default_commission_value > 0
AND (ae.commission_amount = 0 OR ae.commission_value = 0 OR ae.commission_amount < 1);
*/
