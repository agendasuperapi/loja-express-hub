-- ============================================
-- CORREÇÃO ROBUSTA DO TRIGGER DE COMISSÃO
-- Remove pg_sleep e adiciona verificação de duplicidade
-- ============================================

-- 1. Remover trigger problemático existente
DROP TRIGGER IF EXISTS process_commission_after_items_trigger ON order_items;

-- 2. Criar função de trigger mais robusta (sem pg_sleep)
CREATE OR REPLACE FUNCTION trigger_process_commission_on_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_already_processed BOOLEAN;
BEGIN
  -- Buscar dados do pedido
  SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
  
  -- Só processar se o pedido tiver cupom
  IF v_order.coupon_code IS NULL OR v_order.coupon_code = '' THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se já foi processado (evita duplicatas)
  SELECT EXISTS(
    SELECT 1 FROM affiliate_earnings WHERE order_id = NEW.order_id
  ) INTO v_already_processed;
  
  IF NOT v_already_processed THEN
    -- Processar comissão imediatamente
    RAISE NOTICE '[COMMISSION_TRIGGER] Processando comissão para pedido % com cupom %', 
      v_order.order_number, v_order.coupon_code;
    PERFORM process_affiliate_commission_for_order(NEW.order_id);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Criar trigger em order_items
CREATE TRIGGER process_commission_after_items_trigger
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_process_commission_on_item();

-- 4. Conceder permissões
GRANT EXECUTE ON FUNCTION trigger_process_commission_on_item() TO authenticated, anon, service_role;

-- ============================================
-- DIAGNÓSTICO E REPROCESSAMENTO
-- ============================================

-- Verificar pedido #54634134
DO $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT := '#54634134';
  v_coupon_code TEXT;
  v_commission_exists BOOLEAN;
BEGIN
  -- Buscar o pedido
  SELECT id, coupon_code INTO v_order_id, v_coupon_code
  FROM orders WHERE order_number = v_order_number;
  
  IF v_order_id IS NULL THEN
    -- Tentar sem o #
    SELECT id, coupon_code INTO v_order_id, v_coupon_code
    FROM orders WHERE order_number = '54634134';
  END IF;
  
  IF v_order_id IS NULL THEN
    RAISE NOTICE 'Pedido % não encontrado', v_order_number;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Pedido encontrado: ID=%, Cupom=%', v_order_id, v_coupon_code;
  
  -- Verificar se já existe comissão
  SELECT EXISTS(SELECT 1 FROM affiliate_earnings WHERE order_id = v_order_id) 
  INTO v_commission_exists;
  
  IF v_commission_exists THEN
    RAISE NOTICE 'Comissão já existe para este pedido';
  ELSE
    RAISE NOTICE 'Processando comissão para o pedido...';
    PERFORM process_affiliate_commission_for_order(v_order_id);
    
    -- Verificar se foi criada
    SELECT EXISTS(SELECT 1 FROM affiliate_earnings WHERE order_id = v_order_id) 
    INTO v_commission_exists;
    
    IF v_commission_exists THEN
      RAISE NOTICE '✅ Comissão criada com sucesso!';
    ELSE
      RAISE NOTICE '❌ Falha ao criar comissão - verificar logs';
    END IF;
  END IF;
END $$;

-- Mostrar resultado final
SELECT 
  ae.id as earning_id,
  ae.commission_amount,
  ae.commission_type,
  ae.commission_value,
  ae.order_total,
  ae.status,
  a.email as affiliate_email,
  o.order_number
FROM affiliate_earnings ae
JOIN affiliates a ON a.id = ae.affiliate_id
JOIN orders o ON o.id = ae.order_id
WHERE o.order_number IN ('#54634134', '54634134')
ORDER BY ae.created_at DESC;
