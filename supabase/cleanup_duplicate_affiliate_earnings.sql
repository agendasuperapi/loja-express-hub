-- Script para remover registros duplicados de affiliate_earnings
-- Mantém apenas o registro com maior comissão para cada order_id/affiliate_id

-- Primeiro, identificar duplicatas
WITH duplicates AS (
  SELECT 
    ae.id,
    ae.order_id,
    ae.affiliate_id,
    ae.commission_amount,
    ROW_NUMBER() OVER (
      PARTITION BY ae.order_id, ae.affiliate_id 
      ORDER BY ae.commission_amount DESC, ae.created_at ASC
    ) as rn
  FROM affiliate_earnings ae
)
-- Deletar registros duplicados (manter apenas rn = 1)
DELETE FROM affiliate_earnings 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Mostrar quantos foram removidos
SELECT 'Registros duplicados removidos' as status;
