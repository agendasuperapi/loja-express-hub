-- Adicionar coluna para soft delete em order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Criar índice para buscar itens não deletados
CREATE INDEX IF NOT EXISTS idx_order_items_deleted_at 
ON order_items(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON COLUMN order_items.deleted_at IS 'Data de quando o item foi removido (soft delete). NULL = ativo';
