-- Habilitar realtime para notificações de novos pedidos
-- Configurar replica identity para capturar dados completos dos inserts
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Adicionar tabela orders à publicação realtime (se ainda não estiver)
-- Nota: Esta operação é idempotente, não causará erro se já existir
DO $$
BEGIN
  -- Verifica se a tabela já está na publicação
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;