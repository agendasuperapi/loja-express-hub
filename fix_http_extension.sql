-- Fix HTTP Extension Error
-- Execute this SQL in your Supabase SQL Editor

-- Enable the http extension for making HTTP requests from the database
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Recreate the notify_order_whatsapp function with proper error handling
CREATE OR REPLACE FUNCTION public.notify_order_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload JSONB;
  edge_url TEXT;
  service_role TEXT;
  url TEXT;
  response extensions.http_response;
BEGIN
  -- Get edge URL and service role from settings
  SELECT value INTO edge_url FROM app_settings WHERE key = 'edge_url';
  SELECT value INTO service_role FROM app_settings WHERE key = 'service_role';

  -- Only proceed if both settings are configured
  IF edge_url IS NOT NULL AND service_role IS NOT NULL THEN
    payload := jsonb_build_object(
      'record', jsonb_build_object(
        'customer_phone', NEW.customer_phone,
        'status', NEW.status,
        'store_id', NEW.store_id
      )
    );

    url := edge_url || '/functions/v1/send-order-whatsapp';

    -- Make HTTP request using the http extension
    BEGIN
      response := extensions.http((
        'POST',
        url,
        ARRAY[
          extensions.http_header('Content-Type', 'application/json'),
          extensions.http_header('Authorization', 'Bearer ' || service_role)
        ],
        'application/json',
        payload::text
      )::extensions.http_request);
      
      -- Log any non-200 responses
      IF response.status <> 200 THEN
        RAISE WARNING 'WhatsApp notification failed with status %: %', response.status, response.content;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE WARNING 'Failed to send WhatsApp notification: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Verify the extension is installed
SELECT * FROM pg_extension WHERE extname = 'http';
