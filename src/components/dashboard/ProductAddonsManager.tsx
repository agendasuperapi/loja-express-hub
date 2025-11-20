import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, DollarSign, FolderTree, X, GripVertical, Copy, Search, Store, Lightbulb, Download, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProductAddons } from "@/hooks/useProductAddons";
import { useAddonCategories } from "@/hooks/useAddonCategories";
import { useStoreAddons } from "@/hooks/useStoreAddons";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Checkbox } from "@/components/ui/checkbox";
import { addonTemplates, type BusinessTemplate } from "@/lib/addonTemplates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  isSelected: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
}

const SortableAddon = ({ addon, onEdit, onDelete, onDuplicate, isDeleting, isDuplicating, isSelected, onToggleSelect }: SortableAddonProps) => {
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
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onToggleSelect(addon.id, Boolean(checked))}
          className="mr-1"
        />
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
  const { addons: storeAddons = [] } = useStoreAddons(storeId);

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isStoreAddonsOpen, setIsStoreAddonsOpen] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [storeAddonsSearch, setStoreAddonsSearch] = useState('');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedTemplateCategories, setSelectedTemplateCategories] = useState<Record<string, boolean>>({});
  const [isImporting, setIsImporting] = useState(false);
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

  // Autocomplete suggestions combining store addons and templates
  const autocompleteSuggestions = useMemo(() => {
    if (!formData.name.trim() || formData.name.length < 2) return [];

    const term = formData.name.toLowerCase();
    const suggestions: Array<{ type: 'store' | 'template'; name: string; price: number; categoryId?: string | null; templateCategory?: string }> = [];

    // Add store addons (excluding ones already in this product)
    const currentAddonNames = addons?.map(a => a.name.toLowerCase()) || [];
    storeAddons
      .filter(addon => 
        addon.name.toLowerCase().includes(term) && 
        !currentAddonNames.includes(addon.name.toLowerCase())
      )
      .slice(0, 5)
      .forEach(addon => {
        suggestions.push({
          type: 'store',
          name: addon.name,
          price: addon.price,
          categoryId: addon.category_id,
        });
      });

    // Add template addons
    addonTemplates.forEach(template => {
      template.categories.forEach(category => {
        category.addons
          .filter(addon => addon.name.toLowerCase().includes(term))
          .slice(0, 3)
          .forEach(addon => {
            suggestions.push({
              type: 'template',
              name: addon.name,
              price: addon.price,
              templateCategory: category.name,
            });
          });
      });
    });

    return suggestions.slice(0, 8);
  }, [formData.name, storeAddons, addons]);

  // Filtered store addons for the dialog
  const filteredStoreAddons = useMemo(() => {
    if (!storeAddonsSearch.trim()) return storeAddons;
    const term = storeAddonsSearch.toLowerCase();
    return storeAddons.filter(a => a.name.toLowerCase().includes(term));
  }, [storeAddons, storeAddonsSearch]);

  // Group store addons by category
  const groupedStoreAddons = useMemo(() => {
    const grouped: Record<string, typeof storeAddons> = {
      uncategorized: filteredStoreAddons.filter(a => !a.category_id)
    };

    activeCategories.forEach(cat => {
      const categoryAddons = filteredStoreAddons.filter(a => a.category_id === cat.id);
      if (categoryAddons.length > 0) {
        grouped[cat.id] = categoryAddons;
      }
    });

    return grouped;
  }, [filteredStoreAddons, activeCategories]);

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
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== confirmDelete.id));
    }
  };

  const handleDuplicate = (id: string) => {
    duplicateAddon(id);
  };

  const handleToggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((selectedId) => selectedId !== id);
    });
  };

  const handleSelectAutocomplete = (suggestion: typeof autocompleteSuggestions[0]) => {
    setFormData({
      ...formData,
      name: suggestion.name,
      price: suggestion.price,
      category_id: suggestion.categoryId || null,
    });
    setShowAutocomplete(false);
  };

  const handleCopyStoreAddon = (storeAddon: typeof storeAddons[0]) => {
    createAddon({
      name: storeAddon.name,
      price: storeAddon.price,
      is_available: storeAddon.is_available,
      category_id: storeAddon.category_id || null,
      product_id: productId,
    });
  };

  const handleToggleTemplateCategory = (categoryName: string, checked: boolean) => {
    setSelectedTemplateCategories(prev => ({
      ...prev,
      [categoryName]: checked
    }));
  };

  const handleImportTemplates = async () => {
    if (!selectedTemplate) return;

    const template = addonTemplates.find(t => t.id === selectedTemplate);
    if (!template) return;

    setIsImporting(true);

    try {
      // Get selected categories
      const selectedCategories = template.categories.filter(
        cat => selectedTemplateCategories[cat.name]
      );

      if (selectedCategories.length === 0) {
        toast({
          title: 'Nenhuma categoria selecionada',
          description: 'Selecione pelo menos uma categoria para importar.',
          variant: 'destructive',
        });
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const category of selectedCategories) {
        // Check if category already exists
        let categoryId = categories.find(c => c.name === category.name)?.id;

        // Create category if it doesn't exist
        if (!categoryId) {
          const { data: newCategory, error: categoryError } = await supabase
            .from('addon_categories')
            .insert({
              store_id: storeId,
              name: category.name,
              is_active: true,
            })
            .select()
            .single();

          if (categoryError) {
            console.error('Error creating category:', categoryError);
            errorCount++;
            continue;
          }

          categoryId = newCategory.id;
        }

        // Create all addons in this category
        for (const addon of category.addons) {
          try {
            await createAddon({
              name: addon.name,
              price: addon.price,
              is_available: true,
              category_id: categoryId,
              product_id: productId,
            });
            successCount++;
          } catch (error) {
            console.error('Error creating addon:', error);
            errorCount++;
          }
        }
      }

      toast({
        title: 'Importação concluída!',
        description: `${successCount} adicionais importados com sucesso${errorCount > 0 ? `. ${errorCount} falharam.` : '.'}`,
      });

      // Reset state
      setIsImportDialogOpen(false);
      setSelectedTemplate(null);
      setSelectedTemplateCategories({});
    } catch (error) {
      console.error('Error importing templates:', error);
      toast({
        title: 'Erro ao importar',
        description: 'Ocorreu um erro ao importar os templates.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const totalAddons = addons?.length || 0;
  const availableAddons = addons?.filter(a => a.is_available).length || 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle>Adicionais</CardTitle>
                {totalAddons > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {totalAddons}
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                Gerencie os adicionais deste produto
                {totalAddons > 0 && ` • ${availableAddons} disponíveis`}
              </CardDescription>
            </div>
            {!isAdding && (
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full md:w-auto">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsImportDialogOpen(true)}
                  className="w-full sm:w-auto shrink-0 justify-start sm:justify-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Importar Templates</span>
                  <span className="sm:hidden">Templates</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsStoreAddonsOpen(true)}
                  className="w-full sm:w-auto shrink-0 justify-start sm:justify-center"
                >
                  <Store className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Adicionais da Loja</span>
                  <span className="sm:hidden">Da Loja</span>
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setIsAdding(true)}
                  className="w-full sm:w-auto shrink-0 justify-start sm:justify-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Adicional
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
        {isAdding && (
          <div ref={formRef} className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label>Nome do Adicional</Label>
              <Popover open={showAutocomplete && autocompleteSuggestions.length > 0} onOpenChange={setShowAutocomplete}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Input
                      placeholder="Ex: Queijo extra, Bacon..."
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        setShowAutocomplete(true);
                      }}
                      onFocus={() => setShowAutocomplete(true)}
                    />
                    {autocompleteSuggestions.length > 0 && (
                      <Lightbulb className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-[var(--radix-popover-trigger-width)] p-2 bg-popover z-50" 
                  align="start"
                  sideOffset={4}
                >
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground px-2 py-1">Sugestões</p>
                    {autocompleteSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectAutocomplete(suggestion)}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{suggestion.name}</span>
                          <Badge variant={suggestion.type === 'store' ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                            {suggestion.type === 'store' ? 'Loja' : 'Template'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          R$ {suggestion.price.toFixed(2)}
                          {suggestion.templateCategory && ` • ${suggestion.templateCategory}`}
                        </p>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
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
                  <SelectContent className="z-50 bg-popover">
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <FolderTree className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filtrar por categoria" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
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
                    className="w-full sm:w-auto"
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
                            isSelected={selectedIds.includes(addon.id)}
                            onToggleSelect={handleToggleSelect}
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
                              isSelected={selectedIds.includes(addon.id)}
                              onToggleSelect={handleToggleSelect}
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
                      isSelected={selectedIds.includes(addon.id)}
                      onToggleSelect={handleToggleSelect}
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

    {/* Store Addons Dialog */}
    <Dialog open={isStoreAddonsOpen} onOpenChange={setIsStoreAddonsOpen}>
      <DialogContent className="max-w-3xl max-h-[85vh] w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Adicionais da Loja
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar adicional..."
              value={storeAddonsSearch}
              onChange={(e) => setStoreAddonsSearch(e.target.value)}
              className="pl-9"
            />
            {storeAddonsSearch && (
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                onClick={() => setStoreAddonsSearch('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Store Addons List */}
          <div className="overflow-y-auto max-h-[50vh] space-y-4">
            {filteredStoreAddons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum adicional encontrado</p>
                <p className="text-sm">Adicione adicionais em outros produtos para reutilizá-los aqui</p>
              </div>
            ) : (
              <>
                {/* Uncategorized */}
                {groupedStoreAddons.uncategorized && groupedStoreAddons.uncategorized.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground py-2">
                      <FolderTree className="w-4 h-4" />
                      Sem categoria
                    </div>
                    {groupedStoreAddons.uncategorized.map((addon) => {
                      const isInProduct = addons?.some(a => a.name === addon.name);
                      return (
                        <div key={addon.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{addon.name}</span>
                              {isInProduct && (
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  Já adicionado
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              R$ {addon.price.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyStoreAddon(addon)}
                            disabled={isInProduct}
                            className="w-full sm:w-auto"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Categorized */}
                {activeCategories.map((category) => {
                  const categoryAddons = groupedStoreAddons[category.id];
                  if (!categoryAddons || categoryAddons.length === 0) return null;

                  return (
                    <div key={category.id} className="space-y-2">
                      <Separator />
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground py-2">
                        <FolderTree className="w-4 h-4" />
                        {category.name}
                      </div>
                      {categoryAddons.map((addon) => {
                        const isInProduct = addons?.some(a => a.name === addon.name);
                        return (
                          <div key={addon.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium truncate">{addon.name}</span>
                                {isInProduct && (
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    Já adicionado
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                R$ {addon.price.toFixed(2)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyStoreAddon(addon)}
                              disabled={isInProduct}
                              className="w-full sm:w-auto"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copiar
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Import Templates Dialog */}
    <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">Importar Templates de Adicionais</span>
            <span className="sm:hidden">Importar Templates</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Selecione um template e as categorias que deseja importar. As categorias serão criadas automaticamente se não existirem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)] px-1">
          {/* Template Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Escolha um Template</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {addonTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setSelectedTemplateCategories({});
                  }}
                  className={`p-3 sm:p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                    selectedTemplate === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <span className="text-2xl sm:text-3xl flex-shrink-0">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base sm:text-lg">{template.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {template.categories.length} categorias
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.categories.reduce((sum, cat) => sum + cat.addons.length, 0)} adicionais
                        </Badge>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category Selection */}
          {selectedTemplate && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <Label className="text-base font-semibold">Selecione as Categorias</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const template = addonTemplates.find(t => t.id === selectedTemplate);
                      if (template) {
                        const allSelected = template.categories.every(
                          cat => selectedTemplateCategories[cat.name]
                        );
                        const newSelection: Record<string, boolean> = {};
                        template.categories.forEach(cat => {
                          newSelection[cat.name] = !allSelected;
                        });
                        setSelectedTemplateCategories(newSelection);
                      }
                    }}
                    className="w-full sm:w-auto"
                  >
                    {addonTemplates
                      .find(t => t.id === selectedTemplate)
                      ?.categories.every(cat => selectedTemplateCategories[cat.name])
                      ? 'Desmarcar Todas'
                      : 'Selecionar Todas'}
                  </Button>
                </div>

                <div className="grid gap-3">
                  {addonTemplates
                    .find(t => t.id === selectedTemplate)
                    ?.categories.map((category) => (
                      <div
                        key={category.name}
                        className="border rounded-lg p-3 sm:p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedTemplateCategories[category.name] || false}
                            onCheckedChange={(checked) =>
                              handleToggleTemplateCategory(category.name, Boolean(checked))
                            }
                            className="mt-1 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <FolderTree className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-semibold">{category.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {category.addons.length} adicionais
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {category.addons.map((addon, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs p-2 bg-muted/50 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                                >
                                  <span className="truncate font-medium">{addon.name}</span>
                                  <span className="text-muted-foreground whitespace-nowrap text-xs">
                                    R$ {addon.price.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => setIsImportDialogOpen(false)}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImportTemplates}
            disabled={!selectedTemplate || Object.values(selectedTemplateCategories).every(v => !v) || isImporting}
            className="w-full sm:w-auto"
          >
            {isImporting ? (
              <>
                <Package className="w-4 h-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Importando...</span>
                <span className="sm:hidden">Importando...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Importar Selecionados</span>
                <span className="sm:hidden">Importar</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}
