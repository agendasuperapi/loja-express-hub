-- Add pix_key column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS pix_key text NULL;

-- Add comment to the column
COMMENT ON COLUMN stores.pix_key IS 'Chave PIX da loja para recebimento de pagamentos';
