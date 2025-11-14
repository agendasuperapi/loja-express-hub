import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, ShoppingCart, Store, Minus, Plus, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useProductAddons } from "@/hooks/useProductAddons";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProductDetailsDialogProps {
  product: any;
  store: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailsDialog({ product, store, open, onOpenChange }: ProductDetailsDialogProps) {
  const { addToCart } = useCart();
  const isMobile = useIsMobile();
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const { addons } = useProductAddons(product?.id);

  useEffect(() => {
    if (!open) {
      setQuantity(1);
      setObservation("");
      setSelectedAddons(new Set());
    }
  }, [open]);

  if (!product || !store) return null;

  const currentPrice = product.promotional_price || product.price || 0;
  const hasDiscount = product.promotional_price && product.promotional_price < product.price;

  const handleAddonToggle = (addonId: string) => {
    const newSelected = new Set(selectedAddons);
    if (newSelected.has(addonId)) {
      newSelected.delete(addonId);
    } else {
      newSelected.add(addonId);
    }
    setSelectedAddons(newSelected);
  };

  const addonsTotal = addons
    ?.filter(addon => selectedAddons.has(addon.id))
    .reduce((sum, addon) => sum + addon.price, 0) || 0;
  const total = (currentPrice + addonsTotal) * quantity;

  const handleAddToCart = () => {
    const addonsToAdd = addons
      ?.filter(addon => selectedAddons.has(addon.id))
      .map(addon => ({ id: addon.id, name: addon.name, price: addon.price })) || [];
    
    addToCart(
      product.id,
      product.name,
      product.price,
      store.id,
      store.name,
      quantity,
      product.promotional_price,
      product.image_url,
      observation,
      store.slug,
      addonsToAdd
    );
    onOpenChange(false);
    toast({
      title: "Adicionado ao carrinho!",
      description: `${quantity}x ${product.name}`,
    });
  };

  const handleShare = async () => {
    const shareUrl = `https://appofertas.lovable.app/p/${product.short_id}`;
    const shareText = `🛍️ ${product.name}\n💰 R$ ${Number(currentPrice).toFixed(2)}\n\n${product.description || ''}\n\n📍 ${store.name}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${product.name} - ${store.name}`,
          text: shareText,
          url: shareUrl,
        });
        toast({
          title: "Compartilhado com sucesso!",
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        toast({
          title: "Link copiado!",
          description: "O link foi copiado para a área de transferência.",
        });
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  const productContent = (
    <>
      {/* Imagem do Produto */}
      <div className="relative w-full -mt-0">
        <img
          src={product.image_url || '/placeholder.svg'}
          alt={product.name}
          className="w-full h-56 md:h-64 object-cover rounded-t-3xl md:rounded-2xl"
        />
        {hasDiscount && (
          <Badge className="absolute top-4 right-4 bg-destructive text-destructive-foreground text-base px-3 py-1">
            {Math.round(((product.price - product.promotional_price) / product.price) * 100)}% OFF
          </Badge>
        )}
      </div>

      {/* Info da Loja */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
        {store.logo_url ? (
          <img src={store.logo_url} alt={store.name} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Store className="w-6 h-6 text-primary" />
          </div>
        )}
        <div>
          <p className="font-semibold text-sm">{store.name}</p>
          <p className="text-xs text-muted-foreground">{product.category}</p>
        </div>
      </div>

      {/* Nome e Descrição */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1.5">{product.name}</h2>
        {product.description && (
          <p className="text-sm text-muted-foreground">{product.description}</p>
        )}
      </div>

      {/* Preço */}
      <div className="space-y-1.5">
        {hasDiscount && (
          <p className="text-xs text-muted-foreground line-through">
            De R$ {Number(product.price).toFixed(2)}
          </p>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">
            R$ {Number(currentPrice).toFixed(2)}
          </span>
          {hasDiscount && (
            <Badge variant="secondary" className="text-xs">
              Economize R$ {Number(product.price - product.promotional_price).toFixed(2)}
            </Badge>
          )}
        </div>
      </div>

      {/* Quantidade */}
      <div className="space-y-1.5">
        <Label htmlFor="quantity" className="text-sm font-semibold">Quantidade</Label>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="h-9 w-9"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="text-center w-16 h-9 text-base font-semibold"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setQuantity(quantity + 1)}
            className="h-9 w-9"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Adicionais */}
      {addons && addons.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Adicionais</Label>
          <div className="space-y-1.5">
            {addons.filter(addon => addon.is_available).map((addon) => (
              <div
                key={addon.id}
                className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2.5 flex-1">
                  <Checkbox
                    id={addon.id}
                    checked={selectedAddons.has(addon.id)}
                    onCheckedChange={() => handleAddonToggle(addon.id)}
                  />
                  <Label htmlFor={addon.id} className="flex-1 cursor-pointer text-sm">
                    {addon.name}
                  </Label>
                </div>
                <span className="text-sm font-semibold text-primary">
                  + R$ {addon.price.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observação */}
      <div className="space-y-1.5">
        <Label htmlFor="observation" className="text-sm font-semibold">
          Observações (opcional)
        </Label>
        <Textarea
          id="observation"
          placeholder="Ex: Sem cebola, bem passado..."
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          className="min-h-16 resize-none text-sm"
        />
      </div>

      {/* Informações Adicionais */}
      {product.additional_info && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">{product.additional_info}</p>
        </div>
      )}
    </>
  );

  const footerContent = (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-base font-semibold">
        <span>Total:</span>
        <span className="text-xl text-primary">R$ {total.toFixed(2)}</span>
      </div>
      <div className="flex gap-2.5">
        <Button
          onClick={handleShare}
          variant="outline"
          size="lg"
          className="w-12"
        >
          <Share2 className="w-4 h-4" />
        </Button>
        <Button
          onClick={handleAddToCart}
          className="flex-1 text-sm h-11"
          size="lg"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Adicionar ao Carrinho
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[88vh] rounded-t-3xl">
          <div className="flex flex-col h-full overflow-hidden relative">
            <DrawerTitle className="sr-only">{product.name}</DrawerTitle>
            
            {/* Botão de fechar flutuante sobre a imagem */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="absolute top-2 right-2 z-10 rounded-full h-12 w-12 bg-background/80 backdrop-blur-sm hover:bg-background/90"
            >
              <X className="w-6 h-6" />
            </Button>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 pb-4 px-4">
                {productContent}
              </div>
            </div>

            <div className="flex-shrink-0 border-t bg-background p-3">
              {footerContent}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-5 pt-4 pb-4">
          <DialogTitle className="sr-only">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5">
          <div className="space-y-3 pb-4">
            {productContent}
          </div>
        </div>

        <div className="border-t bg-background px-5 py-3">
          {footerContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
