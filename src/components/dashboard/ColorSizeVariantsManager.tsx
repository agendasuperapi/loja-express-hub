import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

import { Grid3x3, Check, X, DollarSign, MoveHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { useColorSizeVariants } from '@/hooks/useColorSizeVariants';
import { useProductColors } from '@/hooks/useProductColors';
import { useProductSizes } from '@/hooks/useProductSizes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ColorSizeVariantsManagerProps {
  productId: string;
  storeId: string;
}

export const ColorSizeVariantsManager = ({ productId, storeId }: ColorSizeVariantsManagerProps) => {
  const { colors } = useProductColors(productId);
  const { sizes } = useProductSizes(productId);
  const {
    variants,
    isLoading,
    toggleVariant,
    generateAllCombinations,
    updateVariant,
  } = useColorSizeVariants(productId);

  const [editingVariant, setEditingVariant] = useState<{ colorId: string; sizeId: string } | null>(null);
  const [stockValue, setStockValue] = useState<number | null>(null);
  const [priceAdjustment, setPriceAdjustment] = useState<number>(0);
  
  // Scroll control refs and states
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  
  // Check if content will overflow (based on column count)
  const expectedWidth = 140 + ((sizes?.length || 0) * 100);
  const initialShowRightShadow = expectedWidth > (typeof window !== 'undefined' ? window.innerWidth * 0.8 : 400);
  const [showRightShadow, setShowRightShadow] = useState(initialShowRightShadow);
  const [showSwipeIndicator, setShowSwipeIndicator] = useState(true);
  const [isAutoScrolling, setIsAutoScrolling] = useState<'left' | 'right' | null>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();

  // Create a map for quick variant lookup
  const variantMap = useMemo(() => {
    const map = new Map<string, (typeof variants)[0]>();
    variants.forEach((v) => {
      map.set(`${v.color_id}-${v.size_id}`, v);
    });
    return map;
  }, [variants]);

  // Check scroll position and update shadows
  const checkScroll = useCallback(() => {
    const element = scrollContainerRef.current;
    if (!element) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = element;
    
    console.log('[ColorSizeVariants] Scroll check:', {
      scrollLeft,
      scrollWidth,
      clientWidth,
      hasOverflow: scrollWidth > clientWidth,
      showRight: scrollLeft < scrollWidth - clientWidth - 5
    });
    
    setShowLeftShadow(scrollLeft > 5);
    setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  // Auto-scroll on mouse hover near edges (desktop only)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return;
    
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const edgeThreshold = 60;
    const scrollSpeed = 8;
    
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    
    if (mouseX < edgeThreshold && showLeftShadow) {
      setIsAutoScrolling('left');
      scrollIntervalRef.current = setInterval(() => {
        container.scrollLeft -= scrollSpeed;
        checkScroll();
      }, 16);
    } else if (mouseX > rect.width - edgeThreshold && showRightShadow) {
      setIsAutoScrolling('right');
      scrollIntervalRef.current = setInterval(() => {
        container.scrollLeft += scrollSpeed;
        checkScroll();
      }, 16);
    } else {
      setIsAutoScrolling(null);
    }
  }, [isMobile, showLeftShadow, showRightShadow, checkScroll]);

  const handleMouseLeave = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    setIsAutoScrolling(null);
  }, []);

  // Setup scroll listeners and cleanup
  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;
    
    // Pequeno delay para garantir que o conteúdo foi renderizado
    const timer = setTimeout(() => {
      checkScroll();
    }, 100);
    
    const resizeObserver = new ResizeObserver(() => {
      // Debounce check
      setTimeout(checkScroll, 50);
    });
    resizeObserver.observe(element);
    element.addEventListener('scroll', checkScroll);
    
    const swipeTimer = setTimeout(() => setShowSwipeIndicator(false), 4000);
    
    return () => {
      resizeObserver.disconnect();
      element.removeEventListener('scroll', checkScroll);
      clearTimeout(timer);
      clearTimeout(swipeTimer);
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, [checkScroll, colors?.length, sizes?.length]);

  // Re-check scroll when colors/sizes data changes
  useEffect(() => {
    if (colors && sizes && colors.length > 0 && sizes.length > 0) {
      // Wait for DOM to update
      requestAnimationFrame(() => {
        setTimeout(checkScroll, 50);
      });
    }
  }, [colors?.length, sizes?.length, checkScroll]);

  const handleGenerateAll = () => {
    if (!colors || !sizes || colors.length === 0 || sizes.length === 0) {
      return;
    }

    const colorIds = colors.map((c) => c.id);
    const sizeIds = sizes.map((s) => s.id);

    generateAllCombinations({ productId, colorIds, sizeIds });
  };

  const handleToggleVariant = (colorId: string, sizeId: string) => {
    const key = `${colorId}-${sizeId}`;
    const variant = variantMap.get(key);

    if (variant) {
      toggleVariant({ variantId: variant.id, isAvailable: !variant.is_available });
    }
  };

  const handleOpenEdit = (colorId: string, sizeId: string) => {
    const key = `${colorId}-${sizeId}`;
    const variant = variantMap.get(key);

    if (variant) {
      setEditingVariant({ colorId, sizeId });
      setStockValue(variant.stock_quantity);
      setPriceAdjustment(variant.price_adjustment ?? 0);
    }
  };

  const handleSaveEdit = () => {
    if (!editingVariant) return;

    const key = `${editingVariant.colorId}-${editingVariant.sizeId}`;
    const variant = variantMap.get(key);

    if (variant) {
      updateVariant({
        variantId: variant.id,
        updates: {
          stock_quantity: stockValue,
          price_adjustment: priceAdjustment,
        },
      });
    }

    setEditingVariant(null);
  };

  if (!colors || colors.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">
          Adicione cores ao produto primeiro para gerenciar variantes.
        </p>
      </Card>
    );
  }

  if (!sizes || sizes.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">
          Adicione tamanhos ao produto primeiro para gerenciar variantes.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando variantes...</div>;
  }

  const availableCount = variants.filter((v) => v.is_available).length;
  const totalPossible = colors.length * sizes.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Grid3x3 className="w-5 h-5" />
            Matriz de Variantes
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure quais combinações de cor e tamanho estão disponíveis
          </p>
          <Badge variant="secondary" className="mt-2">
            {availableCount} de {totalPossible} combinações ativas
          </Badge>
        </div>
        <Button onClick={handleGenerateAll} variant="outline" className="w-full sm:w-auto">
          Gerar Todas Combinações
        </Button>
      </div>

      {/* Matrix Grid */}
      <Card className="p-0 sm:p-4 relative overflow-hidden">
        {/* Left Shadow Indicator (Desktop only) */}
        {!isMobile && (
          <div className={cn(
            "absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-10 transition-opacity duration-300 bg-gradient-to-r from-card to-transparent",
            showLeftShadow ? "opacity-100" : "opacity-0"
          )} />
        )}
        
        {/* Right Shadow Indicator (Desktop only) */}
        {!isMobile && (
          <div className={cn(
            "absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10 transition-opacity duration-300 bg-gradient-to-l from-card to-transparent",
            showRightShadow ? "opacity-100" : "opacity-0"
          )} />
        )}
        
        {/* Left Navigation Button (Desktop) */}
        {!isMobile && showLeftShadow && (
          <button
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 bg-primary/90 hover:bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg transition-all"
            onClick={() => scrollContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        
        {/* Right Navigation Button (Desktop) */}
        {!isMobile && showRightShadow && (
          <button
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 bg-primary/90 hover:bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg transition-all"
            onClick={() => scrollContainerRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
        
        {/* Swipe Indicator (Mobile) */}
        {isMobile && showSwipeIndicator && showRightShadow && (
          <div className="absolute bottom-4 right-4 z-20 pointer-events-none animate-fade-in">
            <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
              <MoveHorizontal className="h-4 w-4" />
              <span className="text-xs font-semibold">Arraste →</span>
            </div>
          </div>
        )}
        
        <div 
          ref={scrollContainerRef}
          className="w-full overflow-y-auto overflow-x-auto p-2 sm:p-0 [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-primary [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-muted"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            maxHeight: '60vh',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: isAutoScrolling ? 'auto' : 'smooth',
            touchAction: 'pan-x pan-y',
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--primary)) hsl(var(--muted))',
          }}
        >
          <div className="min-w-max pb-2">
            {/* Header Row - Sizes */}
            <div
              className="grid gap-2 mb-2"
              style={{ gridTemplateColumns: `minmax(120px, 140px) repeat(${sizes?.length || 0}, minmax(90px, 100px))` }}
            >
              <div className="font-semibold text-xs sm:text-sm p-2 sticky left-0 bg-card z-[5]">
                Cor / Tamanho
              </div>
              {sizes.map((size) => (
                <div
                  key={size.id}
                  className="font-semibold text-xs sm:text-sm p-2 text-center bg-muted rounded"
                >
                  <div className="truncate">{size.name}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground font-normal">
                    +R$ {size.price.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Data Rows - Colors */}
            {colors.map((color) => (
              <div
                key={color.id}
                className="grid gap-2 mb-2"
                style={{ gridTemplateColumns: `minmax(120px, 140px) repeat(${sizes?.length || 0}, minmax(90px, 100px))` }}
              >
                {/* Color Label */}
                <div className="flex items-center gap-2 p-2 bg-muted rounded sticky left-0 z-[5]">
                  <div
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded border-2 border-border flex-shrink-0"
                    style={{ backgroundColor: color.hex_code }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-medium truncate">{color.name}</div>
                    {color.price_adjustment !== 0 && (
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        {color.price_adjustment > 0 ? '+' : ''}R$ {color.price_adjustment.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Variant Cells */}
                {sizes.map((size) => {
                  const key = `${color.id}-${size.id}`;
                  const variant = variantMap.get(key);
                  const isAvailable = variant?.is_available || false;

                  return (
                    <div
                      key={size.id}
                      className={cn(
                        "border-2 rounded p-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:border-primary/50 min-h-[80px]",
                        isAvailable ? 'bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700' : 'bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-700'
                      )}
                      onClick={() => handleToggleVariant(color.id, size.id)}
                    >
                      {isAvailable ? (
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}

                      {variant && (
                        <>
                          {variant.stock_quantity !== null && (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs">
                              {variant.stock_quantity}
                            </Badge>
                          )}
                          {variant.price_adjustment !== 0 && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs hidden sm:flex items-center gap-0.5">
                              <DollarSign className="w-3 h-3" />
                              {variant.price_adjustment > 0 ? '+' : ''}
                              {variant.price_adjustment.toFixed(2)}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] sm:text-xs mt-1 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(color.id, size.id);
                            }}
                          >
                            Editar
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-muted-foreground">
        <strong>Dica:</strong> Clique em uma célula para ativar/desativar a combinação. Use "Editar" para
        configurar estoque e ajuste de preço específico para cada variante.
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingVariant} onOpenChange={() => setEditingVariant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Variante</DialogTitle>
            <DialogDescription>
              Configure estoque e ajuste de preço para esta combinação específica
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="stock">Estoque (opcional)</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={stockValue ?? ''}
                onChange={(e) => setStockValue(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Deixe em branco para ilimitado"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Controle de estoque específico para esta combinação
              </p>
            </div>

            <div>
              <Label htmlFor="price-adj">Ajuste de Preço Adicional (R$)</Label>
              <Input
                id="price-adj"
                type="number"
                step="0.01"
                value={priceAdjustment}
                onChange={(e) => setPriceAdjustment(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ajuste adicional além do preço da cor e tamanho
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVariant(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
