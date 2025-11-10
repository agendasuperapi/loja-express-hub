-- Remover função com CASCADE para remover todos os triggers dependentes
DROP FUNCTION IF EXISTS public.notify_order_whatsapp() CASCADE;

-- Criar função atualizada que chama a edge function send-order-whatsapp
CREATE OR REPLACE FUNCTION public.notify_order_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  payload jsonb;
  project_url text := 'https://aqxgwdwuhgdxlwmbxxbi.supabase.co';
BEGIN
  -- Build payload baseado no tipo de operação
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

  -- Chamar a edge function de forma assíncrona usando pg_net
  PERFORM net.http_post(
    url := project_url || '/functions/v1/send-order-whatsapp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'role'
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log o erro mas não falhar o insert/update
    RAISE WARNING 'Erro ao enviar notificação WhatsApp: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Criar trigger único para novos pedidos e atualizações
CREATE TRIGGER notify_order_whatsapp_trigger
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_whatsapp();