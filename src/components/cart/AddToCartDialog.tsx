import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus } from "lucide-react";
import { useProductAddons } from "@/hooks/useProductAddons";
import { Checkbox } from "@/components/ui/checkbox";

interface AddToCartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    price: number;
    promotional_price?: number;
    image_url?: string;
  };
  onAdd: (quantity: number, observation: string, selectedAddons: Array<{ id: string; name: string; price: number }>) => void;
}

export const AddToCartDialog = ({ open, onOpenChange, product, onAdd }: AddToCartDialogProps) => {
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const { addons } = useProductAddons(product.id);

  useEffect(() => {
    if (!open) {
      setQuantity(1);
      setObservation("");
      setSelectedAddons(new Set());
    }
  }, [open]);

  const handleAddonToggle = (addonId: string) => {
    const newSelected = new Set(selectedAddons);
    if (newSelected.has(addonId)) {
      newSelected.delete(addonId);
    } else {
      newSelected.add(addonId);
    }
    setSelectedAddons(newSelected);
  };

  const handleAdd = () => {
    const addonsToAdd = addons
      ?.filter(addon => selectedAddons.has(addon.id))
      .map(addon => ({ id: addon.id, name: addon.name, price: addon.price })) || [];
    
    onAdd(quantity, observation, addonsToAdd);
    onOpenChange(false);
  };

  const price = product.promotional_price || product.price;
  const addonsTotal = addons
    ?.filter(addon => selectedAddons.has(addon.id))
    .reduce((sum, addon) => sum + addon.price, 0) || 0;
  const total = (price + addonsTotal) * quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            R$ {price.toFixed(2)} {product.promotional_price && <span className="text-xs line-through text-muted-foreground ml-2">R$ {product.price.toFixed(2)}</span>}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="text-center w-20"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {addons && addons.length > 0 && (
            <div className="space-y-2">
              <Label>Adicionais</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {addons.filter(addon => addon.is_available).map((addon) => (
                  <div
                    key={addon.id}
                    className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`addon-${addon.id}`}
                        checked={selectedAddons.has(addon.id)}
                        onCheckedChange={() => handleAddonToggle(addon.id)}
                      />
                      <Label
                        htmlFor={`addon-${addon.id}`}
                        className="cursor-pointer font-normal"
                      >
                        {addon.name}
                      </Label>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      + R$ {addon.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observation">Observações</Label>
            <Textarea
              id="observation"
              placeholder="Ex: Sem cebola, bem passado..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="text-xl font-bold">R$ {total.toFixed(2)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAdd}>
            Adicionar ao Carrinho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
