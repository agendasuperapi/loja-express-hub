-- Criar tabela para controlar mensagens enviadas (idempotência)
CREATE TABLE IF NOT EXISTS public.whatsapp_message_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid NOT NULL,
    order_status text NOT NULL,
    phone_number text NOT NULL,
    message_content text,
    sent_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    
    -- Constraint única: 1 mensagem por pedido + status
    UNIQUE(order_id, order_status)
);

-- Enable RLS
ALTER TABLE public.whatsapp_message_log ENABLE ROW LEVEL SECURITY;

-- Política: apenas admins e funções do sistema podem acessar
CREATE POLICY "System can manage whatsapp logs" ON public.whatsapp_message_log
    FOR ALL USING (
        has_role(auth.uid(), 'admin') OR 
        current_setting('role', true) = 'service_role'
    );

-- Garantir que só admins podem ver os logs
CREATE POLICY "Only admins can view whatsapp logs" ON public.whatsapp_message_log
    FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Remove TODOS os triggers de WhatsApp dos orders para evitar duplicação
DROP TRIGGER IF EXISTS send_whatsapp_on_order_insert ON public.orders;
DROP TRIGGER IF EXISTS send_whatsapp_on_order_update ON public.orders;
DROP TRIGGER IF EXISTS send_whatsapp_on_status_change ON public.orders;
DROP TRIGGER IF EXISTS send_whatsapp_after_items ON public.order_items;

-- Remove funções antigas se existirem
DROP FUNCTION IF EXISTS notify_order_whatsapp_after_items();
DROP FUNCTION IF EXISTS notify_order_whatsapp_internal(RECORD);

-- Criar APENAS trigger para mudança de status (não criação)
CREATE OR REPLACE TRIGGER send_whatsapp_on_status_change_only
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status != 'pending')
    EXECUTE FUNCTION public.notify_order_whatsapp();