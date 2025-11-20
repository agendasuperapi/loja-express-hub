import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus } from "lucide-react";
import { useProductAddons } from "@/hooks/useProductAddons";
import { useProductFlavors } from "@/hooks/useProductFlavors";
import { useAddonCategories } from "@/hooks/useAddonCategories";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

interface AddToCartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    price: number;
    promotional_price?: number;
    image_url?: string;
    is_pizza?: boolean;
    max_flavors?: number;
  };
  onAdd: (
    quantity: number, 
    observation: string, 
    selectedAddons: Array<{ id: string; name: string; price: number }>,
    selectedFlavors: Array<{ id: string; name: string; price: number }>
  ) => void;
}

export const AddToCartDialog = ({ open, onOpenChange, product, onAdd }: AddToCartDialogProps) => {
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [selectedFlavors, setSelectedFlavors] = useState<Set<string>>(new Set());
  const [storeId, setStoreId] = useState<string | undefined>();
  const { addons } = useProductAddons(product.id);
  const { flavors } = useProductFlavors(product.id);
  const { categories } = useAddonCategories(storeId);

  useEffect(() => {
    const fetchStoreId = async () => {
      const { data } = await supabase
        .from('products')
        .select('store_id')
        .eq('id', product.id)
        .single();
      
      if (data) {
        setStoreId(data.store_id);
      }
    };
    
    if (product.id) {
      fetchStoreId();
    }
  }, [product.id]);

  const maxFlavors = product.max_flavors || 1;
  const hasFlavors = product.is_pizza && flavors && flavors.length > 0;

  useEffect(() => {
    if (!open) {
      setQuantity(1);
      setObservation("");
      setSelectedAddons(new Set());
      setSelectedFlavors(new Set());
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

  const handleFlavorToggle = (flavorId: string) => {
    const newSelected = new Set(selectedFlavors);
    if (newSelected.has(flavorId)) {
      newSelected.delete(flavorId);
    } else {
      if (newSelected.size < maxFlavors) {
        newSelected.add(flavorId);
      }
    }
    setSelectedFlavors(newSelected);
  };

  const handleAdd = () => {
    if (hasFlavors && selectedFlavors.size === 0) {
      return; // Não permite adicionar sem selecionar sabores
    }

    const addonsToAdd = addons
      ?.filter(addon => selectedAddons.has(addon.id))
      .map(addon => ({ id: addon.id, name: addon.name, price: addon.price })) || [];
    
    const flavorsToAdd = flavors
      ?.filter(flavor => selectedFlavors.has(flavor.id))
      .map(flavor => ({ id: flavor.id, name: flavor.name, price: flavor.price })) || [];
    
    onAdd(quantity, observation, addonsToAdd, flavorsToAdd);
    onOpenChange(false);
  };

  const price = product.promotional_price || product.price;
  const addonsTotal = addons
    ?.filter(addon => selectedAddons.has(addon.id))
    .reduce((sum, addon) => sum + addon.price, 0) || 0;
  
  const flavorsTotal = flavors
    ?.filter(flavor => selectedFlavors.has(flavor.id))
    .reduce((sum, flavor) => sum + flavor.price, 0) || 0;
  
  const total = (price + addonsTotal + flavorsTotal) * quantity;

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

          {hasFlavors && (
            <div className="space-y-2">
              <Label>
                Sabores {maxFlavors > 1 && `(máx. ${maxFlavors})`}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {flavors?.filter(flavor => flavor.is_available).map((flavor) => (
                  <div
                    key={flavor.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`flavor-${flavor.id}`}
                        checked={selectedFlavors.has(flavor.id)}
                        onCheckedChange={() => handleFlavorToggle(flavor.id)}
                        disabled={!selectedFlavors.has(flavor.id) && selectedFlavors.size >= maxFlavors}
                      />
                      <Label
                        htmlFor={`flavor-${flavor.id}`}
                        className="cursor-pointer font-normal"
                      >
                        {flavor.name}
                        {flavor.description && (
                          <span className="text-xs text-muted-foreground block">
                            {flavor.description}
                          </span>
                        )}
                      </Label>
                    </div>
                    {flavor.price > 0 && (
                      <span className="text-sm font-medium text-muted-foreground">
                        + R$ {flavor.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {selectedFlavors.size === 0 && (
                <p className="text-xs text-destructive">
                  Selecione pelo menos 1 sabor
                </p>
              )}
            </div>
          )}

          {addons && addons.length > 0 && (
            <div className="space-y-3">
              <Label>Adicionais</Label>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {categories
                  .filter(cat => cat.is_active && addons.some(addon => addon.category_id === cat.id && addon.is_available))
                  .map((category) => (
                    <div key={category.id} className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">{category.name}</h4>
                      <div className="space-y-2">
                        {addons
                          .filter(addon => addon.category_id === category.id && addon.is_available)
                          .map((addon) => (
                            <div
                              key={addon.id}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
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
                  ))}
                
                {addons.filter(addon => !addon.category_id && addon.is_available).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Outros</h4>
                    <div className="space-y-2">
                      {addons
                        .filter(addon => !addon.category_id && addon.is_available)
                        .map((addon) => (
                          <div
                            key={addon.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
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
          <Button 
            onClick={handleAdd}
            disabled={hasFlavors && selectedFlavors.size === 0}
          >
            Adicionar ao Carrinho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
