import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, ShoppingCart, Store } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { AddToCartDialog } from "@/components/cart/AddToCartDialog";
import { useState } from "react";

interface ProductDetailsDialogProps {
  product: any;
  store: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailsDialog({ product, store, open, onOpenChange }: ProductDetailsDialogProps) {
  const { addToCart } = useCart();
  const [showAddToCart, setShowAddToCart] = useState(false);

  if (!product || !store) return null;

  const currentPrice = product.promotional_price || product.price || 0;
  const hasDiscount = product.promotional_price && product.promotional_price < product.price;

  const handleAddToCart = (quantity: number, observation: string, selectedAddons: Array<{ id: string; name: string; price: number }>) => {
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
      selectedAddons
    );
    setShowAddToCart(false);
    onOpenChange(false);
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] md:max-w-3xl lg:max-w-4xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto p-4 md:p-6 [&>button]:w-10 [&>button]:h-10 [&>button]:rounded-full [&>button]:bg-orange-500 [&>button]:hover:bg-orange-600 [&>button]:border-2 [&>button]:border-orange-400 [&>button]:shadow-lg [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button>svg]:w-6 [&>button>svg]:h-6 [&>button>svg]:text-white">
          <DialogHeader>
            <DialogTitle className="sr-only">{product.name}</DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {/* Imagem do Produto */}
            <div className="relative">
              <img
                src={product.image_url || '/placeholder.svg'}
                alt={product.name}
                className="w-full h-48 md:aspect-square object-cover rounded-lg"
              />
              {hasDiscount && (
                <Badge className="absolute top-4 right-4 bg-destructive text-destructive-foreground">
                  {Math.round(((product.price - product.promotional_price) / product.price) * 100)}% OFF
                </Badge>
              )}
            </div>

            {/* Detalhes do Produto */}
            <div className="space-y-4 md:space-y-6">
              {/* Info da Loja */}
              <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-muted/50 rounded-lg">
                {store.logo_url ? (
                  <img src={store.logo_url} alt={store.name} className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Store className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-xs md:text-sm">{store.name}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">{product.category}</p>
                </div>
              </div>

              {/* Nome do Produto */}
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-foreground mb-1 md:mb-2">{product.name}</h2>
                {product.description && (
                  <p className="text-sm md:text-base text-muted-foreground">{product.description}</p>
                )}
              </div>

              {/* Preço */}
              <div className="space-y-1 md:space-y-2">
                {hasDiscount && (
                  <p className="text-xs md:text-sm text-muted-foreground line-through">
                    De R$ {Number(product.price).toFixed(2)}
                  </p>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl md:text-3xl font-bold text-primary">
                    R$ {Number(currentPrice).toFixed(2)}
                  </span>
                  {hasDiscount && (
                    <Badge variant="secondary" className="text-[10px] md:text-xs">
                      Economize R$ {Number(product.price - product.promotional_price).toFixed(2)}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 md:gap-3">
                <Button
                  onClick={() => setShowAddToCart(true)}
                  className="flex-1 text-xs md:text-sm"
                  size="default"
                >
                  <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Adicionar ao Carrinho</span>
                  <span className="sm:hidden">Adicionar</span>
                </Button>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  size="default"
                >
                  <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>

              {/* Informações Adicionais */}
              {product.additional_info && (
                <div className="p-3 md:p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs md:text-sm text-muted-foreground">{product.additional_info}</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showAddToCart && (
        <AddToCartDialog
          product={product}
          open={showAddToCart}
          onOpenChange={setShowAddToCart}
          onAdd={handleAddToCart}
        />
      )}
    </>
  );
}
