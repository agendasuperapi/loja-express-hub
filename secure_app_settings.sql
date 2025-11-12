-- Secure the app_settings table
-- This table contains sensitive credentials and must be protected
-- Execute this in Supabase SQL Editor

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can insert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can delete app settings" ON public.app_settings;

-- Create a security definer function to get app settings
-- This allows server-side functions to access settings securely
CREATE OR REPLACE FUNCTION public.get_app_setting(setting_key text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.app_settings WHERE key = setting_key LIMIT 1;
$$;

-- Only admins can read app_settings directly
CREATE POLICY "Admins can view app settings"
  ON public.app_settings
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert app_settings
CREATE POLICY "Admins can insert app settings"
  ON public.app_settings
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update app_settings
CREATE POLICY "Admins can update app settings"
  ON public.app_settings
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete app_settings
CREATE POLICY "Admins can delete app settings"
  ON public.app_settings
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Update the notify_order_whatsapp function to use the secure getter
CREATE OR REPLACE FUNCTION public.notify_order_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload TEXT;
  edge_url TEXT;
  service_role TEXT;
  url TEXT;
  response public.http_response;
BEGIN
  -- Get edge URL and service role using the secure function
  edge_url := public.get_app_setting('edge_url');
  service_role := public.get_app_setting('service_role');

  -- Only proceed if both settings are configured
  IF edge_url IS NOT NULL AND service_role IS NOT NULL THEN
    payload := jsonb_build_object(
      'record', jsonb_build_object(
        'customer_phone', NEW.customer_phone,
        'status', NEW.status,
        'store_id', NEW.store_id
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
