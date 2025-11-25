-- Criar função RPC que atualiza status sem enviar notificação WhatsApp
CREATE OR REPLACE FUNCTION public.update_order_status_skip_notification(
  p_order_id uuid,
  p_new_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_data json;
BEGIN
  -- Definir flag de sessão LOCAL (válida apenas para esta transação)
  PERFORM set_config('app.skip_whatsapp_notification', 'true', true);
  
  -- Atualizar o status do pedido
  UPDATE orders
  SET status = p_new_status::order_status,
      updated_at = now()
  WHERE id = p_order_id
  RETURNING json_build_object(
    'id', id,
    'status', status,
    'updated_at', updated_at
  ) INTO result_data;
  
  RETURN result_data;
END;
$$;