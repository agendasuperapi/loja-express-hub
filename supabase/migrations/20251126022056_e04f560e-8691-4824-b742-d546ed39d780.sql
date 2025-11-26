-- Add column to store custom pickup location name for store address
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS store_address_pickup_name text DEFAULT 'Endereço da Loja';

COMMENT ON COLUMN stores.store_address_pickup_name IS 'Nome customizado para o endereço da loja como local de retirada';