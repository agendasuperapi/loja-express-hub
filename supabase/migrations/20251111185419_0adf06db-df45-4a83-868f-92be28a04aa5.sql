-- Reabilitar o trigger update_updated_at na tabela orders
-- Este trigger atualiza automaticamente a coluna updated_at quando um pedido é modificado

ALTER TABLE public.orders ENABLE TRIGGER update_orders_updated_at;

-- Verificar se o trigger foi reabilitado
DO $$
DECLARE
  trigger_status char;
BEGIN
  SELECT tgenabled INTO trigger_status
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'orders'
    AND t.tgname = 'update_orders_updated_at';
    
  IF trigger_status = 'O' THEN
    RAISE NOTICE 'Trigger update_orders_updated_at foi reabilitado com sucesso';
  ELSE
    RAISE WARNING 'Trigger pode não estar ativo. Status: %', trigger_status;
  END IF;
END $$;

-- Atualizar comentário da tabela
COMMENT ON TABLE public.orders IS 'Tabela de pedidos - Trigger update_updated_at reabilitado em 2025-01-11';