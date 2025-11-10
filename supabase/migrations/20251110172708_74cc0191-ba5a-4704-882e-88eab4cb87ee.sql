-- Criar trigger para notificar via WhatsApp quando um pedido é criado ou atualizado
CREATE TRIGGER trigger_notify_order_whatsapp
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_whatsapp();