-- Add show_phone_on_store_page column to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS show_phone_on_store_page BOOLEAN DEFAULT true;

COMMENT ON COLUMN stores.show_phone_on_store_page IS 'Define se o telefone da loja deve ser exibido na página inicial';
