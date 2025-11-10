-- =====================================================
-- MIGRAÇÃO DE DADOS - EXECUTE APÓS CRIAR AS TABELAS
-- =====================================================
-- Este script insere os dados existentes no novo Supabase
-- IMPORTANTE: Execute este SQL DEPOIS do supabase_migration_complete.sql
-- =====================================================

-- ATENÇÃO: Estas inserções assumem que os usuários do auth.users 
-- já existem com os mesmos IDs. Se não existirem, os inserts falharão.
-- Você precisará primeiro criar os usuários no novo Supabase.

-- =====================================================
-- 1. INSERIR PROFILES
-- =====================================================

-- NOTA: Estes INSERTs vão falhar se os usuários não existirem em auth.users
-- Você precisará criar os usuários primeiro via signup ou importação manual

-- Profile 1
INSERT INTO public.profiles (id, full_name, phone, avatar_url, street, street_number, neighborhood, complement, created_at, updated_at)
VALUES 
('f295dd58-ac3b-4a1b-ab63-7cb0d8fd2e0b', 'Walison Soares De Oliveira', '(38) 99952-4679', NULL, 'Rua Angélica Motta', '58', 'Centro', 'Casa', '2025-10-13 19:15:46.968145+00', '2025-11-07 16:52:34.185571+00'),
('bd8e4a4d-770f-45d9-9e63-e4d05d82e867', 'Walison Soares De Oliveira', NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-13 21:53:47.32252+00', '2025-10-13 21:53:47.32252+00'),
('381f8e8a-2b16-4742-b32d-bff03bf8b385', 'Admin', '(38) 99952-4679', NULL, 'Rua Angélica Motta', '58', 'Centro', '', '2025-10-13 22:11:47.437723+00', '2025-10-14 06:39:01.889394+00'),
('57c6e0b6-886c-460f-832e-e051815a470c', 'Walison Soares De Oliveira', '38999524679', NULL, NULL, NULL, NULL, NULL, '2025-10-14 02:06:54.163522+00', '2025-10-14 02:06:54.163522+00'),
('9e13d760-c290-41e1-bc7d-7aa5c13a7c18', 'Walison Soares De Oliveira', '(31) 99952-4679', NULL, 'Rua Angélica Motta', '58', 'Centro', 'casa', '2025-10-14 02:10:57.678657+00', '2025-10-14 16:52:06.560551+00'),
('dd80a25f-71c6-443e-a38f-8f449690b2d3', 'Joa lucas', NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-14 02:20:06.522357+00', '2025-10-14 02:20:06.522357+00'),
('597b87c1-1990-4bab-8aa6-42aa8ce69e06', 'teste 02', '38998544174', NULL, 'teste02', '154', '155', '', '2025-10-14 02:29:53.485406+00', '2025-10-14 02:30:57.091506+00'),
('385dc564-8eae-493a-8780-fd73ded8ea0a', 'Lucas silva', '38999524679', NULL, 'Rua Angélica Motta', '58', 'Centro', '', '2025-10-14 02:34:42.758893+00', '2025-10-14 02:34:43.795962+00'),
('005b97fe-c8f4-4331-8a68-e029a4ce2f2a', 'Walison Soares De Oliveira', '(38) 99952-4679', NULL, 'Rua Angélica Motta', '58', 'Centro', 'casa', '2025-10-14 02:37:55.8811+00', '2025-10-14 07:54:49.874775+00'),
('e9087fc8-b825-401c-ad8e-39e47e4373cb', 'Joao lucas', '31998475517', NULL, 'rua 50', '125', 'centro', 'casa', '2025-10-14 02:48:50.817534+00', '2025-10-14 03:32:50.649097+00'),
('2d8be04e-f2e9-451d-a659-290024149b41', 'ferreira', '31998478527', NULL, 'rua 7 numero 70', '105', 'centro', 'bocaiuva', '2025-10-14 03:34:38.516955+00', '2025-10-14 03:38:11.723774+00'),
('212003d9-f885-4de9-875c-7038cb4a4179', 'Walison Soares De Oliveira', '(38) 99952-4679', NULL, 'Rua Angélica Motta', '58', 'Centro', 'casa', '2025-10-14 05:51:38.582171+00', '2025-10-14 20:19:13.437231+00'),
('f172def6-94fe-44b9-8c20-eda3e0a8503a', 'Marcos', '(31) 99952-4679', NULL, 'Sao paulo', '125', 'Santa laura', '', '2025-10-14 07:59:25.632843+00', '2025-10-14 16:29:04.044453+00'),
('e88bc919-784f-4fb0-9331-e5b4f8b8f3c7', 'Heron', '(38) 99826-9069', NULL, 'RUA JOSÉ CARNEIRO OLIVEIRA', '108', 'BOMFIM', 'AP 102', '2025-10-14 09:46:53.475347+00', '2025-10-14 09:46:54.727914+00'),
('6b556d0c-bcb8-47c8-834b-bcf67a050c64', 'Joao', '(31) 99942-5785', NULL, 'Rua c', '35', 'Centro', 'Teste', '2025-10-14 14:14:21.557325+00', '2025-10-14 14:36:26.151174+00'),
('0358ff4d-6515-4b1e-a573-8797d85cbd04', 'Greyciellen Alves', '(38) 99867-9863', NULL, 'José Carneiro Oliveria', '108', 'Bonfim', 'Ap 101', '2025-10-14 15:22:02.756092+00', '2025-10-14 15:22:03.975899+00'),
('d6eb6657-a87b-4350-9353-4554f028e2b8', 'Walison soares de oliveira', '(38) 99952-4679', NULL, 'Jose carneiro de oliveira', '105', 'Centro', 'Casa', '2025-10-18 19:49:00.174999+00', '2025-10-18 19:49:01.279491+00'),
('650bd944-c17a-4ce5-9191-4b5510dc6a01', 'Lucas ferreira', '(00) 99952-4679', NULL, 'Rua 13 de maio', '134', 'Centro', '', '2025-10-20 19:34:10.655942+00', '2025-11-07 01:47:42.988395+00'),
('76eabacd-025c-4822-8d30-ba8cc8899d08', 'Jorge', '(31) 99952-4679', NULL, 'Rua c', '35', 'Centro', 'Casa', '2025-11-06 20:41:10.453774+00', '2025-11-06 20:41:11.60809+00'),
('81ebad82-4968-4be1-9c1f-709731d00d00', 'Joao Lucas Ferreira Novais', '(38) 99833-9220', NULL, 'Presidente Vargas', '36', 'Bela Vista', '', '2025-11-06 21:17:17.999352+00', '2025-11-06 21:17:19.081984+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. INSERIR USER_ROLES
-- =====================================================

INSERT INTO public.user_roles (user_id, role, created_at)
VALUES
('f295dd58-ac3b-4a1b-ab63-7cb0d8fd2e0b', 'customer', '2025-10-13 19:15:46.968145+00'),
('f295dd58-ac3b-4a1b-ab63-7cb0d8fd2e0b', 'admin', '2025-11-06 21:39:21.375264+00'),
('bd8e4a4d-770f-45d9-9e63-e4d05d82e867', 'customer', '2025-10-13 21:53:47.32252+00'),
('bd8e4a4d-770f-45d9-9e63-e4d05d82e867', 'store_owner', '2025-10-13 21:59:17.577909+00'),
('381f8e8a-2b16-4742-b32d-bff03bf8b385', 'customer', '2025-10-13 22:11:47.437723+00'),
('381f8e8a-2b16-4742-b32d-bff03bf8b385', 'admin', '2025-10-13 22:19:27.691588+00'),
('57c6e0b6-886c-460f-832e-e051815a470c', 'customer', '2025-10-14 02:06:54.163522+00'),
('9e13d760-c290-41e1-bc7d-7aa5c13a7c18', 'customer', '2025-10-14 02:10:57.678657+00'),
('dd80a25f-71c6-443e-a38f-8f449690b2d3', 'customer', '2025-10-14 02:20:06.522357+00'),
('dd80a25f-71c6-443e-a38f-8f449690b2d3', 'store_owner', '2025-10-14 02:20:07.157224+00'),
('597b87c1-1990-4bab-8aa6-42aa8ce69e06', 'customer', '2025-10-14 02:29:53.485406+00'),
('385dc564-8eae-493a-8780-fd73ded8ea0a', 'customer', '2025-10-14 02:34:42.758893+00'),
('005b97fe-c8f4-4331-8a68-e029a4ce2f2a', 'customer', '2025-10-14 02:37:55.8811+00'),
('e9087fc8-b825-401c-ad8e-39e47e4373cb', 'customer', '2025-10-14 02:48:50.817534+00'),
('2d8be04e-f2e9-451d-a659-290024149b41', 'customer', '2025-10-14 03:34:38.516955+00'),
('212003d9-f885-4de9-875c-7038cb4a4179', 'customer', '2025-10-14 05:51:38.582171+00'),
('212003d9-f885-4de9-875c-7038cb4a4179', 'store_owner', '2025-10-14 05:51:38.936062+00'),
('f172def6-94fe-44b9-8c20-eda3e0a8503a', 'customer', '2025-10-14 07:59:25.632843+00'),
('e88bc919-784f-4fb0-9331-e5b4f8b8f3c7', 'customer', '2025-10-14 09:46:53.475347+00'),
('6b556d0c-bcb8-47c8-834b-bcf67a050c64', 'customer', '2025-10-14 14:14:21.557325+00'),
('0358ff4d-6515-4b1e-a573-8797d85cbd04', 'customer', '2025-10-14 15:22:02.756092+00'),
('d6eb6657-a87b-4350-9353-4554f028e2b8', 'customer', '2025-10-18 19:49:00.174999+00'),
('650bd944-c17a-4ce5-9191-4b5510dc6a01', 'customer', '2025-10-20 19:34:10.655942+00'),
('76eabacd-025c-4822-8d30-ba8cc8899d08', 'customer', '2025-11-06 20:41:10.453774+00'),
('81ebad82-4968-4be1-9c1f-709731d00d00', 'customer', '2025-11-06 21:17:17.999352+00'),
('81ebad82-4968-4be1-9c1f-709731d00d00', 'store_owner', '2025-11-06 21:17:18.659814+00'),
('50927bb2-ca87-4c4a-90b3-c488e814fee8', 'customer', '2025-11-07 16:46:38.24393+00'),
('50927bb2-ca87-4c4a-90b3-c488e814fee8', 'store_owner', '2025-11-07 16:46:38.736279+00')
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- 3. INSERIR STORES
-- =====================================================

INSERT INTO public.stores (id, owner_id, name, slug, description, category, address, phone, email, status, logo_url, banner_url, delivery_fee, min_order_value, avg_delivery_time, rating, total_reviews, is_open, operating_hours, created_at, updated_at)
VALUES
('6035ea31-66c8-4b0a-b1f8-86a1879993fd', 'bd8e4a4d-770f-45d9-9e63-e4d05d82e867', 'Hot Premium', 'teste07', 'teste', 'Restaurante', 'Rua Angélica Motta, 58', '(38)999487587', 'walisonflix04@gmail.com', 'active', '', '', 5.00, 0.00, 30, 0.00, 0, true, '{"friday": {"open": "08:00", "close": "18:00", "is_closed": false}, "monday": {"open": "08:00", "close": "18:00", "is_closed": false}, "saturday": {"open": "08:00", "close": "14:00", "is_closed": false}, "sunday": {"open": "08:00", "close": "12:00", "is_closed": true}, "thursday": {"open": "08:00", "close": "18:00", "is_closed": false}, "tuesday": {"open": "08:00", "close": "18:00", "is_closed": false}, "wednesday": {"open": "08:00", "close": "18:00", "is_closed": false}}'::jsonb, '2025-10-13 21:59:17.875768+00', '2025-11-06 21:40:57.989435+00'),

('28daf554-b3fb-4bdf-ad2c-e715e8f8ccbd', 'dd80a25f-71c6-443e-a38f-8f449690b2d3', 'LOJA 01', 'loja-01', 'dE SABOR NOS ENTENDEMOS', 'Restaurante', 'Rua nova era 125', '(31) 998357454', 'loja01@gmail.com', 'active', NULL, NULL, 2.00, 0.00, 30, 0.00, 0, true, '{"friday": {"open": "08:00", "close": "18:00", "is_closed": false}, "monday": {"open": "08:00", "close": "18:00", "is_closed": false}, "saturday": {"open": "08:00", "close": "14:00", "is_closed": false}, "sunday": {"open": "08:00", "close": "12:00", "is_closed": true}, "thursday": {"open": "08:00", "close": "18:00", "is_closed": false}, "tuesday": {"open": "08:00", "close": "18:00", "is_closed": false}, "wednesday": {"open": "08:00", "close": "18:00", "is_closed": false}}'::jsonb, '2025-10-14 02:20:07.438863+00', '2025-10-14 05:10:53.299434+00'),

('ef47e634-353c-4dc9-a11a-bf43cf155e2d', '212003d9-f885-4de9-875c-7038cb4a4179', 'PREMIUM BURGUER', 'hot-premium', 'Hambúrguer que conquistam seu paladar.', 'Restaurante', 'Rua 13 125 juramento mg', '(31) 99877-4579', 'hotpremium72@gmail.com', 'active', 'https://xterjbgaftyhwczknqro.supabase.co/storage/v1/object/public/store-logos/ef47e634-353c-4dc9-a11a-bf43cf155e2d/0.2839413315551782.jpg', 'https://xterjbgaftyhwczknqro.supabase.co/storage/v1/object/public/store-banners/ef47e634-353c-4dc9-a11a-bf43cf155e2d/0.8275472507641667.png', 3.00, 0.00, 40, 0.00, 0, true, '{"friday": {"open": "01:00", "close": "23:59", "is_closed": false}, "monday": {"open": "01:00", "close": "23:00", "is_closed": false}, "saturday": {"open": "01:00", "close": "23:59", "is_closed": false}, "sunday": {"open": "01:00", "close": "23:59", "is_closed": false}, "thursday": {"open": "01:00", "close": "23:59", "is_closed": false}, "tuesday": {"open": "01:00", "close": "23:59", "is_closed": false}, "wednesday": {"open": "01:00", "close": "23:59", "is_closed": false}}'::jsonb, '2025-10-14 05:51:39.227556+00', '2025-10-14 07:38:40.134551+00'),

('4d63ce87-c362-43fe-aa6a-d6dd1bdd40d6', '81ebad82-4968-4be1-9c1f-709731d00d00', 'Dog Premium', 'dog-premium', 'Sabor irresistível que vicia seu paladar.', 'Restaurante', 'Juramento Mg', '(38) 99833-9220', 'joaolnovais@hotmail.com', 'active', NULL, NULL, 0.00, 0.00, 40, 0.00, 0, true, '{"friday": {"open": "01:00", "close": "23:59", "is_closed": false}, "monday": {"open": "01:00", "close": "23:59", "is_closed": false}, "saturday": {"open": "01:00", "close": "23:59", "is_closed": false}, "sunday": {"open": "01:00", "close": "23:59", "is_closed": false}, "thursday": {"open": "01:00", "close": "23:59", "is_closed": false}, "tuesday": {"open": "01:00", "close": "23:59", "is_closed": false}, "wednesday": {"open": "01:00", "close": "23:59", "is_closed": false}}'::jsonb, '2025-11-06 21:17:18.983046+00', '2025-11-06 22:01:45.784967+00'),

('ff119538-1fc4-468b-ab03-864ee635d9dd', '50927bb2-ca87-4c4a-90b3-c488e814fee8', 'OFERTAS DROGA CLARA MOC', 'drogaclaramoc', 'Todo dia uma nova chance de economizar muito.', 'Farmácia', 'R. Gov. Valadares, 270 Montes Claros', '(38) 3221-6169', 'testedrogaclara@gmail.com', 'active', 'https://xterjbgaftyhwczknqro.supabase.co/storage/v1/object/public/store-logos/ff119538-1fc4-468b-ab03-864ee635d9dd/0.20640065190028223.jpg', 'https://xterjbgaftyhwczknqro.supabase.co/storage/v1/object/public/store-banners/ff119538-1fc4-468b-ab03-864ee635d9dd/0.7328176491025656.jpg', 3.00, 0.00, 30, 0.00, 0, true, '{"friday": {"open": "01:00", "close": "23:59", "is_closed": false}, "monday": {"open": "01:00", "close": "23:59", "is_closed": false}, "saturday": {"open": "01:00", "close": "23:59", "is_closed": false}, "sunday": {"open": "01:00", "close": "23:59", "is_closed": false}, "thursday": {"open": "01:00", "close": "23:59", "is_closed": false}, "tuesday": {"open": "01:00", "close": "23:59", "is_closed": false}, "wednesday": {"open": "01:00", "close": "23:59", "is_closed": false}}'::jsonb, '2025-11-07 16:46:39.05741+00', '2025-11-07 16:58:28.318962+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. INSERIR PRODUCT_CATEGORIES
-- =====================================================

INSERT INTO public.product_categories (id, store_id, name, created_at)
VALUES
('3d5ac5b6-1a00-4217-ba04-891db55de9d3', 'ef47e634-353c-4dc9-a11a-bf43cf155e2d', 'Artesanais', '2025-10-14 06:52:23.602157+00'),
('4f97d55d-d00b-494e-9982-2960471aa28c', 'ef47e634-353c-4dc9-a11a-bf43cf155e2d', 'Vegano', '2025-10-14 06:53:12.490227+00'),
('5ae15598-5571-49b4-bd7a-9665728d9cbb', 'ef47e634-353c-4dc9-a11a-bf43cf155e2d', 'Gourmet', '2025-10-14 06:53:33.40021+00'),
('cd1f4beb-c756-4f7d-a118-7e7aecbf017f', 'ef47e634-353c-4dc9-a11a-bf43cf155e2d', 'Smash', '2025-10-14 06:53:42.626856+00'),
('153ba54d-aaa6-41b1-861b-f6b24a01a444', 'ef47e634-353c-4dc9-a11a-bf43cf155e2d', 'Tradicional', '2025-10-14 06:53:57.84775+00'),
('d56514a1-2fd4-48af-a430-f8d76a07db12', '4d63ce87-c362-43fe-aa6a-d6dd1bdd40d6', 'HOTDOG NO PRATO', '2025-11-06 21:21:41.13379+00'),
('0a045a48-861c-41f2-ba01-9462f110b1e4', '4d63ce87-c362-43fe-aa6a-d6dd1bdd40d6', 'BEBIDAS', '2025-11-06 22:10:27.959361+00'),
('13f4db1d-7d36-4f90-b6f1-8ab340b7e940', 'ff119538-1fc4-468b-ab03-864ee635d9dd', 'OFERTAS', '2025-11-07 17:18:34.416875+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- NOTA IMPORTANTE SOBRE PRODUTOS, PEDIDOS E IMAGENS
-- =====================================================
-- 
-- Os dados de produtos, pedidos e order_items contêm:
-- - Muitos registros (dezenas/centenas)
-- - URLs de imagens que apontam para o storage do Lovable Cloud antigo
-- 
-- RECOMENDAÇÕES:
-- 1. Para migrar produtos com imagens, você precisará:
--    a) Baixar as imagens do storage antigo
--    b) Fazer upload no novo storage bucket
--    c) Atualizar as URLs nos INSERTs
--
-- 2. Para pedidos históricos:
--    - Avalie se realmente precisa migrar o histórico completo
--    - Pedidos antigos podem começar do zero no novo sistema
--    - Se necessário, posso gerar os INSERTs separadamente
--
-- 3. Para começar rápido:
--    - Execute até aqui (stores e categorias)
--    - Crie novos produtos manualmente no novo sistema
--    - Deixe o histórico de pedidos no sistema antigo
--
-- =====================================================

-- Se você quiser migrar produtos e pedidos, me avise que gero
-- os scripts completos com instruções para migração de imagens.

-- =====================================================
-- FIM DA MIGRAÇÃO BÁSICA
-- =====================================================
