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
  AlertDialogTrigger,
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
import { useQueryClient } from '@tanstack/react-query';

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
      </div>
    </div>
  );
};

export default function ProductAddonsManager({ productId, storeId }: ProductAddonsManagerProps) {
  const queryClient = useQueryClient();
  const { addons, createAddon, updateAddon, deleteAddon, reorderAddons, duplicateAddon, isCreating, isDeleting, isDuplicating } = useProductAddons(productId);
  const { categories, addCategory } = useAddonCategories(storeId);
  const storeAddonsQuery = useStoreAddons(storeId);
  const storeAddons = storeAddonsQuery.addons || [];

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    is_available: true,
    category_id: null as string | null,
    allow_quantity: false,
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [isStoreAddonsOpen, setIsStoreAddonsOpen] = useState(false);
  const [showStoreFormInModal, setShowStoreFormInModal] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [storeAddonsSearch, setStoreAddonsSearch] = useState('');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedAddonsToImport, setSelectedAddonsToImport] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [loadingCustomTemplates, setLoadingCustomTemplates] = useState(false);
  const [importFromProductOpen, setImportFromProductOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showCategoryFormInModal, setShowCategoryFormInModal] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    min_items: 0,
    max_items: null as number | null,
    is_exclusive: false,
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
    
    // Filter by availability
    if (availabilityFilter === 'available') {
      filtered = filtered.filter(a => a.is_available);
    } else if (availabilityFilter === 'unavailable') {
      filtered = filtered.filter(a => !a.is_available);
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => a.name.toLowerCase().includes(term));
    }
    
    return filtered;
  }, [addons, categoryFilter, availabilityFilter, searchTerm]);

  const addonsByCategory = useMemo(() => {
    if (!addons) return {};
    
    // Primeiro aplicar filtros de disponibilidade e busca
    let filtered = addons;
    
    // Filter by availability
    if (availabilityFilter === 'available') {
      filtered = filtered.filter(a => a.is_available);
    } else if (availabilityFilter === 'unavailable') {
      filtered = filtered.filter(a => !a.is_available);
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => a.name.toLowerCase().includes(term));
    }
    
    // Depois agrupar por categoria
    const grouped: Record<string, typeof addons> = {
      uncategorized: filtered.filter(a => !a.category_id)
    };

    activeCategories.forEach(cat => {
      grouped[cat.id] = filtered.filter(a => a.category_id === cat.id);
    });

    return grouped;
  }, [addons, activeCategories, availabilityFilter, searchTerm]);

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
    
    setFormData({ name: '', price: 0, is_available: true, category_id: null, allow_quantity: false });
    setIsAdding(false);
  };

  const handleEdit = (addon: any) => {
    setEditingId(addon.id);
    setFormData({
      name: addon.name,
      price: addon.price,
      is_available: addon.is_available,
      category_id: addon.category_id || null,
      allow_quantity: addon.allow_quantity || false,
    });
    setIsAdding(true);
    
    // Scroll to top
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', price: 0, is_available: true, category_id: null, allow_quantity: false });
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
    const newSelected = new Set(selectedAddons);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedAddons(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredAddons.map(a => a.id));
      setSelectedAddons(allIds);
    } else {
      setSelectedAddons(new Set());
    }
  };

  const handleBulkToggleAvailability = async (makeAvailable: boolean) => {
    if (selectedAddons.size === 0) return;
    
    setIsBulkActionLoading(true);
    try {
      const updates = Array.from(selectedAddons).map(async (addonId) => {
        const addon = addons?.find(a => a.id === addonId);
        if (addon) {
          await updateAddon({
            id: addonId,
            name: addon.name,
            price: addon.price,
            is_available: makeAvailable,
            category_id: addon.category_id,
          });
        }
      });
      
      await Promise.all(updates);
      
      toast({
        title: makeAvailable ? "Adicionais ativados" : "Adicionais desativados",
        description: `${selectedAddons.size} adicionais foram ${makeAvailable ? 'ativados' : 'desativados'} com sucesso.`,
      });
      
      setSelectedAddons(new Set());
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar adicionais.",
        variant: "destructive",
      });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAddons.size === 0) return;
    
    setIsBulkActionLoading(true);
    try {
      const deletions = Array.from(selectedAddons).map(addonId => deleteAddon(addonId));
      await Promise.all(deletions);
      
      toast({
        title: "Adicionais excluídos",
        description: `${selectedAddons.size} adicionais foram excluídos com sucesso.`,
      });
      
      setSelectedAddons(new Set());
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir adicionais.",
        variant: "destructive",
      });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkChangeCategory = async (categoryId: string) => {
    if (selectedAddons.size === 0) return;
    
    setIsBulkActionLoading(true);
    try {
      const updates = Array.from(selectedAddons).map(async (addonId) => {
        const addon = addons?.find(a => a.id === addonId);
        if (addon) {
          await updateAddon({
            id: addonId,
            name: addon.name,
            price: addon.price,
            is_available: addon.is_available,
            category_id: categoryId === 'none' ? null : categoryId,
          });
        }
      });
      
      await Promise.all(updates);
      
      const categoryName = categoryId === 'none' 
        ? "Sem categoria" 
        : categories.find(c => c.id === categoryId)?.name || "Sem categoria";
      
      toast({
        title: "Categoria alterada",
        description: `${selectedAddons.size} adicionais foram movidos para "${categoryName}".`,
      });
      
      setSelectedAddons(new Set());
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao alterar categoria dos adicionais.",
        variant: "destructive",
      });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryFormData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para a categoria.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addCategory(
        categoryFormData.name,
        categoryFormData.min_items,
        categoryFormData.max_items,
        categoryFormData.is_exclusive
      );
      
      setShowCategoryFormInModal(false);
      setIsCategoryModalOpen(false);
      setCategoryFormData({
        name: '',
        min_items: 0,
        max_items: null,
        is_exclusive: false,
      });
    } catch (error) {
      // Error handled in hook
    }
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

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    // Automatically select all addons
    const allAddons = template.categories.flatMap((cat: any, catIdx: number) =>
      cat.addons.map((_: any, addonIdx: number) => `${catIdx}-${addonIdx}`)
    );
    setSelectedAddonsToImport(allAddons);
  };

  const handleToggleAddon = (addonKey: string) => {
    setSelectedAddonsToImport(prev =>
      prev.includes(addonKey)
        ? prev.filter(key => key !== addonKey)
        : [...prev, addonKey]
    );
  };

  const handleCancelImportTemplate = () => {
    setSelectedTemplate(null);
    setSelectedAddonsToImport([]);
  };

  const loadCustomTemplates = async () => {
    setLoadingCustomTemplates(true);
    try {
      const { data, error } = await supabase
        .from('store_addon_templates')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_custom', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCustomTemplates(data || []);
    } catch (error: any) {
      console.error('Error loading custom templates:', error);
      toast({
        title: 'Erro ao carregar templates',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingCustomTemplates(false);
    }
  };

  const handleImportTemplates = async () => {
    if (!selectedTemplate) return;

    setIsImporting(true);

    try {
      if (selectedAddonsToImport.length === 0) {
        toast({
          title: 'Nenhum adicional selecionado',
          description: 'Selecione pelo menos um adicional para importar.',
          variant: 'destructive',
        });
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const categoryIdx in selectedTemplate.categories) {
        const category = selectedTemplate.categories[categoryIdx];
        
        // Get addons to import from this category
        const addonsToImport = category.addons.filter((_: any, addonIdx: number) =>
          selectedAddonsToImport.includes(`${categoryIdx}-${addonIdx}`)
        );

        if (addonsToImport.length === 0) continue;

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
            errorCount += addonsToImport.length;
            continue;
          }

          categoryId = newCategory.id;
        }

        // Create selected addons in this category
        for (const addon of addonsToImport) {
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
      setSelectedAddonsToImport([]);
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

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .neq('id', productId);
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar produtos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleImportFromProduct = async (selectedProductId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_addons')
        .select('*')
        .eq('product_id', selectedProductId);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        for (const addon of data) {
          await createAddon({
            product_id: productId,
            name: addon.name,
            price: addon.price,
            is_available: addon.is_available,
            category_id: addon.category_id,
          });
        }
        
        toast({
          title: 'Adicionais importados!',
          description: `${data.length} adicional(is) foram importados com sucesso.`,
        });
      } else {
        toast({
          title: 'Nenhum adicional encontrado',
          description: 'O produto selecionado não possui adicionais cadastrados.',
          variant: 'destructive',
        });
      }
      
      setImportFromProductOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao importar adicionais',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const totalAddons = addons?.length || 0;
  const availableAddons = addons?.filter(a => a.is_available).length || 0;
  const allFilteredSelected = filteredAddons.length > 0 && filteredAddons.every(a => selectedAddons.has(a.id));
  const someFilteredSelected = filteredAddons.some(a => selectedAddons.has(a.id)) && !allFilteredSelected;

  return (
    <>
      {/* Bulk Actions Floating Bar */}
      {selectedAddons.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <Card className="shadow-lg border-2">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {selectedAddons.size} selecionado{selectedAddons.size > 1 ? 's' : ''}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedAddons(new Set())}
                    disabled={isBulkActionLoading}
                  >
                    Cancelar
                  </Button>
                </div>
                
                <Separator orientation="vertical" className="h-6 hidden sm:block" />
                
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkToggleAvailability(true)}
                    disabled={isBulkActionLoading}
                  >
                    Ativar
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkToggleAvailability(false)}
                    disabled={isBulkActionLoading}
                  >
                    Desativar
                  </Button>
                  
                  <Select onValueChange={handleBulkChangeCategory} disabled={isBulkActionLoading}>
                    <SelectTrigger className="h-9 w-auto min-w-[140px]">
                      <SelectValue placeholder="Mudar categoria" />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {categories.filter(c => c.is_active).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                  onClick={() => {
                    loadCustomTemplates();
                    setIsImportDialogOpen(true);
                  }}
                  className="w-full sm:w-auto shrink-0 justify-start sm:justify-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Importar Templates</span>
                  <span className="sm:hidden">Templates</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    loadProducts();
                    setImportFromProductOpen(true);
                  }}
                  className="w-full sm:w-auto shrink-0 justify-start sm:justify-center"
                >
                  <Package className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Importar de Produtos</span>
                  <span className="sm:hidden">Produtos</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsStoreAddonsOpen(true)}
                  className="w-full sm:w-auto shrink-0 justify-start sm:justify-center"
                >
                  <Search className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Buscar adicionais</span>
                  <span className="sm:hidden">Buscar</span>
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
                <div className="flex gap-2">
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
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsCategoryModalOpen(true)}
                    title="Criar nova categoria"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
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

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.allow_quantity}
                  onCheckedChange={(checked) => setFormData({ ...formData, allow_quantity: checked })}
                />
                <Label>Permite quantidade</Label>
              </div>
              <span className="text-xs text-muted-foreground">Cliente pode escolher múltiplas porções</span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={isCreating} className="flex-1">
                {editingId ? 'Atualizar' : 'Adicionar'}
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
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

            {/* Availability filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <Badge variant="outline" className="flex-shrink-0">
                Status
              </Badge>
              <Select value={availabilityFilter} onValueChange={(value: any) => setAvailabilityFilter(value)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por disponibilidade" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="available">Disponíveis</SelectItem>
                  <SelectItem value="unavailable">Indisponíveis</SelectItem>
                </SelectContent>
              </Select>
              {availabilityFilter !== 'all' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAvailabilityFilter('all')}
                  className="w-full sm:w-auto"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

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
                            isSelected={selectedAddons.has(addon.id)}
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
                              isSelected={selectedAddons.has(addon.id)}
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
                      isSelected={selectedAddons.has(addon.id)}
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
    <Dialog open={isStoreAddonsOpen} onOpenChange={(open) => {
      setIsStoreAddonsOpen(open);
      if (open) {
        // Força atualização dos dados ao abrir o diálogo
        queryClient.invalidateQueries({ queryKey: ['store-addons', storeId] });
      }
      if (!open) {
        setShowStoreFormInModal(false);
        setFormData({
          name: '',
          price: 0,
          is_available: true,
          category_id: null,
          allow_quantity: false,
        });
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[85vh] w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Adicionais da Loja
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Form to Create New Addon */}
          {showStoreFormInModal && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
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
                  <div className="flex gap-2">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setIsCategoryModalOpen(true)}
                      title="Criar nova categoria"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
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

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.allow_quantity}
                    onCheckedChange={(checked) => setFormData({ ...formData, allow_quantity: checked })}
                  />
                  <Label>Permite quantidade</Label>
                </div>
                <span className="text-xs text-muted-foreground">Cliente pode escolher múltiplas porções</span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={async () => {
                    await handleSubmit();
                    setShowStoreFormInModal(false);
                  }} 
                  disabled={isCreating} 
                  className="flex-1"
                >
                  Adicionar
                </Button>
                <Button 
                  onClick={() => {
                    setShowStoreFormInModal(false);
                    setFormData({
                      name: '',
                      price: 0,
                      is_available: true,
                      category_id: null,
                      allow_quantity: false,
                    });
                  }} 
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
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
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowStoreFormInModal(!showStoreFormInModal)}
              className="shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Adicional
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCategoryModalOpen(true)}
              className="shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const availableAddons = filteredStoreAddons.filter(addon => !addons?.some(a => a.name === addon.name));
                availableAddons.forEach(addon => handleCopyStoreAddon(addon));
              }}
              disabled={filteredStoreAddons.filter(addon => !addons?.some(a => a.name === addon.name)).length === 0}
              className="shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Todos
            </Button>
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
                            onClick={() => handleCopyStoreAddon(addon)}
                            disabled={isInProduct}
                            className="w-full sm:w-auto"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar
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
                              onClick={() => handleCopyStoreAddon(addon)}
                              disabled={isInProduct}
                              className="w-full sm:w-auto"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Adicionar
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
    <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
      setIsImportDialogOpen(open);
      if (!open) {
        setSelectedTemplate(null);
        setSelectedAddonsToImport([]);
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {selectedTemplate ? 'Selecionar Adicionais' : 'Importar Templates de Adicionais'}
          </DialogTitle>
          <DialogDescription>
            {selectedTemplate
              ? 'Marque os adicionais que deseja importar para este produto'
              : 'Selecione um template para visualizar seus adicionais'
            }
          </DialogDescription>
        </DialogHeader>

        {!selectedTemplate ? (
          <div className="space-y-3">
            {loadingCustomTemplates ? (
              <p className="text-center py-4 text-muted-foreground">Carregando templates...</p>
            ) : customTemplates.length > 0 ? (
              customTemplates.map((template) => {
                const addonCount = template.categories?.reduce((sum: number, cat: any) => sum + (cat.addons?.length || 0), 0) || 0;
                const hasNoAddons = addonCount === 0;

                return (
                  <div
                    key={template.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                      hasNoAddons
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-muted/50 cursor-pointer'
                    }`}
                    onClick={() => !hasNoAddons && handleSelectTemplate(template)}
                  >
                    <div className="text-3xl">{template.icon || '📦'}</div>
                    <div className="flex-1">
                      <p className="font-medium">{template.name}</p>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {addonCount} adicional(is)
                        </p>
                        {hasNoAddons && (
                          <Badge variant="destructive" className="text-xs">
                            Sem adicionais
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Nenhum template encontrado</p>
                <p className="text-sm mt-1">Crie templates na aba Templates para reutilizá-los aqui</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <div className="text-3xl">{selectedTemplate.icon || '📦'}</div>
              <div className="flex-1">
                <p className="font-medium">{selectedTemplate.name}</p>
                {selectedTemplate.description && (
                  <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelImportTemplate}
              >
                Voltar
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Adicionais disponíveis:</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {selectedAddonsToImport.length} de{' '}
                    {selectedTemplate.categories?.reduce((sum: number, cat: any) => sum + (cat.addons?.length || 0), 0) || 0}{' '}
                    selecionados
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allAddons = selectedTemplate.categories.flatMap((cat: any, catIdx: number) =>
                        cat.addons.map((_: any, addonIdx: number) => `${catIdx}-${addonIdx}`)
                      );
                      setSelectedAddonsToImport(allAddons);
                    }}
                    className="h-7 text-xs"
                  >
                    Selecionar Todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAddonsToImport([])}
                    className="h-7 text-xs"
                  >
                    Desmarcar Todos
                  </Button>
                </div>
              </div>

              {selectedTemplate.categories?.map((category: any, catIdx: number) => (
                <div key={catIdx} className="space-y-2">
                  <div className="flex items-center gap-2 mt-3 mb-2">
                    <FolderTree className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">{category.name}</Label>
                    <Badge variant="secondary" className="text-xs">
                      {category.addons.length}
                    </Badge>
                  </div>
                  {category.addons.map((addon: any, addonIdx: number) => {
                    const addonKey = `${catIdx}-${addonIdx}`;
                    return (
                      <div
                        key={addonKey}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedAddonsToImport.includes(addonKey)}
                          onCheckedChange={() => handleToggleAddon(addonKey)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{addon.name}</p>
                            <span className="text-sm text-muted-foreground">
                              R$ {(addon.price || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleImportTemplates}
                disabled={selectedAddonsToImport.length === 0 || isImporting}
                className="flex-1"
              >
                {isImporting ? (
                  <>
                    <Package className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    Importar {selectedAddonsToImport.length} Adicional(is)
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelImportTemplate}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Dialog: Importar de Produto */}
    <Dialog open={importFromProductOpen} onOpenChange={setImportFromProductOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Adicionais de Produto</DialogTitle>
          <DialogDescription>
            Selecione um produto para importar seus adicionais
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {loadingProducts ? (
            <p className="text-center py-4 text-muted-foreground">Carregando produtos...</p>
          ) : products.length > 0 ? (
            products.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleImportFromProduct(product.id)}
              >
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium">{product.name}</p>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
                  )}
                  <p className="text-sm font-medium text-primary mt-1">
                    R$ {product.price.toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-4 text-muted-foreground">
              Nenhum outro produto encontrado
            </p>
          )}
        </div>
        </DialogContent>
      </Dialog>

      {/* Modal separado para criar categoria */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Categoria</DialogTitle>
            <DialogDescription>
              Crie uma categoria para organizar seus adicionais
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Categoria</Label>
              <Input
                placeholder="Ex: Molhos, Coberturas, Tamanhos..."
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mín. de itens</Label>
                <Input
                  type="number"
                  min="0"
                  value={categoryFormData.min_items}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, min_items: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Máx. de itens</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ilimitado"
                  value={categoryFormData.max_items || ''}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, max_items: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={categoryFormData.is_exclusive}
                onCheckedChange={(checked) => setCategoryFormData({ ...categoryFormData, is_exclusive: checked })}
              />
              <Label>Seleção exclusiva (escolher apenas 1)</Label>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button 
              onClick={() => {
                setIsCategoryModalOpen(false);
                setCategoryFormData({
                  name: '',
                  min_items: 0,
                  max_items: null,
                  is_exclusive: false,
                });
              }} 
              variant="outline"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateCategory}
            >
              Criar Categoria
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
