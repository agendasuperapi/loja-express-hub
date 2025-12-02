-- Habilitar realtime para affiliate_earnings
-- Isso permite que notificações de comissão sejam enviadas em tempo real

-- Habilitar REPLICA IDENTITY FULL para capturar dados completos das linhas
ALTER TABLE affiliate_earnings REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação realtime do Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE affiliate_earnings;
