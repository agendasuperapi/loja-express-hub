import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, FolderTree, X, GripVertical, Power, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAddonCategories } from "@/hooks/useAddonCategories";
import { Badge } from "@/components/ui/badge";
import { useEmployeeAccess } from "@/hooks/useEmployeeAccess";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface AddonCategoriesManagerProps {
  storeId: string;
}

interface SortableCategoryProps {
  category: any;
  hasPermission: (action: 'update' | 'delete') => boolean;
  onEdit: (category: any) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
}

const SortableCategory = ({ category, hasPermission, onEdit, onDelete, onToggleStatus }: SortableCategoryProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-background"
    >
      <div className="flex items-center gap-3 flex-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
        </div>
        <FolderTree className="w-4 h-4 text-muted-foreground" />
        <div>
          <div className="font-medium flex items-center gap-2">
            {category.name}
            {category.is_exclusive && (
              <Badge variant="outline" className="text-xs">
                Exclusivo
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {category.is_exclusive ? (
              'Apenas 1 item pode ser selecionado'
            ) : (
              <>
                {category.min_items > 0 ? `Mín: ${category.min_items}` : 'Opcional'}
                {category.max_items !== null && ` • Máx: ${category.max_items}`}
                {category.max_items === null && category.min_items === 0 && ' • Ilimitado'}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Badge variant={category.is_active ? "default" : "secondary"}>
          {category.is_active ? 'Ativa' : 'Inativa'}
        </Badge>
        
        {hasPermission('update') && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggleStatus(category.id, category.is_active)}
            title={category.is_active ? 'Inativar' : 'Ativar'}
          >
            {category.is_active ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Power className="w-4 h-4" />
            )}
          </Button>
        )}
        
        {hasPermission('update') && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(category)}
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
        
        {hasPermission('delete') && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(category.id)}
            title="Excluir"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
};

export const AddonCategoriesManager = ({ storeId }: AddonCategoriesManagerProps) => {
  const { categories, loading, addCategory, updateCategory, toggleCategoryStatus, deleteCategory, reorderCategories } = useAddonCategories(storeId);
  const employeeAccess = useEmployeeAccess();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    min_items: 0,
    max_items: null as number | null,
    is_exclusive: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const hasPermission = (action: 'create' | 'update' | 'delete') => {
    if (!employeeAccess.isEmployee) return true;
    const perms = employeeAccess.permissions?.products;
    if (!perms) return false;
    return (perms as any)[action] === true;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    // Validação dos limites
    if (formData.min_items < 0) {
      alert('O mínimo de itens não pode ser negativo');
      return;
    }
    
    if (!formData.is_exclusive && formData.max_items !== null && formData.max_items < formData.min_items) {
      alert('O máximo de itens deve ser maior ou igual ao mínimo');
      return;
    }

    try {
      if (editingId) {
        await updateCategory(editingId, { 
          name: formData.name,
          min_items: formData.min_items,
          max_items: formData.is_exclusive ? 1 : formData.max_items,
          is_exclusive: formData.is_exclusive
        });
        setEditingId(null);
      } else {
        await addCategory(formData.name, formData.min_items, formData.max_items, formData.is_exclusive);
      }
      
      setFormData({ name: '', min_items: 0, max_items: null, is_exclusive: false });
      setIsAdding(false);
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleEdit = (category: any) => {
    if (!hasPermission('update')) return;
    
    setEditingId(category.id);
    setFormData({
      name: category.name,
      min_items: category.min_items || 0,
      max_items: category.max_items,
      is_exclusive: category.is_exclusive || false,
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', min_items: 0, max_items: null, is_exclusive: false });
  };

  const handleDelete = async (categoryId: string) => {
    if (!hasPermission('delete')) return;
    
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      await deleteCategory(categoryId);
    }
  };

  const handleToggleStatus = async (categoryId: string, currentStatus: boolean) => {
    if (!hasPermission('update')) return;
    await toggleCategoryStatus(categoryId, !currentStatus);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((cat) => cat.id === active.id);
    const newIndex = categories.findIndex((cat) => cat.id === over.id);

    const newOrder = arrayMove(categories, oldIndex, newIndex);
    await reorderCategories(newOrder);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Categorias de Adicionais</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="w-5 h-5" />
              Categorias de Adicionais
            </CardTitle>
            <CardDescription>Organize os adicionais em categorias para melhor gestão</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label>Nome da Categoria</Label>
              <Input
                placeholder="Ex: Carnes, Queijos, Molhos..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                <div className="flex-1">
                  <Label htmlFor="exclusive-switch" className="text-sm font-medium cursor-pointer">
                    Seleção Exclusiva
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Permitir apenas 1 item selecionado (como tipo de carne, tamanho, etc.)
                  </p>
                </div>
                <Switch
                  id="exclusive-switch"
                  checked={formData.is_exclusive}
                  onCheckedChange={(checked) => {
                    console.log('[Switch] Exclusive changed:', checked);
                    setFormData({ ...formData, is_exclusive: checked, max_items: checked ? 1 : formData.max_items });
                  }}
                />
              </div>
            </div>

            {!formData.is_exclusive && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Mínimo de Itens</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0 = opcional"
                    value={formData.min_items}
                    onChange={(e) => setFormData({ ...formData, min_items: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Máximo de Itens</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Deixe vazio = ilimitado"
                    value={formData.max_items || ''}
                    onChange={(e) => setFormData({ ...formData, max_items: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="flex-1">
                {editingId ? 'Atualizar' : 'Adicionar'}
              </Button>
              <Button onClick={handleCancel} variant="outline">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma categoria cadastrada</p>
            <p className="text-sm">Crie categorias para organizar seus adicionais</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={categories.map((cat) => cat.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {categories.map((category) => (
                  <SortableCategory
                    key={category.id}
                    category={category}
                    hasPermission={hasPermission}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
};
