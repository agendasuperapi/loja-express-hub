
-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION public.notify_order_whatsapp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  payload jsonb;
  project_url text := 'https://aqxgwdwuhgdxlwmbxxbi.supabase.co';
  auth_token text;
BEGIN
  -- Try to get the JWT token safely
  BEGIN
    auth_token := current_setting('request.jwt.claims', true);
    IF auth_token IS NULL OR auth_token = '' THEN
      auth_token := '{}';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      auth_token := '{}';
  END;

  -- Build payload based on operation type
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type', 'INSERT',
      'record', to_jsonb(NEW),
      'old_record', NULL
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'record', to_jsonb(NEW),
      'old_record', to_jsonb(OLD)
    );
  END IF;

  -- Call edge function asynchronously using pg_net
  PERFORM net.http_post(
    url := project_url || '/functions/v1/send-order-whatsapp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert/update
    RAISE WARNING 'Erro ao enviar notificação WhatsApp: %', SQLERRM;
    RETURN NEW;
END;
$$;
