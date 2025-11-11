
-- Temporarily disable all WhatsApp notification triggers on orders table
DROP TRIGGER IF EXISTS notify_order_whatsapp_trigger ON public.orders;
DROP TRIGGER IF EXISTS trigger_notify_order_whatsapp ON public.orders;
DROP TRIGGER IF EXISTS trigger_send_order_whatsapp ON public.orders;

-- Keep the update_updated_at trigger as it's necessary
-- DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
