-- Corrigir search_path das funções (dropando trigger primeiro)
DROP TRIGGER IF EXISTS trigger_set_product_short_id ON public.products;
DROP FUNCTION IF EXISTS set_product_short_id();
DROP FUNCTION IF EXISTS generate_short_id();

CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  result TEXT := '';
  uuid_bytes BYTEA;
  num BIGINT;
  i INT;
BEGIN
  uuid_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  num := (get_byte(uuid_bytes, 0)::bigint << 40) | 
         (get_byte(uuid_bytes, 1)::bigint << 32) | 
         (get_byte(uuid_bytes, 2)::bigint << 24) | 
         (get_byte(uuid_bytes, 3)::bigint << 16) | 
         (get_byte(uuid_bytes, 4)::bigint << 8) | 
         get_byte(uuid_bytes, 5)::bigint;
  
  FOR i IN 1..6 LOOP
    result := substr(chars, (num % 62) + 1, 1) || result;
    num := num / 62;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION set_product_short_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.short_id IS NULL THEN
    NEW.short_id := generate_short_id();
    WHILE EXISTS (SELECT 1 FROM products WHERE short_id = NEW.short_id) LOOP
      NEW.short_id := generate_short_id();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recriar trigger
CREATE TRIGGER trigger_set_product_short_id
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION set_product_short_id();