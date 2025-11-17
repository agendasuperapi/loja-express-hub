import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ImageUpload } from "./ImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onUpdate: () => void;
}

export const ReceiptDialog = ({ open, onOpenChange, order, onUpdate }: ReceiptDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [storeImageUrl, setStoreImageUrl] = useState(order?.store_image_url || '');
  const [paymentReceived, setPaymentReceived] = useState(order?.payment_received || false);

  useEffect(() => {
    if (order) {
      setStoreImageUrl(order.store_image_url || '');
      setPaymentReceived(order.payment_received || false);
    }
  }, [order]);

  const handleSubmit = async () => {
    if (!order) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          store_image_url: storeImageUrl,
          payment_received: paymentReceived,
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: 'Comprovante atualizado!',
        description: 'As informações do comprovante foram salvas.',
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao atualizar comprovante:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Comprovante de Pagamento - Pedido #{order.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label>Comprovante de Pagamento</Label>
            <ImageUpload
              bucket="product-images"
              folder={`orders/${order.id}/receipts`}
              productId={order.id}
              currentImageUrl={storeImageUrl}
              onUploadComplete={(url) => setStoreImageUrl(url)}
              label="Comprovante"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Anexe o comprovante de pagamento do cliente (PIX, transferência, etc.)
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Pagamento Recebido</Label>
              <p className="text-sm text-muted-foreground">
                Marque quando o pagamento for confirmado
              </p>
            </div>
            <Switch
              checked={paymentReceived}
              onCheckedChange={setPaymentReceived}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
