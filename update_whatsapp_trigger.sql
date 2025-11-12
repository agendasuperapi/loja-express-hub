-- Update notify_order_whatsapp trigger to pass complete order data
-- Execute this SQL in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.notify_order_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload TEXT;
  edge_url TEXT;
  service_role TEXT;
  url TEXT;
  response public.http_response;
  cleaned_phone TEXT;
BEGIN
  -- Validate phone number format before proceeding
  IF NEW.customer_phone IS NULL OR LENGTH(NEW.customer_phone) < 10 THEN
    RAISE WARNING 'Invalid phone number format for order %: %', NEW.id, NEW.customer_phone;
    RETURN NEW;
  END IF;

  -- Additional validation: ensure phone contains only digits
  cleaned_phone := REGEXP_REPLACE(NEW.customer_phone, '[^0-9]', '', 'g');
  IF LENGTH(cleaned_phone) < 10 OR LENGTH(cleaned_phone) > 15 THEN
    RAISE WARNING 'Phone number out of valid range for order %: %', NEW.id, NEW.customer_phone;
    RETURN NEW;
  END IF;

  -- Get edge URL and service role using the secure function
  edge_url := public.get_app_setting('edge_url');
  service_role := public.get_app_setting('service_role');

  -- Only proceed if both settings are configured
  IF edge_url IS NOT NULL AND service_role IS NOT NULL THEN
    -- Pass complete order data including ID
    payload := jsonb_build_object(
      'record', jsonb_build_object(
        'id', NEW.id,
        'order_id', NEW.id,
        'customer_phone', NEW.customer_phone,
        'customer_name', NEW.customer_name,
        'order_number', NEW.order_number,
        'status', NEW.status,
        'store_id', NEW.store_id,
        'total', NEW.total,
        'subtotal', NEW.subtotal,
        'delivery_fee', NEW.delivery_fee,
        'delivery_type', NEW.delivery_type,
        'delivery_street', NEW.delivery_street,
        'delivery_number', NEW.delivery_number,
        'delivery_neighborhood', NEW.delivery_neighborhood,
        'delivery_complement', NEW.delivery_complement,
        'payment_method', NEW.payment_method,
        'change_amount', NEW.change_amount,
        'notes', NEW.notes
      )
    )::text;

    url := edge_url || '/functions/v1/send-order-whatsapp';

    -- Make HTTP request using the http extension
    BEGIN
      response := public.http((
        'POST',
        url,
        ARRAY[
          public.http_header('Content-Type', 'application/json'),
          public.http_header('Authorization', 'Bearer ' || service_role)
        ],
        'application/json',
        payload
      )::public.http_request);
      
      -- Log any non-200 responses (audit trail)
      IF response.status <> 200 THEN
        RAISE WARNING 'WhatsApp notification failed with status % for order %: %', response.status, NEW.id, response.content;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the transaction (resilience)
      RAISE WARNING 'Failed to send WhatsApp notification for order %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;
