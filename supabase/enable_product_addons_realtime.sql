-- Habilitar REALTIME para tabela product_addons
-- Este script garante que todas as mudanças na tabela sejam transmitidas em tempo real

-- 1. Configurar REPLICA IDENTITY para capturar todos os dados da linha
ALTER TABLE product_addons REPLICA IDENTITY FULL;

-- 2. Adicionar a tabela à publicação do realtime
-- Isso permite que o Supabase transmita eventos INSERT, UPDATE e DELETE
ALTER PUBLICATION supabase_realtime ADD TABLE product_addons;

-- 3. Verificar se a configuração foi aplicada
-- SELECT schemaname, tablename, attidentity 
-- FROM pg_publication_tables 
-- WHERE pubname = 'supabase_realtime' AND tablename = 'product_addons';

-- ✅ REALTIME está agora ATIVO para product_addons!
-- Todos os eventos serão transmitidos instantaneamente para clientes conectados
