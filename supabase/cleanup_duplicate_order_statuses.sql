-- Script para remover status de pedidos duplicados de lojas existentes
-- Execute este script no SQL Editor do Supabase para limpar os registros duplicados

-- Remove os status duplicados (aliases) mantendo apenas ready e out_for_delivery
DELETE FROM public.order_status_configs 
WHERE status_key IN ('pronto', 'saiu_para_entrega', 'in_delivery');

-- Verifica se há algum status duplicado restante
SELECT 
  s.name as loja,
  osc.status_key,
  osc.status_label,
  COUNT(*) as quantidade
FROM public.order_status_configs osc
JOIN public.stores s ON s.id = osc.store_id
GROUP BY s.name, osc.status_key, osc.status_label
HAVING COUNT(*) > 1;
