import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

import { Grid3x3, Check, X, DollarSign } from 'lucide-react';
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
    updateVariant 
  } = useColorSizeVariants(productId);

  const [editingVariant, setEditingVariant] = useState<{ colorId: string; sizeId: string } | null>(null);
  const [stockValue, setStockValue] = useState<number | null>(null);
  const [priceAdjustment, setPriceAdjustment] = useState<number>(0);

  // Create a map for quick variant lookup
  const variantMap = useMemo(() => {
    const map = new Map<string, typeof variants[0]>();
    variants.forEach(v => {
      map.set(`${v.color_id}-${v.size_id}`, v);
    });
    return map;
  }, [variants]);

  const handleGenerateAll = () => {
    if (colors.length === 0 || sizes.length === 0) {
      return;
    }

    const colorIds = colors.map(c => c.id);
    const sizeIds = sizes.map(s => s.id);
    
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
      setPriceAdjustment(variant.price_adjustment);
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

  if (colors.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">
          Adicione cores ao produto primeiro para gerenciar variantes.
        </p>
      </Card>
    );
  }

  if (sizes.length === 0) {
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

  const availableCount = variants.filter(v => v.is_available).length;
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
      <Card className="p-4">
        <ScrollArea className="max-h-[500px] w-full">
          <div className="min-w-max pb-4 pr-4">
          {/* Header Row - Sizes */}
          <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `200px repeat(${sizes.length}, 120px)` }}>
            <div className="font-semibold text-sm p-2">Cor / Tamanho</div>
            {sizes.map(size => (
              <div key={size.id} className="font-semibold text-sm p-2 text-center bg-muted rounded">
                {size.name}
                <div className="text-xs text-muted-foreground font-normal">
                  +R$ {size.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Data Rows - Colors */}
          {colors.map(color => (
            <div 
              key={color.id} 
              className="grid gap-2 mb-2" 
              style={{ gridTemplateColumns: `200px repeat(${sizes.length}, 120px)` }}
            >
              {/* Color Label */}
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <div
                  className="w-6 h-6 rounded border-2 border-border flex-shrink-0"
                  style={{ backgroundColor: color.hex_code }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{color.name}</div>
                  {color.price_adjustment !== 0 && (
                    <div className="text-xs text-muted-foreground">
                      {color.price_adjustment > 0 ? '+' : ''}R$ {color.price_adjustment.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Variant Cells */}
              {sizes.map(size => {
                const key = `${color.id}-${size.id}`;
                const variant = variantMap.get(key);
                const isAvailable = variant?.is_available || false;

                return (
                  <div 
                    key={size.id} 
                    className={`
                      border-2 rounded p-2 flex flex-col items-center justify-center gap-1 cursor-pointer
                      transition-all hover:border-primary/50
                      ${isAvailable ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}
                    `}
                    onClick={() => handleToggleVariant(color.id, size.id)}
                  >
                    {isAvailable ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                    
                    {variant && (
                      <>
                        {variant.stock_quantity !== null && (
                          <Badge variant="secondary" className="text-xs">
                            Estoque: {variant.stock_quantity}
                          </Badge>
                        )}
                        {variant.price_adjustment !== 0 && (
                          <Badge variant="outline" className="text-xs">
                            <DollarSign className="w-3 h-3" />
                            {variant.price_adjustment > 0 ? '+' : ''}
                            {variant.price_adjustment.toFixed(2)}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs mt-1"
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
          <ScrollBar orientation="vertical" />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-muted-foreground">
          <strong>Dica:</strong> Clique em uma célula para ativar/desativar a combinação. 
          Use "Editar" para configurar estoque e ajuste de preço específico para cada variante.
        </div>
      </Card>

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
            <Button onClick={handleSaveEdit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
