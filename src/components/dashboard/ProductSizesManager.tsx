import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, GripVertical, Search, Filter } from 'lucide-react';
import { useProductSizes, type ProductSize, type SizeFormData } from '@/hooks/useProductSizes';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from '@/components/ui/responsive-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
interface ProductSizesManagerProps {
  productId: string;
}
interface SortableSizeItemProps {
  size: ProductSize;
  onEdit: (size: ProductSize) => void;
  onDelete: (id: string) => void;
  onToggleAvailability: (args: {
    id: string;
    is_available: boolean;
  }) => void;
}
function SortableSizeItem({
  size,
  onEdit,
  onDelete,
  onToggleAvailability
}: SortableSizeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: size.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  return <div ref={setNodeRef} style={style} className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-card border rounded-lg hover:border-primary/50 transition-colors">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing flex-shrink-0">
        <GripVertical className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-sm font-semibold truncate">{size.name}</h4>
          <span className="text-sm sm:text-base font-bold text-primary whitespace-nowrap">
            R$ {size.price.toFixed(2)}
          </span>
        </div>
        {size.description && <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{size.description}</p>}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <Switch checked={size.is_available} onCheckedChange={checked => onToggleAvailability({
        id: size.id,
        is_available: checked
      })} />
        <Button variant="ghost" size="icon" onClick={() => onEdit(size)} className="h-8 w-8 sm:h-10 sm:w-10">
          <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(size.id)} className="h-8 w-8 sm:h-10 sm:w-10">
          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>;
}
export function ProductSizesManager({
  productId
}: ProductSizesManagerProps) {
  const {
    sizes,
    isLoading,
    createSize,
    updateSize,
    deleteSize,
    toggleSizeAvailability,
    reorderSizes
  } = useProductSizes(productId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<ProductSize | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [formData, setFormData] = useState<SizeFormData>({
    name: '',
    price: 0,
    description: '',
    is_available: true
  });
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id && sizes) {
      const oldIndex = sizes.findIndex(s => s.id === active.id);
      const newIndex = sizes.findIndex(s => s.id === over.id);
      const newOrder = arrayMove(sizes, oldIndex, newIndex);
      const updates = newOrder.map((size, index) => ({
        id: size.id,
        display_order: index
      }));
      reorderSizes(updates);
    }
  };
  const handleOpenDialog = (size?: ProductSize) => {
    if (size) {
      setEditingSize(size);
      setFormData({
        name: size.name,
        price: size.price,
        description: size.description || '',
        is_available: size.is_available
      });
    } else {
      setEditingSize(null);
      setFormData({
        name: '',
        price: 0,
        description: '',
        is_available: true
      });
    }
    setIsDialogOpen(true);
  };
  const handleSubmit = () => {
    if (editingSize) {
      updateSize({
        id: editingSize.id,
        ...formData
      });
    } else {
      createSize({
        product_id: productId,
        ...formData
      });
    }
    setIsDialogOpen(false);
  };
  const filteredSizes = sizes?.filter(size => {
    const matchesSearch = size.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAvailability = availabilityFilter === 'all' || availabilityFilter === 'available' && size.is_available || availabilityFilter === 'unavailable' && !size.is_available;
    return matchesSearch && matchesAvailability;
  });
  if (isLoading) {
    return <div className="text-center py-8">Carregando tamanhos...</div>;
  }
  return <>
      <Card className="md:min-h-[90vh]">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <CardTitle>Variações</CardTitle>
            <CardDescription className="mt-1">
              Gerencie os tamanhos disponíveis para este produto
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nova Variação
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 md:min-h-[75vh]">
        <div className="flex flex-col sm:flex-row flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" placeholder="Buscar Variacoes..." />
          </div>
          <Select value={availabilityFilter} onValueChange={(value: any) => setAvailabilityFilter(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="available">Disponíveis</SelectItem>
              <SelectItem value="unavailable">Indisponíveis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!filteredSizes || filteredSizes.length === 0 ? <div className="text-center py-12 text-muted-foreground">
            {searchTerm || availabilityFilter !== 'all' ? 'Nenhum tamanho encontrado com os filtros aplicados.' : 'Nenhum tamanho cadastrado. Clique em "Novo Tamanho" para adicionar.'}
          </div> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredSizes.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {filteredSizes.map(size => <SortableSizeItem key={size.id} size={size} onEdit={handleOpenDialog} onDelete={deleteSize} onToggleAvailability={toggleSizeAvailability} />)}
              </div>
            </SortableContext>
          </DndContext>}
        </CardContent>
      </Card>

      <ResponsiveDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <ResponsiveDialogContent className="w-full max-w-full md:max-w-[80vw] lg:max-w-[50vw] max-h-[87vh] md:max-h-[90vh] flex flex-col bg-background z-50">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{editingSize ? 'Editar Variação' : 'Nova Variação'}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {editingSize ? 'Edite as informações da variação.' : 'Adicione uma nova variação ao produto.'}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <ScrollArea className="flex-1 px-4 md:px-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Tamanho *</Label>
                <Input id="name" placeholder="Ex: Pequeno, Médio, Grande..." value={formData.name} onChange={e => setFormData({
                ...formData,
                name: e.target.value
              })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Preço *</Label>
                <Input id="price" type="number" step="0.01" min="0" placeholder="0.00" value={formData.price} onChange={e => setFormData({
                ...formData,
                price: parseFloat(e.target.value) || 0
              })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea id="description" placeholder="Descrição do tamanho..." value={formData.description} onChange={e => setFormData({
                ...formData,
                description: e.target.value
              })} />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="is_available" checked={formData.is_available} onCheckedChange={checked => setFormData({
                ...formData,
                is_available: checked
              })} />
                <Label htmlFor="is_available">Disponível</Label>
              </div>
            </div>
          </ScrollArea>

          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || formData.price <= 0} className="w-full sm:w-auto">
              {editingSize ? 'Salvar' : 'Criar'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>;
}