import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, DollarSign, FolderTree, X, GripVertical, Copy, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProductAddons } from "@/hooks/useProductAddons";
import { useAddonCategories } from "@/hooks/useAddonCategories";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

interface ProductAddonsManagerProps {
  productId: string;
  storeId: string;
}

interface SortableAddonProps {
  addon: any;
  onEdit: (addon: any) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  isDeleting: boolean;
  isDuplicating: boolean;
}

const SortableAddon = ({ addon, onEdit, onDelete, onDuplicate, isDeleting, isDuplicating }: SortableAddonProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: addon.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          className="cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{addon.name}</span>
            <Badge variant={addon.is_available ? "default" : "secondary"} className="text-xs">
              {addon.is_available ? 'Disponível' : 'Indisponível'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            + R$ {addon.price.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(addon)}
          title="Editar"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDuplicate(addon.id)}
          disabled={isDuplicating}
          title="Duplicar"
        >
          <Copy className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(addon.id)}
          disabled={isDeleting}
          title="Deletar"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};

export default function ProductAddonsManager({ productId, storeId }: ProductAddonsManagerProps) {
  const { addons, createAddon, updateAddon, deleteAddon, reorderAddons, duplicateAddon, isCreating, isDeleting, isDuplicating } = useProductAddons(productId);
  const { categories } = useAddonCategories(storeId);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    is_available: true,
    category_id: null as string | null,
  });
  const formRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeCategories = categories.filter(cat => cat.is_active);

  const filteredAddons = useMemo(() => {
    if (!addons) return [];
    
    let filtered = addons;
    
    // Filter by category
    if (categoryFilter === 'uncategorized') {
      filtered = filtered.filter(a => !a.category_id);
    } else if (categoryFilter !== 'all') {
      filtered = filtered.filter(a => a.category_id === categoryFilter);
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => a.name.toLowerCase().includes(term));
    }
    
    return filtered;
  }, [addons, categoryFilter, searchTerm]);

  const addonsByCategory = useMemo(() => {
    if (!addons) return {};
    
    const grouped: Record<string, typeof addons> = {
      uncategorized: addons.filter(a => !a.category_id)
    };

    activeCategories.forEach(cat => {
      grouped[cat.id] = addons.filter(a => a.category_id === cat.id);
    });

    return grouped;
  }, [addons, activeCategories]);

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingId) {
      updateAddon({ id: editingId, ...formData });
      setEditingId(null);
    } else {
      createAddon({ ...formData, product_id: productId });
    }
    
    setFormData({ name: '', price: 0, is_available: true, category_id: null });
    setIsAdding(false);
  };

  const handleEdit = (addon: any) => {
    setEditingId(addon.id);
    setFormData({
      name: addon.name,
      price: addon.price,
      is_available: addon.is_available,
      category_id: addon.category_id || null,
    });
    setIsAdding(true);
    
    // Scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', price: 0, is_available: true, category_id: null });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !addons) return;

    const oldIndex = addons.findIndex((addon) => addon.id === active.id);
    const newIndex = addons.findIndex((addon) => addon.id === over.id);

    const reordered = arrayMove(addons, oldIndex, newIndex);
    const updates = reordered.map((addon, index) => ({
      id: addon.id,
      display_order: index,
    }));

    reorderAddons(updates);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setConfirmDelete({ id, name });
  };

  const handleConfirmDelete = () => {
    if (confirmDelete) {
      deleteAddon(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const handleDuplicate = (id: string) => {
    duplicateAddon(id);
  };

  const totalAddons = addons?.length || 0;
  const availableAddons = addons?.filter(a => a.is_available).length || 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Adicionais</CardTitle>
                {totalAddons > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {totalAddons}
                  </Badge>
                )}
              </div>
              <CardDescription>
                Gerencie os adicionais deste produto
                {totalAddons > 0 && ` • ${availableAddons} disponíveis`}
              </CardDescription>
            </div>
            {!isAdding && (
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Adicional
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
        {isAdding && (
          <div ref={formRef} className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label>Nome do Adicional</Label>
              <Input
                placeholder="Ex: Queijo extra, Bacon..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {activeCategories.length > 0 && (
              <div className="space-y-2">
                <Label>Categoria (opcional)</Label>
                <Select
                  value={formData.category_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value === 'none' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {activeCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Preço Adicional</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-9"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                />
                <Label>Disponível</Label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={isCreating} className="flex-1">
                {editingId ? 'Atualizar' : 'Adicionar'}
              </Button>
              <Button onClick={handleCancel} variant="outline">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        {!isAdding && addons && addons.length > 0 && (
          <div className="space-y-3">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar adicional por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              {searchTerm && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Category filter */}
            {activeCategories.length > 0 && (
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-muted-foreground" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrar por categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    <SelectItem value="uncategorized">Sem categoria</SelectItem>
                    {activeCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categoryFilter !== 'all' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCategoryFilter('all')}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>
            )}

            {/* Results count */}
            {(searchTerm || categoryFilter !== 'all') && (
              <p className="text-sm text-muted-foreground">
                {filteredAddons.length} {filteredAddons.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
              </p>
            )}
          </div>
        )}

        {!addons || filteredAddons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{categoryFilter !== 'all' ? 'Nenhum adicional nesta categoria' : 'Nenhum adicional cadastrado'}</p>
            <p className="text-sm">
              {categoryFilter !== 'all' 
                ? 'Tente selecionar outra categoria' 
                : 'Adicione adicionais ao produto para oferecer opções personalizadas aos clientes'
              }
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-2">
              {categoryFilter === 'all' ? (
                // Group by category view
                <>
                  {addonsByCategory.uncategorized.length > 0 && (
                    <div key="uncategorized" className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground py-2">
                        <FolderTree className="w-4 h-4" />
                        Sem categoria
                      </div>
                      <SortableContext
                        items={addonsByCategory.uncategorized.map((a) => a.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {addonsByCategory.uncategorized.map((addon) => (
                          <SortableAddon
                            key={addon.id}
                            addon={addon}
                            onEdit={handleEdit}
                            onDelete={(id) => handleDeleteClick(id, addon.name)}
                            onDuplicate={handleDuplicate}
                            isDeleting={isDeleting}
                            isDuplicating={isDuplicating}
                          />
                        ))}
                      </SortableContext>
                    </div>
                  )}

                  {activeCategories.map((category) => {
                    const categoryAddons = addonsByCategory[category.id];
                    if (!categoryAddons || categoryAddons.length === 0) return null;

                    return (
                      <div key={category.id} className="space-y-2">
                        <Separator className="my-4" />
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground py-2">
                          <FolderTree className="w-4 h-4" />
                          {category.name}
                        </div>
                        <SortableContext
                          items={categoryAddons.map((a) => a.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {categoryAddons.map((addon) => (
                            <SortableAddon
                              key={addon.id}
                              addon={addon}
                              onEdit={handleEdit}
                              onDelete={(id) => handleDeleteClick(id, addon.name)}
                              onDuplicate={handleDuplicate}
                              isDeleting={isDeleting}
                              isDuplicating={isDuplicating}
                            />
                          ))}
                        </SortableContext>
                      </div>
                    );
                  })}
                </>
              ) : (
                // Filtered view
                <SortableContext
                  items={filteredAddons.map((a) => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredAddons.map((addon) => (
                    <SortableAddon
                      key={addon.id}
                      addon={addon}
                      onEdit={handleEdit}
                      onDelete={(id) => handleDeleteClick(id, addon.name)}
                      onDuplicate={handleDuplicate}
                      isDeleting={isDeleting}
                      isDuplicating={isDuplicating}
                    />
                  ))}
                </SortableContext>
              )}
            </div>
          </DndContext>
        )}
      </CardContent>
    </Card>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o adicional <strong>"{confirmDelete?.name}"</strong>? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};
