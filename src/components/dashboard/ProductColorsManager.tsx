import { useState } from 'react';
import { Plus, Edit2, Trash2, GripVertical, Image as ImageIcon, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProductColors, ProductColor, ColorFormData } from '@/hooks/useProductColors';
import { ProductImage } from '@/hooks/useProductImages';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

interface ProductColorsManagerProps {
  productId: string;
  storeId: string;
  productImages?: ProductImage[];
}

interface SortableColorCardProps {
  color: ProductColor;
  onEdit: (color: ProductColor) => void;
  onDelete: (colorId: string) => void;
  onToggle: (args: { colorId: string; isAvailable: boolean }) => void;
  productImages?: ProductImage[];
}

const SortableColorCard = ({ color, onEdit, onDelete, onToggle, productImages }: SortableColorCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: color.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const linkedImage = productImages?.find(img => img.id === color.image_id);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-4 mb-2 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* Color Preview */}
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-12 h-12 rounded-lg border-2 border-border shadow-sm"
            style={{ backgroundColor: color.hex_code }}
            title={color.hex_code}
          />
          
          <div className="flex-1">
            <div className="font-medium">{color.name}</div>
            <div className="text-sm text-muted-foreground font-mono">{color.hex_code}</div>
            
            <div className="flex items-center gap-2 mt-1">
              {color.price_adjustment !== 0 && (
                <Badge variant="secondary" className="text-xs">
                  <DollarSign className="w-3 h-3 mr-1" />
                  {color.price_adjustment > 0 ? '+' : ''}
                  {color.price_adjustment.toFixed(2)}
                </Badge>
              )}
              
              {linkedImage && (
                <Badge variant="outline" className="text-xs">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  Imagem vinculada
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Switch
            checked={color.is_available}
            onCheckedChange={(checked) => onToggle({ colorId: color.id, isAvailable: checked })}
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(color)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(color.id)}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Linked Image Preview */}
      {linkedImage && (
        <div className="mt-3 pl-9">
          <img
            src={linkedImage.image_url}
            alt={color.name}
            className="w-20 h-20 object-cover rounded border"
          />
        </div>
      )}
    </Card>
  );
};

export const ProductColorsManager = ({ productId, storeId, productImages = [] }: ProductColorsManagerProps) => {
  const { colors, isLoading, createColor, updateColor, deleteColor, toggleAvailability, reorderColors } = useProductColors(productId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<ProductColor | null>(null);
  const [formData, setFormData] = useState<ColorFormData>({
    name: '',
    hex_code: '#000000',
    image_id: null,
    price_adjustment: 0,
    is_available: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleOpenDialog = (color?: ProductColor) => {
    if (color) {
      setEditingColor(color);
      setFormData({
        name: color.name,
        hex_code: color.hex_code,
        image_id: color.image_id,
        price_adjustment: color.price_adjustment,
        is_available: color.is_available,
      });
    } else {
      setEditingColor(null);
      setFormData({
        name: '',
        hex_code: '#000000',
        image_id: null,
        price_adjustment: 0,
        is_available: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingColor(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome da cor é obrigatório');
      return;
    }

    if (!formData.hex_code.match(/^#[0-9A-Fa-f]{6}$/)) {
      toast.error('Código hexadecimal inválido (use formato #RRGGBB)');
      return;
    }

    if (editingColor) {
      updateColor({ colorId: editingColor.id, colorData: formData });
    } else {
      // When creating a new color, also generate variants with existing sizes
      createColor({ productId, colorData: formData });
      
      // Auto-generate combinations with existing sizes
      // This will be handled by the hook after successful creation
      const { data: sizes } = await supabase
        .from('product_sizes')
        .select('id')
        .eq('product_id', productId);
      
      if (sizes && sizes.length > 0) {
        // Wait a bit for the color to be created
        setTimeout(async () => {
          const { data: newColors } = await supabase
            .from('product_colors' as any)
            .select('id')
            .eq('product_id', productId)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (newColors && newColors.length > 0) {
            const newColorId = (newColors[0] as any).id;
            const sizeIds = sizes.map((s) => (s as any).id);
            
            // Create variants for the new color with all existing sizes
            const variants = sizeIds.map((sizeId: string) => ({
              product_id: productId,
              color_id: newColorId,
              size_id: sizeId,
              is_available: true,
            }));
            
            await supabase
              .from('color_size_variants' as any)
              .insert(variants);
          }
        }, 500);
      }
    }
    
    handleCloseDialog();
  };

  const handleDelete = (colorId: string) => {
    if (confirm('Tem certeza que deseja remover esta cor?')) {
      deleteColor({ colorId, productId });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = colors.findIndex((c) => c.id === active.id);
      const newIndex = colors.findIndex((c) => c.id === over.id);
      const reorderedColors = arrayMove(colors, oldIndex, newIndex);
      reorderColors({ productId, reorderedColors });
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando cores...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cores do Produto</h3>
          <p className="text-sm text-muted-foreground">
            Configure as cores disponíveis e vincule imagens específicas
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Cor
        </Button>
      </div>

      {colors.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Nenhuma cor cadastrada ainda
          </p>
          <Button variant="outline" onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Primeira Cor
          </Button>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={colors.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {colors.map((color) => (
              <SortableColorCard
                key={color.id}
                color={color}
                onEdit={handleOpenDialog}
                onDelete={handleDelete}
                onToggle={toggleAvailability}
                productImages={productImages}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* Dialog for Add/Edit Color */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingColor ? 'Editar Cor' : 'Adicionar Nova Cor'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes da cor do produto
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="color-name">Nome da Cor *</Label>
              <Input
                id="color-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Vermelho, Azul Marinho"
              />
            </div>

            <div>
              <Label htmlFor="color-hex">Código da Cor *</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="color-hex"
                  value={formData.hex_code}
                  onChange={(e) => setFormData({ ...formData, hex_code: e.target.value })}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={formData.hex_code}
                  onChange={(e) => setFormData({ ...formData, hex_code: e.target.value })}
                  placeholder="#000000"
                  className="flex-1 font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use o seletor de cor ou digite o código hexadecimal
              </p>
            </div>

            <div>
              <Label htmlFor="color-image">Vincular Imagem (opcional)</Label>
              <Select
                value={formData.image_id || 'none'}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  image_id: value === 'none' ? null : value 
                })}
              >
                <SelectTrigger id="color-image">
                  <SelectValue placeholder="Selecione uma imagem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma imagem</SelectItem>
                  {productImages.map((img, index) => (
                    <SelectItem key={img.id} value={img.id}>
                      Imagem {index + 1} {img.is_primary && '(Principal)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                A imagem será exibida quando o cliente selecionar esta cor
              </p>
            </div>

            <div>
              <Label htmlFor="color-price">Ajuste de Preço (R$)</Label>
              <Input
                id="color-price"
                type="number"
                step="0.01"
                value={formData.price_adjustment}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  price_adjustment: parseFloat(e.target.value) || 0 
                })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Valor adicional ou desconto para esta cor (use negativo para desconto)
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="color-available">Cor Disponível</Label>
              <Switch
                id="color-available"
                checked={formData.is_available}
                onCheckedChange={(checked) => setFormData({ 
                  ...formData, 
                  is_available: checked 
                })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingColor ? 'Salvar Alterações' : 'Adicionar Cor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
