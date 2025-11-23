-- Add separate address fields to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS store_cep TEXT,
ADD COLUMN IF NOT EXISTS store_city TEXT,
ADD COLUMN IF NOT EXISTS store_street TEXT,
ADD COLUMN IF NOT EXISTS store_street_number TEXT,
ADD COLUMN IF NOT EXISTS store_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS store_complement TEXT;

COMMENT ON COLUMN stores.store_cep IS 'CEP do endereço da loja';
COMMENT ON COLUMN stores.store_city IS 'Cidade onde a loja está localizada';
COMMENT ON COLUMN stores.store_street IS 'Rua/logradouro da loja';
COMMENT ON COLUMN stores.store_street_number IS 'Número do endereço da loja';
COMMENT ON COLUMN stores.store_neighborhood IS 'Bairro da loja';
COMMENT ON COLUMN stores.store_complement IS 'Complemento do endereço da loja';
