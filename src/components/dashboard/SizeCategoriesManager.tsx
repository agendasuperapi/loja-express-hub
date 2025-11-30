import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { useSizeCategories, type SizeCategory } from '@/hooks/useSizeCategories';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from '@/components/ui/responsive-dialog';
import { Label } from '@/components/ui/label';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SizeCategoriesManagerProps {
  storeId: string;
}

interface SortableCategoryItemProps {
  category: SizeCategory;
  onEdit: (category: SizeCategory) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
}

function SortableCategoryItem({ category, onEdit, onDelete, onToggleStatus }: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-4 bg-card border rounded-lg hover:border-primary/50 transition-colors">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="flex-1">
        <h4 className="font-semibold">{category.name}</h4>
        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
          {category.is_exclusive && <span className="text-primary font-medium">Exclusiva (1 item)</span>}
          {!category.is_exclusive && (
            <>
              <span>Mín: {category.min_items}</span>
              <span>Máx: {category.max_items ?? 'Ilimitado'}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={category.is_active}
          onCheckedChange={(checked) => onToggleStatus(category.id, checked)}
        />
        <Button variant="ghost" size="icon" onClick={() => onEdit(category)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(category.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function SizeCategoriesManager({ storeId }: SizeCategoriesManagerProps) {
  const { categories, loading, addCategory, updateCategory, deleteCategory, toggleCategoryStatus, reorderCategories } = useSizeCategories(storeId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SizeCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    is_exclusive: false,
    min_items: 0,
    max_items: null as number | null
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex(c => c.id === active.id);
      const newIndex = categories.findIndex(c => c.id === over.id);
      const newOrder = arrayMove(categories, oldIndex, newIndex);
      
      const updates = newOrder.map((cat, index) => ({
        id: cat.id,
        display_order: index
      }));
      
      reorderCategories(updates);
    }
  };

  const handleOpenDialog = (category?: SizeCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        is_exclusive: category.is_exclusive,
        min_items: category.min_items,
        max_items: category.max_items
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        is_exclusive: false,
        min_items: 0,
        max_items: null
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
      } else {
        await addCategory(formData);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando categorias...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Categorias de Variações</CardTitle>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => handleOpenDialog()}
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="hidden sm:block">Organize suas variações em categorias</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {!categories || categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma categoria cadastrada. Clique em "Nova Categoria" para adicionar.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {categories.map(category => (
                  <SortableCategoryItem
                    key={category.id}
                    category={category}
                    onEdit={handleOpenDialog}
                    onDelete={deleteCategory}
                    onToggleStatus={toggleCategoryStatus}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <ResponsiveDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {editingCategory ? 'Edite as informações da categoria.' : 'Crie uma nova categoria de variações.'}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Categoria *</Label>
              <Input
                id="name"
                placeholder="Ex: Tamanho, Volume, Peso..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_exclusive"
                checked={formData.is_exclusive}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  is_exclusive: checked,
                  max_items: checked ? 1 : formData.max_items
                })}
              />
              <Label htmlFor="is_exclusive">
                Seleção exclusiva (apenas 1 item pode ser escolhido)
              </Label>
            </div>

            {!formData.is_exclusive && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="min_items">Quantidade Mínima de Itens</Label>
                  <Input
                    id="min_items"
                    type="number"
                    min="0"
                    value={formData.min_items}
                    onChange={(e) => setFormData({ ...formData, min_items: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_items">Quantidade Máxima de Itens (deixe vazio para ilimitado)</Label>
                  <Input
                    id="max_items"
                    type="number"
                    min={formData.min_items}
                    value={formData.max_items ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      max_items: e.target.value ? parseInt(e.target.value) : null
                    })}
                  />
                </div>
              </>
            )}
          </div>

          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name}>
              {editingCategory ? 'Salvar' : 'Criar'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
