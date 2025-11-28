import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[96vw] sm:w-full max-h-[90vh] overflow-y-auto top-[5%] translate-y-0">
        <DialogHeader>
          <DialogTitle>Notas - #{order.order_number}</DialogTitle>
          <DialogDescription>
            Gerencie as notas do cliente e as notas internas da loja
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label htmlFor="customer-notes" className="text-sm sm:text-base">Notas do Cliente</Label>
            <Textarea
              id="customer-notes"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Observações do cliente sobre o pedido..."
              className="mt-2 min-h-[60px] sm:min-h-[120px]"
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
              className="mt-2 min-h-[60px] sm:min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Notas internas da loja (não visíveis para o cliente)
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="w-full sm:w-auto"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
