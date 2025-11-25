import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  newStatus: string;
  onConfirm: () => void;
}

export function WhatsAppConfirmDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  customerName,
  customerPhone,
  newStatus,
  onConfirm,
}: WhatsAppConfirmDialogProps) {
  const [messagePreview, setMessagePreview] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const loadMessagePreview = useCallback(async () => {
    setIsLoadingPreview(true);
    try {
      // Busca o pedido completo
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items!inner (
            *,
            order_item_addons (*),
            order_item_flavors (*)
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Busca a loja
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', order.store_id)
        .single();

      if (storeError) throw storeError;

      // Busca a configuração do status
      const { data: statusConfig, error: statusError } = await supabase
        .from('order_status_configs')
        .select('whatsapp_message')
        .eq('store_id', order.store_id)
        .eq('status_key', newStatus)
        .eq('is_active', true)
        .single();

      if (statusError || !statusConfig?.whatsapp_message) {
        setMessagePreview('Nenhuma mensagem configurada para este status.');
        setIsLoadingPreview(false);
        return;
      }

      // Formata os itens
      const itemsList = order.order_items
        .map((item: any) => {
          let itemText = `• ${item.quantity}x ${item.product_name}`;
          
          if (item.order_item_flavors && item.order_item_flavors.length > 0) {
            const flavors = item.order_item_flavors.map((f: any) => f.flavor_name).join(', ');
            itemText += `\n  Sabores: ${flavors}`;
          }
          
          if (item.order_item_addons && item.order_item_addons.length > 0) {
            const addons = item.order_item_addons.map((a: any) => a.addon_name).join(', ');
            itemText += `\n  Adicionais: ${addons}`;
          }
          
          if (item.observation) {
            itemText += `\n  Obs: ${item.observation}`;
          }
          
          return itemText;
        })
        .join('\n\n');

      // Formata endereço
      let address = '';
      if (order.delivery_type === 'delivery') {
        address = `${order.delivery_street}, ${order.delivery_number}`;
        if (order.delivery_complement) address += ` - ${order.delivery_complement}`;
        address += `\n${order.delivery_neighborhood}`;
        if (order.delivery_city) address += ` - ${order.delivery_city}`;
      } else {
        address = store.pickup_address || store.address || 'Endereço não informado';
      }

      // Formata método de pagamento
      const paymentMap: Record<string, string> = {
        'cash': 'Dinheiro',
        'card': 'Cartão',
        'pix': 'PIX',
      };
      const paymentMethod = paymentMap[order.payment_method] || order.payment_method;

      // Substitui variáveis na mensagem
      let message = statusConfig.whatsapp_message;
      message = message.replace(/\{customer_name\}/g, order.customer_name);
      message = message.replace(/\{order_number\}/g, order.order_number);
      message = message.replace(/\{store_name\}/g, store.name);
      message = message.replace(/\{total\}/g, `R$ ${order.total.toFixed(2)}`);
      message = message.replace(/\{items\}/g, itemsList);
      message = message.replace(/\{delivery_type\}/g, order.delivery_type === 'delivery' ? 'Entrega' : 'Retirada');
      message = message.replace(/\{address\}/g, address);
      message = message.replace(/\{payment_method\}/g, paymentMethod);

      // Processa condicionais
      message = message.replace(/\{#if_delivery\}([\s\S]*?)\{\/if_delivery\}/g, (_, content) => {
        return order.delivery_type === 'delivery' ? content : '';
      });
      message = message.replace(/\{#if_pickup\}([\s\S]*?)\{\/if_pickup\}/g, (_, content) => {
        return order.delivery_type === 'pickup' ? content : '';
      });

      setMessagePreview(message);
    } catch (error) {
      console.error('Erro ao carregar preview:', error);
      setMessagePreview('Erro ao carregar preview da mensagem.');
    } finally {
      setIsLoadingPreview(false);
    }
  }, [orderId, newStatus]);

  // Carrega o preview da mensagem quando o diálogo abre
  useEffect(() => {
    if (open && orderId) {
      loadMessagePreview();
    }
  }, [open, orderId, loadMessagePreview]);

  const handleConfirmAndSend = async () => {
    setIsSending(true);
    try {
      // Chama o callback que atualiza o status
      await onConfirm();
      
      // O envio do WhatsApp será feito automaticamente pelo trigger do banco
      onOpenChange(false);
      setMessagePreview(''); // Limpa o preview
    } catch (error) {
      console.error('Erro ao confirmar:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSkip = async () => {
    setIsSending(true);
    try {
      // Atualiza o status diretamente no banco sem trigger de WhatsApp
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus as any })
        .eq('id', orderId);

      if (error) throw error;
      
      onOpenChange(false);
      setMessagePreview(''); // Limpa o preview
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-600" />
            Enviar mensagem WhatsApp?
          </DialogTitle>
          <DialogDescription>
            Deseja notificar o cliente <strong>{customerName}</strong> sobre a mudança de status do pedido <strong>#{orderNumber}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Preview da mensagem:</p>
            {isLoadingPreview ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/30 p-4">
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {messagePreview}
                </pre>
              </ScrollArea>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Para:</strong> {customerPhone}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={handleSkip}
            disabled={isSending}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <X className="w-4 h-4 mr-2" />
            )}
            Pular envio
          </Button>
          <Button
            onClick={handleConfirmAndSend}
            disabled={isSending || isLoadingPreview}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
