-- Adicionar coluna short_id na tabela products
ALTER TABLE public.products
ADD COLUMN short_id TEXT UNIQUE;

-- Criar índice para busca rápida
CREATE INDEX idx_products_short_id ON public.products(short_id);

-- Função para gerar short_id (6 caracteres usando base62 do UUID)
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  result TEXT := '';
  uuid_bytes BYTEA;
  num BIGINT;
  i INT;
BEGIN
  -- Gera UUID e converte para número
  uuid_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  num := (get_byte(uuid_bytes, 0)::bigint << 40) | 
         (get_byte(uuid_bytes, 1)::bigint << 32) | 
         (get_byte(uuid_bytes, 2)::bigint << 24) | 
         (get_byte(uuid_bytes, 3)::bigint << 16) | 
         (get_byte(uuid_bytes, 4)::bigint << 8) | 
         get_byte(uuid_bytes, 5)::bigint;
  
  -- Converte para base62 (6 caracteres)
  FOR i IN 1..6 LOOP
    result := substr(chars, (num % 62) + 1, 1) || result;
    num := num / 62;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função trigger para gerar short_id automaticamente ao criar produto
CREATE OR REPLACE FUNCTION set_product_short_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.short_id IS NULL THEN
    NEW.short_id := generate_short_id();
    -- Garantir que é único
    WHILE EXISTS (SELECT 1 FROM products WHERE short_id = NEW.short_id) LOOP
      NEW.short_id := generate_short_id();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para novos produtos
CREATE TRIGGER trigger_set_product_short_id
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION set_product_short_id();

-- Popular short_id para produtos existentes
DO $$
DECLARE
  prod RECORD;
  new_short_id TEXT;
BEGIN
  FOR prod IN SELECT id FROM products WHERE short_id IS NULL LOOP
    LOOP
      new_short_id := generate_short_id();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM products WHERE short_id = new_short_id);
    END LOOP;
    UPDATE products SET short_id = new_short_id WHERE id = prod.id;
  END LOOP;
END $$;