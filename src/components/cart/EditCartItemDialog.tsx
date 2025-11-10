import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CartItem, CartAddon } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface EditCartItemDialogProps {
  item: CartItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (itemId: string, observation: string, addons: CartAddon[]) => void;
}

interface ProductAddon {
  id: string;
  name: string;
  price: number;
}

export const EditCartItemDialog = ({ item, open, onOpenChange, onUpdate }: EditCartItemDialogProps) => {
  const [observation, setObservation] = useState(item.observation || "");
  const [selectedAddons, setSelectedAddons] = useState<CartAddon[]>(item.addons || []);
  const [availableAddons, setAvailableAddons] = useState<ProductAddon[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadAddons();
      setObservation(item.observation || "");
      setSelectedAddons(item.addons || []);
    }
  }, [open, item]);

  const loadAddons = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('product_addons')
      .select('*')
      .eq('product_id', item.productId)
      .eq('is_available', true);
    
    if (data) {
      setAvailableAddons(data);
    }
    setIsLoading(false);
  };

  const handleAddonToggle = (addon: ProductAddon) => {
    const isSelected = selectedAddons.some(a => a.id === addon.id);
    if (isSelected) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, {
        id: addon.id,
        name: addon.name,
        price: addon.price,
      }]);
    }
  };

  const handleSave = () => {
    onUpdate(item.id, observation, selectedAddons);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">{item.productName}</h3>
              <p className="text-sm text-muted-foreground">
                R$ {(item.promotionalPrice || item.price).toFixed(2)} x {item.quantity}
              </p>
            </div>

            {availableAddons.length > 0 && (
              <div>
                <Label className="text-base mb-3 block">Adicionais</Label>
                <div className="space-y-2">
                  {availableAddons.map((addon) => (
                    <div key={addon.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedAddons.some(a => a.id === addon.id)}
                          onCheckedChange={() => handleAddonToggle(addon)}
                        />
                        <Label className="cursor-pointer font-normal">
                          {addon.name}
                        </Label>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        + R$ {addon.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="observation">Observações</Label>
              <Textarea
                id="observation"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Sem cebola, bem passado..."
                className="mt-2"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
