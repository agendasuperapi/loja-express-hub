import React, { useState, useEffect } from "react";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface NotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onUpdate: () => void;
}

export const NotesDialog = ({ open, onOpenChange, order, onUpdate }: NotesDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [storeNotes, setStoreNotes] = useState(order?.store_notes || '');
  const [customerNotes, setCustomerNotes] = useState(order?.customer_notes || '');

  useEffect(() => {
    if (order) {
      setStoreNotes(order.store_notes || '');
      setCustomerNotes(order.customer_notes || '');
    }
  }, [order]);

  const handleSubmit = async () => {
    if (!order) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          store_notes: storeNotes,
          customer_notes: customerNotes,
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: 'Notas atualizadas!',
        description: 'As notas do pedido foram salvas.',
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao atualizar notas:', error);
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
          <ResponsiveDialogTitle>Notas - #{order.order_number}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className={isMobile ? "space-y-4" : "space-y-6 py-4"}>
          <div>
            <Label htmlFor="customer-notes" className="text-sm sm:text-base">Notas do Cliente</Label>
            <Textarea
              id="customer-notes"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Observações do cliente sobre o pedido..."
              className="mt-2 min-h-[100px] sm:min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Notas enviadas pelo cliente no momento do pedido
            </p>
          </div>

          <div>
            <Label htmlFor="store-notes" className="text-sm sm:text-base">Notas Internas da Loja</Label>
            <Textarea
              id="store-notes"
              value={storeNotes}
              onChange={(e) => setStoreNotes(e.target.value)}
              placeholder="Observações internas sobre este pedido..."
              className="mt-2 min-h-[100px] sm:min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Notas internas da loja (não visíveis para o cliente)
            </p>
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
