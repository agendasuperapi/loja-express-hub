-- Criar função RPC para atualizar status sem enviar WhatsApp
CREATE OR REPLACE FUNCTION update_order_status_without_notification(
  p_order_id uuid,
  p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Desabilitar temporariamente o trigger
  ALTER TABLE orders DISABLE TRIGGER notify_order_whatsapp_trigger;
  
  -- Atualizar o status
  UPDATE orders
  SET status = p_new_status::order_status,
      updated_at = now()
  WHERE id = p_order_id;
  
  -- Reabilitar o trigger
  ALTER TABLE orders ENABLE TRIGGER notify_order_whatsapp_trigger;
END;
$$;