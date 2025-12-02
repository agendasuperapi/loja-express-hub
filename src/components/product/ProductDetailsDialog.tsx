import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, ShoppingCart, Store, Minus, Plus, X, Check } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useProductAddons } from "@/hooks/useProductAddons";
import { useProductFlavors } from "@/hooks/useProductFlavors";
import { useProductSizes } from "@/hooks/useProductSizes";
import { useAddonCategories } from "@/hooks/useAddonCategories";
import { useSizeCategories } from "@/hooks/useSizeCategories";
import { useProductImages } from "@/hooks/useProductImages";
import { useProductColors } from "@/hooks/useProductColors";
import { useColorSizeVariants } from "@/hooks/useColorSizeVariants";
import { useState, useEffect, useRef, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { DialogFooter } from "@/components/ui/dialog";
import { ProductImageGallery } from "./ProductImageGallery";
interface ProductDetailsDialogProps {
  product: any;
  store: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export function ProductDetailsDialog({
  product,
  store,
  open,
  onOpenChange
}: ProductDetailsDialogProps) {
  const {
    addToCart
  } = useCart();
  const isMobile = useIsMobile();
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [addonQuantities, setAddonQuantities] = useState<Map<string, number>>(new Map());
  const [selectedAddonsByCategory, setSelectedAddonsByCategory] = useState<Record<string, Set<string>>>({});
  const [selectedFlavors, setSelectedFlavors] = useState<Set<string>>(new Set());
  const [flavorQuantities, setFlavorQuantities] = useState<Map<string, number>>(new Map());
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedSizesByCategory, setSelectedSizesByCategory] = useState<Record<string, Set<string>>>({});
  const [sizeQuantities, setSizeQuantities] = useState<Map<string, number>>(new Map());
  const [selectedColor, setSelectedColor] = useState<string>("");
  const {
    addons
  } = useProductAddons(product?.id);
  const {
    flavors
  } = useProductFlavors(product?.id);
  const {
    sizes
  } = useProductSizes(product?.id);
  const { categories: sizeCategories } = useSizeCategories(store?.id);
  const {
    categories
  } = useAddonCategories(store?.id);
  const {
    images: productImages
  } = useProductImages(product?.id);
  const {
    colors
  } = useProductColors(product?.id);
  const { variants } = useColorSizeVariants(product?.id);
  const observationRef = useRef<HTMLTextAreaElement>(null);
  const drawerContentRef = useRef<HTMLDivElement>(null);
  const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
  const [tempObservation, setTempObservation] = useState("");
  const handleObservationClick = () => {
    if (isMobile) {
      setTempObservation(observation);
      setIsObservationModalOpen(true);
    }
  };
  const handleObservationSave = () => {
    setObservation(tempObservation);
    setIsObservationModalOpen(false);
  };
  const handleObservationCancel = () => {
    setIsObservationModalOpen(false);
  };
  const maxFlavors = product?.max_flavors || 1;
  const hasFlavors = product?.is_pizza && flavors && flavors.length > 0;
  const hasSizes = product?.has_sizes && sizes && sizes.length > 0;
  const hasColors = product?.has_colors && colors && colors.length > 0;
  
  // Filter colors and sizes based on variant availability
  const availableColors = useMemo(() => {
    if (!hasColors) return [];
    const baseAvailable = colors?.filter(c => c.is_available) || [];
    
    // If no size selected or no sizes at all, show all available colors
    if (!selectedSize || !hasSizes || variants.length === 0) {
      return baseAvailable;
    }
    
    // Filter colors that have available variants with the selected size
    return baseAvailable.filter(color => {
      const variant = variants.find(v => 
        v.color_id === color.id && 
        v.size_id === selectedSize
      );
      return variant?.is_available !== false;
    });
  }, [colors, selectedSize, variants, hasColors, hasSizes]);

  const availableSizes = useMemo(() => {
    if (!hasSizes) return [];
    const baseAvailable = sizes?.filter(s => s.is_available) || [];
    
    // If no color selected or no colors at all, show all available sizes
    if (!selectedColor || !hasColors || variants.length === 0) {
      return baseAvailable;
    }
    
    // Filter sizes that have available variants with the selected color
    return baseAvailable.filter(size => {
      const variant = variants.find(v => 
        v.color_id === selectedColor && 
        v.size_id === size.id
      );
      return variant?.is_available !== false;
    });
  }, [sizes, selectedColor, variants, hasSizes, hasColors]);
  
  // Check if current color+size combination is available
  const isCurrentCombinationAvailable = useMemo(() => {
    if (!selectedColor || !selectedSize || variants.length === 0) return true;
    
    const variant = variants.find(v => 
      v.color_id === selectedColor && 
      v.size_id === selectedSize
    );
    
    return variant?.is_available !== false;
  }, [selectedColor, selectedSize, variants]);
  
  useEffect(() => {
    if (!open) {
      setQuantity(1);
      setObservation("");
      setSelectedAddons(new Set());
      setAddonQuantities(new Map());
      setSelectedFlavors(new Set());
      setFlavorQuantities(new Map());
      setSelectedAddonsByCategory({});
      setSelectedSize("");
      setSelectedSizesByCategory({});
      setSizeQuantities(new Map());
      setSelectedColor("");
    }
  }, [open]);
  
  if (!product || !store) return null;
  
  // Calculate current price considering size
  const selectedSizeData = availableSizes.find(s => s.id === selectedSize);
  const basePrice = selectedSizeData ? selectedSizeData.price : (product.promotional_price || product.price || 0);
  
  // Calculate sizes total considering quantities
  const sizesTotal = Object.entries(selectedSizesByCategory).reduce((total, [categoryId, sizeIds]) => {
    return total + Array.from(sizeIds).reduce((categoryTotal, sizeId) => {
      const size = availableSizes.find(s => s.id === sizeId);
      if (!size) return categoryTotal;
      const qty = sizeQuantities.get(sizeId) || 1;
      return categoryTotal + (size.price * qty);
    }, 0);
  }, 0);
  
  // If there are sizes selected with quantities, use sizesTotal, otherwise use basePrice
  const currentPrice = sizesTotal > 0 ? sizesTotal : basePrice;
  const hasDiscount = !selectedSizeData && product.promotional_price && product.promotional_price < product.price;
  const handleAddonToggle = (addonId: string, categoryId?: string, allowQuantity?: boolean) => {
    const newSelected = new Set(selectedAddons);
    const newByCategory = {
      ...selectedAddonsByCategory
    };
    const newQuantities = new Map(addonQuantities);

    // Check if category allows only single selection (max_items === 1)
    const category = categoryId ? categories?.find(c => c.id === categoryId) : null;
    const isSingleSelection = category?.max_items === 1;
    if (isSingleSelection && categoryId) {
      // For single selection categories (radio button behavior), always replace with new selection
      const previousSelections = newByCategory[categoryId] || new Set();

      // Clear all previous selections from this category
      previousSelections.forEach(id => {
        newSelected.delete(id);
        newQuantities.delete(id);
      });

      // Set the new selection
      newSelected.add(addonId);
      newByCategory[categoryId] = new Set([addonId]);
      if (allowQuantity) {
        newQuantities.set(addonId, 1);
      }
    } else {
      // Normal behavior for multiple selection categories
      if (newSelected.has(addonId)) {
        // Se já estava selecionado, apenas remove
        newSelected.delete(addonId);
        newQuantities.delete(addonId);
        if (categoryId) {
          const categorySet = new Set(newByCategory[categoryId] || []);
          categorySet.delete(addonId);
          newByCategory[categoryId] = categorySet;
        }
      } else {
        if (categoryId) {
          const categorySet = new Set(newByCategory[categoryId] || []);

          // Check category limit
          if (category?.max_items && categorySet.size >= category.max_items) {
            toast({
              title: "Limite atingido",
              description: `Você pode selecionar no máximo ${category.max_items} ${category.max_items === 1 ? 'item' : 'itens'} de ${category.name}`,
              variant: "destructive"
            });
            return;
          }
          categorySet.add(addonId);
          newByCategory[categoryId] = categorySet;
        }
        newSelected.add(addonId);
        if (allowQuantity) {
          newQuantities.set(addonId, 1);
        }
      }
    }
    setSelectedAddons(newSelected);
    setSelectedAddonsByCategory(newByCategory);
    setAddonQuantities(newQuantities);
  };
  const handleAddonQuantityChange = (addonId: string, newQuantity: number) => {
    const newQuantities = new Map(addonQuantities);
    if (newQuantity > 0) {
      newQuantities.set(addonId, newQuantity);
    } else {
      newQuantities.delete(addonId);
    }
    setAddonQuantities(newQuantities);
  };
  const handleFlavorToggle = (flavorId: string) => {
    const newSelected = new Set(selectedFlavors);
    const newQuantities = new Map(flavorQuantities);
    
    if (newSelected.has(flavorId)) {
      newSelected.delete(flavorId);
      newQuantities.delete(flavorId);
    } else {
      if (newSelected.size < maxFlavors) {
        newSelected.add(flavorId);
        newQuantities.set(flavorId, 1);
      }
    }
    setSelectedFlavors(newSelected);
    setFlavorQuantities(newQuantities);
  };
  const addonsTotal = addons?.filter(addon => selectedAddons.has(addon.id)).reduce((sum, addon) => {
    const qty = addonQuantities.get(addon.id) || 1;
    return sum + addon.price * qty;
  }, 0) || 0;
  const flavorsTotal = flavors?.filter(flavor => selectedFlavors.has(flavor.id)).reduce((sum, flavor) => {
    const qty = flavorQuantities.get(flavor.id) || 1;
    return sum + flavor.price * qty;
  }, 0) || 0;
  const total = (currentPrice + addonsTotal + flavorsTotal) * quantity;
  const handleAddToCart = () => {
    // Validate color+size combination availability
    if (hasColors && hasSizes && selectedColor && selectedSize && !isCurrentCombinationAvailable) {
      toast({
        title: "Combinação indisponível",
        description: "A combinação de cor e tamanho selecionada não está disponível no momento",
        variant: "destructive"
      });
      return;
    }
    
    // Validate size selection if product has sizes
    if (hasSizes && !selectedSize) {
      toast({
        title: "Selecione uma variação",
        description: "É necessário selecionar uma variação para este produto",
        variant: "destructive"
      });
      return;
    }
    
    // Validate color selection if product has colors
    if (hasColors && !selectedColor) {
      toast({
        title: "Selecione uma cor",
        description: "É necessário selecionar uma cor para este produto",
        variant: "destructive"
      });
      return;
    }
    
    if (hasFlavors && selectedFlavors.size === 0) {
      toast({
        title: "Selecione os sabores",
        description: "É necessário selecionar pelo menos 1 sabor",
        variant: "destructive"
      });
      return;
    }

    // Validate addon category limits
    if (categories && categories.length > 0) {
      for (const category of categories) {
        if (!category.is_active) continue;
        const categoryAddons = addons?.filter(a => a.category_id === category.id && a.is_available) || [];
        if (categoryAddons.length === 0) continue;
        const selectedCount = selectedAddonsByCategory[category.id]?.size || 0;
        if (category.min_items > 0 && selectedCount < category.min_items) {
          toast({
            title: "Seleção obrigatória",
            description: `Você precisa selecionar pelo menos ${category.min_items} ${category.min_items === 1 ? 'item' : 'itens'} de ${category.name}`,
            variant: "destructive"
          });
          return;
        }
      }
    }

    // Validate size category limits
    if (sizeCategories && sizeCategories.length > 0) {
      for (const category of sizeCategories) {
        if (!category.is_active) continue;
        const categorySizes = availableSizes.filter(s => s.category_id === category.id);
        if (categorySizes.length === 0) continue;
        const selectedCount = selectedSizesByCategory[category.id]?.size || 0;
        if (category.min_items > 0 && selectedCount < category.min_items) {
          toast({
            title: "Seleção obrigatória",
            description: `Você precisa selecionar pelo menos ${category.min_items} ${category.min_items === 1 ? 'item' : 'itens'} de ${category.name}`,
            variant: "destructive"
          });
          return;
        }
      }
    }
    const addonsToAdd = addons?.filter(addon => selectedAddons.has(addon.id)).map(addon => {
      const qty = addonQuantities.get(addon.id) || 1;
      return {
        id: addon.id,
        name: addon.name,
        price: addon.price,
        quantity: qty
      };
    }) || [];
    const flavorsToAdd = flavors?.filter(flavor => selectedFlavors.has(flavor.id)).map(flavor => {
      const qty = flavorQuantities.get(flavor.id) || 1;
      return {
        id: flavor.id,
        name: flavor.name,
        price: flavor.price,
        quantity: qty
      };
    }) || [];
    
    const sizeToAdd = selectedSizeData ? {
      id: selectedSizeData.id,
      name: selectedSizeData.name,
      price: selectedSizeData.price,
      quantity: sizeQuantities.get(selectedSizeData.id) || 1
    } : undefined;
    
    // Handle selected color
    const selectedColorData = availableColors.find(c => c.id === selectedColor);
    const colorToAdd = selectedColorData ? {
      id: selectedColorData.id,
      name: selectedColorData.name,
      hex_code: selectedColorData.hex_code,
      price: selectedColorData.price_adjustment
    } : undefined;
    
    // Use primary image from gallery if available, otherwise fallback to product.image_url
    const primaryImage = productImages.find(img => img.is_primary)?.image_url || product.image_url;
    
    addToCart(product.id, product.name, product.price, store.id, store.name, quantity, product.promotional_price, primaryImage, observation, store.slug, addonsToAdd, flavorsToAdd, sizeToAdd, colorToAdd);
    onOpenChange(false);
    toast({
      title: "Adicionado ao carrinho!",
      description: `${quantity}x ${product.name}`
    });
  };
  const handleShare = async () => {
    const shareUrl = `https://ofertas.app/p/${product.short_id}`;
    const shareText = `🛍️ ${product.name}\n💰 R$ ${Number(currentPrice).toFixed(2)}\n\n${product.description || ''}\n\n📍 ${store.name}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${product.name} - ${store.name}`,
          text: shareText,
          url: shareUrl
        });
        toast({
          title: "Compartilhado com sucesso!"
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        toast({
          title: "Link copiado!",
          description: "O link foi copiado para a área de transferência."
        });
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };
  // Always show all product images
  const imagesToDisplay = productImages.length > 0 
    ? productImages 
    : (product.image_url ? [{ 
        id: 'fallback', 
        image_url: product.image_url, 
        display_order: 0, 
        is_primary: true 
      }] : []);

  // Get the selected color's image ID
  const selectedColorData = availableColors.find(c => c.id === selectedColor);
  const selectedColorImageId = selectedColorData?.image_id;

  // Handle image change - find and select the color that matches the image
  const handleImageChange = (imageId: string) => {
    // Find color that has this image linked
    const colorWithImage = availableColors.find(color => color.image_id === imageId);
    if (colorWithImage) {
      setSelectedColor(colorWithImage.id);
    } else {
      // If no color is linked to this image, deselect the current color
      setSelectedColor(null);
    }
  };

  const productContent = <>
      {/* Galeria de Imagens do Produto */}
      <ProductImageGallery
        images={imagesToDisplay}
        productName={product.name}
        hasDiscount={hasDiscount}
        discountPercentage={hasDiscount ? Math.round((product.price - product.promotional_price) / product.price * 100) : undefined}
        onImageChange={handleImageChange}
        selectedImageId={selectedColorImageId}
      />

      <div className="md:px-5 md:pt-4">
      {/* Info da Loja */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl mx-4 md:mx-0">
        {store.logo_url ? <img src={store.logo_url} alt={store.name} className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Store className="w-6 h-6 text-primary" />
          </div>}
        <div>
          <p className="font-semibold text-sm">{store.name}</p>
          <p className="text-xs text-muted-foreground">{product.category}</p>
        </div>
      </div>

      {/* Nome e Descrição */}
      <div className="px-4 md:px-0">
        <h2 className="text-xl font-bold text-foreground mb-1.5">{product.name}</h2>
        {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}
      </div>

      {/* Preço */}
      <div className="space-y-1.5 px-4 md:px-0">
        {hasDiscount && <p className="text-xs text-muted-foreground line-through">
            De R$ {Number(product.price).toFixed(2)}
          </p>}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">
            R$ {Number(currentPrice).toFixed(2)}
          </span>
          {hasDiscount && <Badge variant="secondary" className="text-xs">
              Economize R$ {Number(product.price - product.promotional_price).toFixed(2)}
            </Badge>}
        </div>
      </div>

      {/* Cores */}
      {hasColors && (
        <div className="space-y-2 px-4 md:px-0">
          <Label className="text-sm font-semibold">
            Escolha uma cor
          </Label>
          <div className="flex flex-wrap gap-2">
            {availableColors.map((color) => {
              const isSelected = selectedColor === color.id;
              return (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                  title={color.name}
                >
                  <div
                    className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                    style={{ backgroundColor: color.hex_code }}
                  />
                  <span className="text-sm font-medium">{color.name}</span>
                  {color.price_adjustment !== 0 && (
                    <span className="text-xs text-muted-foreground">
                      {color.price_adjustment > 0 ? '+' : ''}R$ {color.price_adjustment.toFixed(2)}
                    </span>
                  )}
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary absolute -top-1 -right-1 bg-background rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Warning for unavailable combination */}
          {selectedColor && selectedSize && !isCurrentCombinationAvailable && (
            <div className="p-3 bg-destructive/10 border-2 border-destructive/30 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Esta combinação de cor e tamanho não está disponível no momento
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Escolha outra cor ou tamanho para continuar
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quantidade */}
      <div className="space-y-1.5 px-4 md:px-0">
        <Label htmlFor="quantity" className="text-sm font-semibold">Quantidade</Label>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-9 w-9">
            <Minus className="w-4 h-4" />
          </Button>
          <Input id="quantity" type="number" min="1" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="text-center w-16 h-9 text-base font-semibold" />
          <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)} className="h-9 w-9">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tamanhos/Variações */}
      {hasSizes && (
        <div className="space-y-2 px-4 md:px-0">
          <Label className="text-sm font-semibold">
            Variações
            <span className="text-destructive ml-1">*</span>
          </Label>
          {sizeCategories && sizeCategories.length > 0 ? (
            <>
              {sizeCategories
                .filter(cat => cat.is_active && availableSizes.some(size => size.category_id === cat.id))
                .sort((a, b) => a.display_order - b.display_order)
                .map((category) => {
                  const categorySizes = availableSizes.filter(size => size.category_id === category.id);
                  if (categorySizes.length === 0) return null;

                  return (
                    <div key={category.id} className="space-y-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-foreground">
                            {category.name}
                            {category.min_items > 0 && <span className="text-destructive ml-1">*</span>}
                          </p>
                          {category.max_items !== null && category.max_items > 1 && (
                            <Badge 
                              variant={(selectedSizesByCategory[category.id]?.size || 0) >= category.min_items ? "default" : "secondary"} 
                              className="text-xs"
                            >
                              {selectedSizesByCategory[category.id]?.size || 0}/{category.max_items}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {category.max_items === 1 
                            ? "Escolha Apenas 1 opção" 
                            : <>
                                {category.min_items > 0 ? `Mín: ${category.min_items} ${category.min_items === 1 ? 'opção' : 'opções'}` : 'Escolha'}
                                {category.max_items !== null && category.max_items > 1 && ` até ${category.max_items} opções`}
                              </>
                          }
                        </p>
                      </div>
                      
                      {category.max_items === 1 ? (
                        <RadioGroup 
                          value={Array.from(selectedSizesByCategory[category.id] || [])[0] || ''} 
                          onValueChange={(value) => {
                            const newByCategory = { ...selectedSizesByCategory };
                            newByCategory[category.id] = new Set([value]);
                            setSelectedSizesByCategory(newByCategory);
                            setSelectedSize(value);
                          }}
                        >
                          <div className="space-y-1.5">
                            {categorySizes.map(size => {
                              const isSelected = selectedSizesByCategory[category.id]?.has(size.id);
                              return (
                                 <div
                                  key={size.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-primary/10 border-primary shadow-sm'
                                      : 'bg-muted/50 border-transparent hover:border-primary/30'
                                  }`}
                                  onClick={() => {
                                    const newByCategory = { ...selectedSizesByCategory };
                                    newByCategory[category.id] = new Set([size.id]);
                                    setSelectedSizesByCategory(newByCategory);
                                    setSelectedSize(size.id);
                                    // Initialize quantity
                                    setSizeQuantities(prev => {
                                      const newMap = new Map(prev);
                                      newMap.set(size.id, 1);
                                      return newMap;
                                    });
                                  }}
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <RadioGroupItem value={size.id} id={size.id} />
                                    <Label htmlFor={size.id} className="flex-1 cursor-pointer">
                                      <span className="font-semibold">{size.name}</span>
                                      {size.description && (
                                        <span className="text-xs text-muted-foreground block">{size.description}</span>
                                      )}
                                    </Label>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg font-bold text-primary">
                                      R$ {size.price.toFixed(2)}
                                    </span>
                                    {isSelected && (
                                      <div className="flex items-center gap-1">
                                        <Button 
                                          variant="outline" 
                                          size="icon" 
                                          className="h-6 w-6"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSizeQuantities(prev => {
                                              const newMap = new Map(prev);
                                              const current = newMap.get(size.id) || 1;
                                              if (current > 1) {
                                                newMap.set(size.id, current - 1);
                                              }
                                              return newMap;
                                            });
                                          }}
                                        >
                                          <Minus className="w-3 h-3" />
                                        </Button>
                                        <span className="text-xs font-semibold min-w-[1.5rem] text-center">
                                          {sizeQuantities.get(size.id) || 1}
                                        </span>
                                        <Button 
                                          variant="outline" 
                                          size="icon" 
                                          className="h-6 w-6"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSizeQuantities(prev => {
                                              const newMap = new Map(prev);
                                              const current = newMap.get(size.id) || 1;
                                              newMap.set(size.id, current + 1);
                                              return newMap;
                                            });
                                          }}
                                        >
                                          <Plus className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </RadioGroup>
                      ) : (
                        <div className="space-y-1.5">
                          {categorySizes.map(size => {
                            const isSelected = selectedSizesByCategory[category.id]?.has(size.id);
                            return (
                              <div
                                key={size.id}
                                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                  isSelected
                                    ? 'bg-primary/10 border-primary shadow-sm'
                                    : 'bg-muted/50 border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <Checkbox
                                    id={size.id}
                                    checked={isSelected}
                                    onCheckedChange={() => {
                                      const newByCategory = { ...selectedSizesByCategory };
                                      const categorySet = new Set(newByCategory[category.id] || []);
                                      
                                      if (categorySet.has(size.id)) {
                                        categorySet.delete(size.id);
                                        setSizeQuantities(prev => {
                                          const newMap = new Map(prev);
                                          newMap.delete(size.id);
                                          return newMap;
                                        });
                                      } else {
                                        if (category.max_items && categorySet.size >= category.max_items) {
                                          toast({
                                            title: "Limite atingido",
                                            description: `Você pode selecionar no máximo ${category.max_items} ${category.max_items === 1 ? 'item' : 'itens'} de ${category.name}`,
                                            variant: "destructive"
                                          });
                                          return;
                                        }
                                        categorySet.add(size.id);
                                        // Always initialize quantity to 1
                                        setSizeQuantities(prev => {
                                          const newMap = new Map(prev);
                                          newMap.set(size.id, 1);
                                          return newMap;
                                        });
                                      }
                                      
                                      newByCategory[category.id] = categorySet;
                                      setSelectedSizesByCategory(newByCategory);
                                      
                                      // Update selectedSize with first selected
                                      if (categorySet.size > 0) {
                                        setSelectedSize(Array.from(categorySet)[0]);
                                      } else {
                                        setSelectedSize("");
                                      }
                                    }}
                                  />
                                  <Label htmlFor={size.id} className="flex-1 cursor-pointer">
                                    <span className="font-semibold">{size.name}</span>
                                    {size.description && (
                                      <span className="text-xs text-muted-foreground block">{size.description}</span>
                                    )}
                                  </Label>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-lg font-bold text-primary">
                                    R$ {size.price.toFixed(2)}
                                  </span>
                                  {isSelected && (
                                    <div className="flex items-center gap-1">
                                      <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-6 w-6"
                                        onClick={() => {
                                          setSizeQuantities(prev => {
                                            const newMap = new Map(prev);
                                            const current = newMap.get(size.id) || 1;
                                            if (current > 1) {
                                              newMap.set(size.id, current - 1);
                                            }
                                            return newMap;
                                          });
                                        }}
                                      >
                                        <Minus className="w-3 h-3" />
                                      </Button>
                                      <span className="text-xs font-semibold min-w-[1.5rem] text-center">
                                        {sizeQuantities.get(size.id) || 1}
                                      </span>
                                      <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-6 w-6"
                                        onClick={() => {
                                          setSizeQuantities(prev => {
                                            const newMap = new Map(prev);
                                            const current = newMap.get(size.id) || 1;
                                            newMap.set(size.id, current + 1);
                                            return newMap;
                                          });
                                        }}
                                      >
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              
              {/* Tamanhos sem categoria */}
              {availableSizes.filter(size => !size.category_id).length > 0 && (
                <RadioGroup value={selectedSize} onValueChange={setSelectedSize} className="space-y-2">
                  {availableSizes.filter(size => !size.category_id).map(size => {
                    const isSelected = selectedSize === size.id;
                    return (
                      <div
                        key={size.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/10 border-primary shadow-sm'
                            : 'bg-muted/50 border-transparent hover:border-primary/30'
                        }`}
                        onClick={() => {
                          setSelectedSize(size.id);
                          setSizeQuantities(prev => {
                            const newMap = new Map(prev);
                            newMap.set(size.id, 1);
                            return newMap;
                          });
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <RadioGroupItem value={size.id} id={size.id} />
                          <Label htmlFor={size.id} className="flex-1 cursor-pointer">
                            <span className="font-semibold">{size.name}</span>
                            {size.description && (
                              <span className="text-xs text-muted-foreground block">{size.description}</span>
                            )}
                          </Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-primary">
                            R$ {size.price.toFixed(2)}
                          </span>
                          {isSelected && (
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSizeQuantities(prev => {
                                    const newMap = new Map(prev);
                                    const current = newMap.get(size.id) || 1;
                                    if (current > 1) {
                                      newMap.set(size.id, current - 1);
                                    }
                                    return newMap;
                                  });
                                }}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="text-xs font-semibold min-w-[1.5rem] text-center">
                                {sizeQuantities.get(size.id) || 1}
                              </span>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSizeQuantities(prev => {
                                    const newMap = new Map(prev);
                                    const current = newMap.get(size.id) || 1;
                                    newMap.set(size.id, current + 1);
                                    return newMap;
                                  });
                                }}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              )}
            </>
          ) : (
            <RadioGroup value={selectedSize} onValueChange={setSelectedSize} className="space-y-2">
              {availableSizes.map(size => {
                const isSelected = selectedSize === size.id;
                return (
                  <div
                    key={size.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'bg-muted/50 border-transparent hover:border-primary/30'
                    }`}
                    onClick={() => {
                      setSelectedSize(size.id);
                      setSizeQuantities(prev => {
                        const newMap = new Map(prev);
                        newMap.set(size.id, 1);
                        return newMap;
                      });
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <RadioGroupItem value={size.id} id={size.id} />
                      <Label htmlFor={size.id} className="flex-1 cursor-pointer">
                        <span className="font-semibold">{size.name}</span>
                        {size.description && (
                          <span className="text-xs text-muted-foreground block">{size.description}</span>
                        )}
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-primary">
                        R$ {size.price.toFixed(2)}
                      </span>
                      {isSelected && (
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSizeQuantities(prev => {
                                const newMap = new Map(prev);
                                const current = newMap.get(size.id) || 1;
                                if (current > 1) {
                                  newMap.set(size.id, current - 1);
                                }
                                return newMap;
                              });
                            }}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-xs font-semibold min-w-[1.5rem] text-center">
                            {sizeQuantities.get(size.id) || 1}
                          </span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSizeQuantities(prev => {
                                const newMap = new Map(prev);
                                const current = newMap.get(size.id) || 1;
                                newMap.set(size.id, current + 1);
                                return newMap;
                              });
                            }}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          )}
          {!selectedSize && (
            <p className="text-xs text-destructive">Selecione uma variação</p>
          )}
        </div>
      )}

      {/* Sabores */}
      {hasFlavors && <div className="space-y-2 px-4 md:px-0">
          <Label className="text-sm font-semibold">
            Sabores {maxFlavors > 1 && `(escolha máx. ${maxFlavors})`}
            <span className="text-destructive ml-1">*</span>
          </Label>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {flavors?.filter(flavor => flavor.is_available).map(flavor => {
            const isSelected = selectedFlavors.has(flavor.id);
            const currentQuantity = flavorQuantities.get(flavor.id) || 1;
            return <div key={flavor.id} className={`flex items-center justify-between p-2.5 rounded-lg transition-all ${isSelected ? 'bg-primary/10 border-2 border-primary shadow-sm' : 'bg-muted/50 border-2 border-transparent'}`}>
                  <div className="flex items-center gap-2.5 flex-1">
                    <Checkbox id={flavor.id} checked={isSelected} onCheckedChange={() => handleFlavorToggle(flavor.id)} disabled={!isSelected && selectedFlavors.size >= maxFlavors} />
                    <Label htmlFor={flavor.id} className="flex-1 cursor-pointer text-sm">
                      {flavor.name}
                      {flavor.description && <span className="text-xs text-muted-foreground block">
                          {flavor.description}
                        </span>}
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {flavor.price > 0 && <span className="text-sm font-semibold text-primary">
                          + R$ {flavor.price.toFixed(2)}
                        </span>}
                      {isSelected && (
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => {
                              const newQuantities = new Map(flavorQuantities);
                              if (currentQuantity > 1) {
                                newQuantities.set(flavor.id, currentQuantity - 1);
                              }
                              setFlavorQuantities(newQuantities);
                            }}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-xs font-semibold min-w-[1.5rem] text-center">
                            {currentQuantity}
                          </span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => {
                              const newQuantities = new Map(flavorQuantities);
                              newQuantities.set(flavor.id, currentQuantity + 1);
                              setFlavorQuantities(newQuantities);
                            }}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>;
          })}
          </div>
          {selectedFlavors.size === 0 && <p className="text-xs text-destructive">
              Selecione pelo menos 1 sabor
            </p>}
        </div>}

      {/* Adicionais */}
      {addons && addons.length > 0 && <div className="space-y-2 px-4 md:px-0">
          <Label className="text-sm font-semibold">Adicionais</Label>
          <div className="space-y-1.5">
            {categories && categories.length > 0 ? <>
                {categories.filter(cat => cat.is_active && addons.some(addon => addon.category_id === cat.id && addon.is_available)).sort((a, b) => a.display_order - b.display_order).map((category, index, array) => <div key={category.id}>
                      <div className="space-y-1.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-foreground">
                              {category.name}
                              {category.min_items > 0 && <span className="text-destructive ml-1">*</span>}
                            </p>
                            {category.max_items !== null && category.max_items > 1 && <motion.div key={`${category.id}-${selectedAddonsByCategory[category.id]?.size || 0}`} initial={{
                      scale: 0.8,
                      opacity: 0
                    }} animate={{
                      scale: 1,
                      opacity: 1
                    }} transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 25
                    }}>
                                <Badge variant={(selectedAddonsByCategory[category.id]?.size || 0) >= category.min_items ? "default" : "secondary"} className="text-xs">
                                  {selectedAddonsByCategory[category.id]?.size || 0}/{category.max_items}
                                </Badge>
                              </motion.div>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {category.max_items === 1 ? "Escolha Apenas 1 opção" : <>
                                {category.min_items > 0 ? `Mín: ${category.min_items} ${category.min_items === 1 ? 'opção' : 'opções'}` : 'Escolha'}
                                {category.max_items !== null && category.max_items > 1 && ` até ${category.max_items} opções`}
                              </>}
                          </p>
                        </div>
                        
                        {category.max_items === 1 ? <RadioGroup value={Array.from(selectedAddonsByCategory[category.id] || [])[0] || ''} onValueChange={value => handleAddonToggle(value, category.id)}>
                            <div className="space-y-1.5">
                              {addons.filter(addon => addon.category_id === category.id && addon.is_available).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map(addon => {
                      const isSelected = selectedAddons.has(addon.id);
                      return <div key={addon.id} className={`flex items-center justify-between p-2.5 rounded-lg transition-all ${isSelected ? 'bg-primary/10 border-2 border-primary shadow-sm' : 'bg-muted/50 border-2 border-transparent'}`}>
                                      <div className="flex items-center gap-2.5 flex-1">
                                        <RadioGroupItem value={addon.id} id={addon.id} />
                                        <Label htmlFor={addon.id} className="flex-1 cursor-pointer text-sm">
                                          {addon.name}
                                        </Label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-primary">
                                          + R$ {addon.price.toFixed(2)}
                                        </span>
                                        {isSelected && <Check className="h-5 w-5 text-primary" />}
                                      </div>
                                    </div>;
                    })}
                            </div>
                          </RadioGroup> : <div className="space-y-1.5">
                            {addons.filter(addon => addon.category_id === category.id && addon.is_available).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map(addon => {
                    const isSelected = selectedAddons.has(addon.id);
                    return <div key={addon.id} className={`flex items-center justify-between p-2.5 rounded-lg transition-all ${isSelected ? 'bg-primary/10 border-2 border-primary shadow-sm' : 'bg-muted/50 border-2 border-transparent'}`}>
                                    <div className="flex items-center gap-2.5 flex-1">
                                      <Checkbox id={addon.id} checked={isSelected} onCheckedChange={() => handleAddonToggle(addon.id, category.id, addon.allow_quantity)} />
                                      <Label htmlFor={addon.id} className="flex-1 cursor-pointer text-sm">
                                        {addon.name}
                                    </Label>
                                  </div>
                                    <div className="flex items-center gap-2">
                                      {addon.allow_quantity && selectedAddons.has(addon.id) && <div className="flex items-center gap-1">
                                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleAddonQuantityChange(addon.id, (addonQuantities.get(addon.id) || 1) - 1)}>
                                            <Minus className="w-3 h-3" />
                                          </Button>
                                          <span className="text-xs font-medium w-6 text-center">
                                            {addonQuantities.get(addon.id) || 1}x
                                          </span>
                                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleAddonQuantityChange(addon.id, (addonQuantities.get(addon.id) || 1) + 1)}>
                                            <Plus className="w-3 h-3" />
                                          </Button>
                                        </div>}
                                      <span className="text-sm font-semibold text-primary whitespace-nowrap">
                                        + R$ {(addon.price * (addonQuantities.get(addon.id) || 1)).toFixed(2)}
                                      </span>
                                      {isSelected && <Check className="h-5 w-5 text-primary" />}
                                    </div>
                                  </div>;
                  })}
                          </div>}
                      </div>
                      {index < array.length - 1 && <Separator className="my-4" />}
                    </div>)}

                {addons.filter(addon => !addon.category_id && addon.is_available).length > 0 && <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Outros
                    </p>
                    {addons.filter(addon => !addon.category_id && addon.is_available).map(addon => {
                const isSelected = selectedAddons.has(addon.id);
                return <div key={addon.id} className={`flex items-center justify-between p-2.5 rounded-lg transition-all ${isSelected ? 'bg-primary/10 border-2 border-primary shadow-sm' : 'bg-muted/50 border-2 border-transparent'}`}>
                            <div className="flex items-center gap-2.5 flex-1">
                              <Checkbox id={addon.id} checked={isSelected} onCheckedChange={() => handleAddonToggle(addon.id, undefined, addon.allow_quantity)} />
                              <Label htmlFor={addon.id} className="flex-1 cursor-pointer text-sm">
                                {addon.name}
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              {addon.allow_quantity && isSelected && <div className="flex items-center gap-1">
                                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleAddonQuantityChange(addon.id, (addonQuantities.get(addon.id) || 1) - 1)}>
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="text-xs font-medium w-6 text-center">
                                    {addonQuantities.get(addon.id) || 1}x
                                  </span>
                                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleAddonQuantityChange(addon.id, (addonQuantities.get(addon.id) || 1) + 1)}>
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>}
                              <span className="text-sm font-semibold text-primary whitespace-nowrap">
                                + R$ {(addon.price * (addonQuantities.get(addon.id) || 1)).toFixed(2)}
                              </span>
                              {isSelected && <Check className="h-5 w-5 text-primary" />}
                            </div>
                          </div>;
              })}
                  </div>}
              </> : addons.filter(addon => addon.is_available).map(addon => {
            const isSelected = selectedAddons.has(addon.id);
            return <div key={addon.id} className={`flex items-center justify-between p-2.5 rounded-lg transition-all ${isSelected ? 'bg-primary/10 border-2 border-primary shadow-sm' : 'bg-muted/50 border-2 border-transparent'}`}>
                      <div className="flex items-center gap-2.5 flex-1">
                        <Checkbox id={addon.id} checked={isSelected} onCheckedChange={() => handleAddonToggle(addon.id, undefined, addon.allow_quantity)} />
                        <Label htmlFor={addon.id} className="flex-1 cursor-pointer text-sm">
                          {addon.name}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        {addon.allow_quantity && isSelected && <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleAddonQuantityChange(addon.id, (addonQuantities.get(addon.id) || 1) - 1)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-xs font-medium w-6 text-center">
                              {addonQuantities.get(addon.id) || 1}x
                            </span>
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleAddonQuantityChange(addon.id, (addonQuantities.get(addon.id) || 1) + 1)}>
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>}
                        <span className="text-sm font-semibold text-primary whitespace-nowrap">
                          + R$ {(addon.price * (addonQuantities.get(addon.id) || 1)).toFixed(2)}
                        </span>
                        {isSelected && <Check className="h-5 w-5 text-primary" />}
                      </div>
                    </div>;
          })}
          </div>
        </div>}


      {/* Observação */}
      <div className="space-y-1.5 px-4 md:px-0">
        <Label htmlFor="observation" className="text-sm font-semibold">
          Observações (opcional)
        </Label>
        <Textarea ref={observationRef} id="observation" placeholder="Observação..." value={observation} onChange={e => setObservation(e.target.value)} onClick={handleObservationClick} readOnly={isMobile} className="min-h-16 resize-none text-base md:text-sm cursor-pointer md:cursor-text" />
      </div>

      {/* Informações Adicionais */}
      {product.additional_info && <div className="p-3 bg-muted/50 rounded-lg mx-4 md:mx-0">
          <p className="text-xs text-muted-foreground">{product.additional_info}</p>
        </div>}
      </div>
    </>;
  const footerContent = <div className="space-y-2.5">
      <div className="flex items-center justify-between text-base font-semibold">
        <span>Total:</span>
        <span className="text-xl text-primary">R$ {total.toFixed(2)}</span>
      </div>
      <div className="flex gap-2.5">
        <Button onClick={handleShare} variant="outline" size="lg" className="w-12">
          <Share2 className="w-4 h-4" />
        </Button>
        <Button onClick={handleAddToCart} className="flex-1 text-sm h-12" disabled={hasFlavors && selectedFlavors.size === 0}>
          <ShoppingCart className="w-4 h-4 mr-2" />
          Adicionar ao Carrinho
        </Button>
      </div>
    </div>;
  if (isMobile) {
    return <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="h-[86vh] p-0 mt-0 rounded-t-3xl overflow-hidden border-0 [&>div:first-child]:hidden animate-in slide-in-from-bottom duration-300" style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: '100%'
        }}>
            <div className="flex flex-col h-full overflow-hidden relative animate-scale-in">
              <DrawerTitle className="sr-only">{product.name}</DrawerTitle>
              
              {/* Botão de fechar flutuante sobre a imagem */}
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="absolute top-1 right-2 z-10 rounded-full h-12 w-12 bg-orange-500 backdrop-blur-sm hover:bg-orange-600">
                <X className="w-6 h-6 text-white" />
              </Button>

              <div ref={drawerContentRef} className="flex-1 overflow-y-auto overscroll-contain" style={{
              touchAction: 'pan-y',
              WebkitOverflowScrolling: 'touch'
            }}>
                <div className="pb-4">
                  {productContent}
                </div>
              </div>

              <div className="flex-shrink-0 border-t bg-background p-6">
                {footerContent}
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Modal de Observação para Mobile */}
        <Dialog open={isObservationModalOpen} onOpenChange={setIsObservationModalOpen}>
          <DialogContent className="w-[95vw] max-w-md p-6" style={{
          position: 'fixed',
          top: '10vh',
          left: '50%',
          transform: 'translateX(-50%)',
          maxHeight: '40vh',
          bottom: 'auto'
        }}>
            <DialogHeader>
              <DialogTitle>Adicionar Observação</DialogTitle>
            </DialogHeader>
            <Textarea autoFocus value={tempObservation} onChange={e => setTempObservation(e.target.value)} className="min-h-32 max-h-40 resize-none text-base" placeholder="Observação..." />
            <DialogFooter className="flex-row gap-2 mt-4">
              <Button variant="outline" onClick={handleObservationCancel} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleObservationSave} className="flex-1">
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>;
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-lg">
        <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-0">
          <DialogTitle className="sr-only">{product.name}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="absolute top-2 right-2 rounded-full h-10 w-10 bg-orange-500 hover:bg-orange-600 shadow-lg">
            <X className="w-5 h-5 text-white" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3">
            {productContent}
          </div>
        </div>

        <div className="border-t bg-background px-5 py-3">
          {footerContent}
        </div>
      </DialogContent>
    </Dialog>;
}