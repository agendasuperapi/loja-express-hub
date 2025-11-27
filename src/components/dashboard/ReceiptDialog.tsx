import React, { useState, useEffect } from "react";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./ImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [paymentNotes, setPaymentNotes] = useState(order?.payment_notes || '');

  useEffect(() => {
    if (order) {
      setStoreImageUrl(order.store_image_url || '');
      setPaymentReceived(order.payment_received || false);
      setPaymentNotes(order.payment_notes || '');
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
          payment_notes: paymentNotes,
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

  const isMobile = useIsMobile();

  if (!order) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className={isMobile ? "p-0" : "max-w-2xl"}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Comprovante de Pagamento - #{order.order_number}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className={isMobile ? "space-y-4" : "space-y-6 py-4"}>
          <div>
            <Label className="text-sm sm:text-base">Comprovante de Pagamento</Label>
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
              <Label className="text-sm sm:text-base">Pagamento Recebido</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Marque quando o pagamento for confirmado
              </p>
            </div>
            <Switch
              checked={paymentReceived}
              onCheckedChange={setPaymentReceived}
            />
          </div>

          <Separator />

          <div>
            <Label htmlFor="payment-notes" className="text-sm sm:text-base">Observações de Pagamento</Label>
            <Textarea
              id="payment-notes"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Adicione observações sobre o pagamento..."
              className="mt-2"
              rows={isMobile ? 3 : 4}
            />
          </div>
        </div>

        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1 sm:flex-initial">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
