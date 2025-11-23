-- Add whatsapp column to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

COMMENT ON COLUMN stores.whatsapp IS 'Número do WhatsApp da loja para contato (com código do país)';

-- Add trigger to clean whatsapp phone numbers
CREATE OR REPLACE FUNCTION clean_whatsapp_stores()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.whatsapp IS NOT NULL AND NEW.whatsapp != '' THEN
    NEW.whatsapp := CASE 
      WHEN REGEXP_REPLACE(NEW.whatsapp, '[^0-9]', '', 'g') ~ '^55' THEN 
        REGEXP_REPLACE(NEW.whatsapp, '[^0-9]', '', 'g')
      ELSE 
        '55' || REGEXP_REPLACE(NEW.whatsapp, '[^0-9]', '', 'g')
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clean_whatsapp_stores_trigger
  BEFORE INSERT OR UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION clean_whatsapp_stores();
