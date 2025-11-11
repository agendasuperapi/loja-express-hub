-- Clean and standardize phone numbers in all tables
-- Remove formatting and add +55 country code where missing
-- Execute this in Supabase SQL Editor

-- Update profiles table
UPDATE profiles
SET phone = CASE
  WHEN phone IS NULL THEN NULL
  WHEN phone = '' THEN NULL
  ELSE 
    CASE 
      -- If already starts with 55, just clean it
      WHEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g') ~ '^55' THEN 
        REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
      -- Otherwise add 55 prefix
      ELSE 
        '55' || REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
    END
END
WHERE phone IS NOT NULL AND phone != '';

-- Update stores table
UPDATE stores
SET phone = CASE
  WHEN phone IS NULL THEN NULL
  WHEN phone = '' THEN NULL
  ELSE 
    CASE 
      WHEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g') ~ '^55' THEN 
        REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
      ELSE 
        '55' || REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
    END
END
WHERE phone IS NOT NULL AND phone != '';

-- Update orders table - customer_phone
UPDATE orders
SET customer_phone = CASE
  WHEN customer_phone IS NULL THEN NULL
  WHEN customer_phone = '' THEN NULL
  ELSE 
    CASE 
      WHEN REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g') ~ '^55' THEN 
        REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g')
      ELSE 
        '55' || REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g')
    END
END
WHERE customer_phone IS NOT NULL AND customer_phone != '';

-- Create function to clean phone numbers on insert/update
CREATE OR REPLACE FUNCTION clean_phone_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Clean phone field if it exists in the table
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- For profiles table
    IF TG_TABLE_NAME = 'profiles' AND NEW.phone IS NOT NULL AND NEW.phone != '' THEN
      NEW.phone := CASE 
        WHEN REGEXP_REPLACE(NEW.phone, '[^0-9]', '', 'g') ~ '^55' THEN 
          REGEXP_REPLACE(NEW.phone, '[^0-9]', '', 'g')
        ELSE 
          '55' || REGEXP_REPLACE(NEW.phone, '[^0-9]', '', 'g')
      END;
    END IF;
    
    -- For stores table
    IF TG_TABLE_NAME = 'stores' AND NEW.phone IS NOT NULL AND NEW.phone != '' THEN
      NEW.phone := CASE 
        WHEN REGEXP_REPLACE(NEW.phone, '[^0-9]', '', 'g') ~ '^55' THEN 
          REGEXP_REPLACE(NEW.phone, '[^0-9]', '', 'g')
        ELSE 
          '55' || REGEXP_REPLACE(NEW.phone, '[^0-9]', '', 'g')
      END;
    END IF;
    
    -- For orders table
    IF TG_TABLE_NAME = 'orders' AND NEW.customer_phone IS NOT NULL AND NEW.customer_phone != '' THEN
      NEW.customer_phone := CASE 
        WHEN REGEXP_REPLACE(NEW.customer_phone, '[^0-9]', '', 'g') ~ '^55' THEN 
          REGEXP_REPLACE(NEW.customer_phone, '[^0-9]', '', 'g')
        ELSE 
          '55' || REGEXP_REPLACE(NEW.customer_phone, '[^0-9]', '', 'g')
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table
DROP TRIGGER IF EXISTS clean_phone_on_profiles ON profiles;
CREATE TRIGGER clean_phone_on_profiles
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION clean_phone_number();

DROP TRIGGER IF EXISTS clean_phone_on_stores ON stores;
CREATE TRIGGER clean_phone_on_stores
  BEFORE INSERT OR UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION clean_phone_number();

DROP TRIGGER IF EXISTS clean_phone_on_orders ON orders;
CREATE TRIGGER clean_phone_on_orders
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION clean_phone_number();
