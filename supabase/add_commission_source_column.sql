-- Adicionar coluna commission_source à tabela affiliate_item_earnings
-- Esta coluna armazena a origem da comissão: 'specific_product', 'default', ou 'none'

ALTER TABLE affiliate_item_earnings 
ADD COLUMN IF NOT EXISTS commission_source TEXT DEFAULT 'default';

COMMENT ON COLUMN affiliate_item_earnings.commission_source IS 
  'Origem da comissão: specific_product (regra específica do produto), default (comissão padrão do afiliado), none (sem comissão configurada)';

-- Atualizar registros existentes sem commission_source
UPDATE affiliate_item_earnings 
SET commission_source = 'default' 
WHERE commission_source IS NULL;
