import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, DollarSign, FolderTree, X, GripVertical, Search, Store, Lightbulb, Download, Package, Filter, Power, PowerOff, ChevronDown, ChevronUp } from "lucide-react";
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
import { 
  ResponsiveDialog,
  ResponsiveDialogContent, 
  ResponsiveDialogHeader, 
  ResponsiveDialogTitle, 
  ResponsiveDialogDescription 
} from "@/components/ui/responsive-dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { addonTemplates, type BusinessTemplate } from "@/lib/addonTemplates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { NewAddonDialog } from "./NewAddonDialog";
import { AddonCategoriesManager } from "./AddonCategoriesManager";

interface ProductAddonsManagerProps {
  productId: string;
  storeId: string;
  hideDeleteButton?: boolean;
}

interface SortableAddonProps {
  addon: any;
  onEdit: (addon: any) => void;
  onDelete: (id: string, name: string) => void;
  onToggleAvailability: (addon: any) => void;
  isDeleting: boolean;
  hideDeleteButton?: boolean;
}

interface SortableCategoryProps {
  category: any;
  addons: any[];
  onEdit: (addon: any) => void;
  onDelete: (id: string, name: string) => void;
  onToggleAvailability: (addon: any) => void;
  isDeleting: boolean;
  hideDeleteButton?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const SortableAddon = ({ addon, onEdit, onDelete, onToggleAvailability, isDeleting, hideDeleteButton }: SortableAddonProps) => {
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
      className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-3 border rounded-lg hover:bg-muted/50 transition-colors ${!addon.is_available ? 'opacity-60 bg-muted/30' : ''}`}
    >
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <button
          className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm sm:text-base truncate">{addon.name}</span>
            <Badge 
              variant={addon.is_available ? "default" : "secondary"} 
              className={`text-xs whitespace-nowrap ${addon.is_available ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {addon.is_available ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            + R$ {addon.price.toFixed(2)}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggleAvailability(addon)}
            title={addon.is_available ? 'Inativar' : 'Ativar'}
            className={`h-8 w-8 sm:h-9 sm:w-9 ${addon.is_available ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
          >
            {addon.is_available ? (
              <PowerOff className="w-3 h-3 sm:w-4 sm:h-4" />
            ) : (
              <Power className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(addon)}
            title="Editar"
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
          {!hideDeleteButton && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                console.log(`[SortableAddon] 🔴 BOTÃO CLICADO!`, { id: addon.id, name: addon.name });
                console.log(`[SortableAddon] onDelete função tipo:`, typeof onDelete);
                onDelete(addon.id, addon.name);
              }}
              disabled={isDeleting}
              title="Excluir"
              className="text-destructive hover:text-destructive h-8 w-8 sm:h-9 sm:w-9"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const SortableCategory = ({ category, addons, onEdit, onDelete, onToggleAvailability, isDeleting, hideDeleteButton, isExpanded, onToggleExpand }: SortableCategoryProps) => {
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
    <div ref={setNodeRef} style={style} className="space-y-2">
      <Separator className="my-4" />
      <div 
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground py-2 cursor-pointer hover:text-foreground transition-colors"
        onClick={onToggleExpand}
      >
        <button
          className="cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <FolderTree className="w-4 h-4" />
        <span className="flex-1">{category.name}</span>
        <Badge variant="secondary" className="text-xs">
          {addons.length} {addons.length === 1 ? 'adicional' : 'adicionais'}
        </Badge>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </div>
      {isExpanded && (
        <div className="animate-accordion-down">
          <SortableContext
            items={addons.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            {addons.map((addon) => (
              <SortableAddon
                key={addon.id}
                addon={addon}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleAvailability={onToggleAvailability}
                isDeleting={isDeleting}
                hideDeleteButton={hideDeleteButton}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
};

export default function ProductAddonsManager({ productId, storeId, hideDeleteButton }: ProductAddonsManagerProps) {
  console.log(`[ProductAddonsManager] 🎨 Renderizado - productId: ${productId}, storeId: ${storeId}`);
  const queryClient = useQueryClient();
  const { addons, createAddon, updateAddon, deleteAddon, reorderAddons, isCreating, isDeleting } = useProductAddons(productId);
  const { categories, addCategory, reorderCategories, updateUncategorizedPosition, refetch: refetchCategories } = useAddonCategories(storeId);
  const storeAddonsQuery = useStoreAddons(storeId);
  const storeAddons = storeAddonsQuery.addons || [];

  // Get uncategorized position from store settings
  const { data: storeData } = useQuery({
    queryKey: ['store-uncategorized-order', storeId],
    queryFn: async () => {
      if (!storeId) return { uncategorized_display_order: -1 };
      try {
        const { data, error } = await (supabase as any)
          .from('stores')
          .select('uncategorized_display_order')
          .eq('id', storeId)
          .single();
        
        if (error) throw error;
        return data as { uncategorized_display_order: number };
      } catch (error) {
        // Column might not exist yet, return default
        return { uncategorized_display_order: -1 };
      }
    },
    enabled: !!storeId
  });

  const uncategorizedDisplayOrder = storeData?.uncategorized_display_order ?? -1;

  // Listen for new categories created from NewAddonDialog
  useEffect(() => {
    const handleCategoryCreated = () => {
      refetchCategories();
    };

    window.addEventListener('addonCategoryCreated', handleCategoryCreated);
    return () => {
      window.removeEventListener('addonCategoryCreated', handleCategoryCreated);
    };
  }, [refetchCategories]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    name: string;
    linkedProducts: Array<{ id: string; name: string; product_id: string }>;
  } | null>(null);

  // Debug: Log addons carregados
  useEffect(() => {
    console.log(`[ProductAddonsManager] 📦 Addons carregados do produto ${productId}:`, addons?.length || 0, addons);
  }, [addons, productId]);

  // Debug: Log confirmDelete state
  useEffect(() => {
    console.log(`[ProductAddonsManager] 🔔 confirmDelete mudou:`, confirmDelete);
  }, [confirmDelete]);
  const [selectedProductsToDelete, setSelectedProductsToDelete] = useState<string[]>([]);

  // Auto-selecionar todos os produtos quando o dialog de exclusão abrir
  useEffect(() => {
    if (confirmDelete?.linkedProducts && confirmDelete.linkedProducts.length > 0) {
      const productIds = confirmDelete.linkedProducts.map(p => p.product_id);
      console.log(`[Delete Addon useEffect] Auto-selecionando ${productIds.length} produtos:`, productIds);
      setSelectedProductsToDelete(productIds);
    } else if (confirmDelete && confirmDelete.linkedProducts.length === 0) {
      console.log(`[Delete Addon useEffect] Nenhum produto vinculado encontrado`);
      setSelectedProductsToDelete([]);
    }
  }, [confirmDelete]);
  const [isStoreAddonsOpen, setIsStoreAddonsOpen] = useState(false);
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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditCategoriesOpen, setIsEditCategoriesOpen] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    min_items: 0,
    max_items: null as number | null,
    is_exclusive: false,
  });
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const formRef = useRef<HTMLDivElement>(null);
  
  // Expand/collapse state for categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedStoreAddonCategories, setExpandedStoreAddonCategories] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const toggleStoreAddonCategoryExpansion = (categoryId: string) => {
    setExpandedStoreAddonCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const activeCategories = categories.filter(cat => cat.is_active);

  // Filtered products for import dialog
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!productSearchTerm.trim()) return products;
    
    const term = productSearchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.description && p.description.toLowerCase().includes(term))
    );
  }, [products, productSearchTerm]);

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

  // Criar categoria virtual para "Sem categoria" e combiná-la com as categorias reais
  const allCategoriesForDisplay = useMemo(() => {
    const uncategorizedAddons = addonsByCategory.uncategorized || [];
    
    if (uncategorizedAddons.length === 0) {
      return activeCategories;
    }

    const uncategorizedCategory = {
      id: 'uncategorized',
      name: 'Sem categoria',
      store_id: storeId,
      is_active: true,
      display_order: uncategorizedDisplayOrder,
      created_at: '',
      updated_at: '',
      min_items: 0,
      max_items: null,
      is_exclusive: false
    };

    // Combine and sort by display_order
    const combined = [uncategorizedCategory, ...activeCategories];
    return combined.sort((a, b) => a.display_order - b.display_order);
  }, [activeCategories, addonsByCategory.uncategorized, storeId, uncategorizedDisplayOrder]);

  // Autocomplete suggestions combining store addons and templates
  const autocompleteSuggestions = useMemo(() => {
    const term = '';
    return [];
  }, [storeAddons, addons]);

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

  const handleSubmit = (data: {
    name: string;
    price: number;
    category_id: string | null;
    is_available: boolean;
    allow_quantity: boolean;
  }) => {
    // Verificar se já existe um adicional com o mesmo nome
    const normalizedName = data.name.trim().toLowerCase();
    const existingAddon = addons?.find(addon => 
      addon.name.trim().toLowerCase() === normalizedName && 
      (!editingAddon || addon.id !== editingAddon.id)
    );

    if (existingAddon) {
      toast({
        title: "Adicional já existe",
        description: `Já existe um adicional com o nome "${data.name}". Por favor, escolha outro nome.`,
        variant: "destructive",
      });
      return;
    }

    if (editingAddon) {
      updateAddon({ id: editingAddon.id, ...data });
    } else {
      createAddon({ ...data, product_id: productId });
    }
    
    setIsDialogOpen(false);
    setEditingAddon(null);
  };

  const handleEdit = (addon: any) => {
    setEditingAddon(addon);
    setIsDialogOpen(true);
  };

  const handleNewAddon = () => {
    setEditingAddon(null);
    setIsDialogOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Check if we're dragging a category or an addon
    const isDraggingCategory = allCategoriesForDisplay.some(cat => cat.id === active.id);

    if (isDraggingCategory) {
      const oldIndex = allCategoriesForDisplay.findIndex((cat) => cat.id === active.id);
      const newIndex = allCategoriesForDisplay.findIndex((cat) => cat.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Create new order with updated positions
      const reordered = arrayMove(allCategoriesForDisplay, oldIndex, newIndex);
      
      // Assign sequential display_order to all categories
      const updatedCategories = reordered.map((cat, index) => ({
        ...cat,
        display_order: index
      }));

      try {
        // Update uncategorized position if it was moved
        const uncategorizedCat = updatedCategories.find(cat => cat.id === 'uncategorized');
        if (uncategorizedCat && updateUncategorizedPosition) {
          await updateUncategorizedPosition(uncategorizedCat.display_order);
        }

        // Update real categories positions
        const realCategories = updatedCategories.filter(cat => cat.id !== 'uncategorized');
        await reorderCategories(realCategories);
        
        // Force refetch to update UI
        queryClient.invalidateQueries({ queryKey: ['store-uncategorized-order', storeId] });
      } catch (error) {
        console.error('Error reordering categories:', error);
      }
    } else if (addons) {
      // Reorder addons
      const oldIndex = addons.findIndex((addon) => addon.id === active.id);
      const newIndex = addons.findIndex((addon) => addon.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(addons, oldIndex, newIndex);
        const updates = reordered.map((addon, index) => ({
          id: addon.id,
          display_order: index,
        }));

        reorderAddons(updates);
      }
    }
  };

  const handleDeleteClick = async (id: string, name: string) => {
    console.log(`[Delete Addon] ====== FUNÇÃO CHAMADA ======`);
    console.log(`[Delete Addon] 🔴 ID: ${id}`);
    console.log(`[Delete Addon] 🔴 Nome: "${name}"`);
    console.log(`[Delete Addon] 🔴 StoreId: ${storeId}`);
    console.log(`[Delete Addon] 🔴 ProductId: ${productId}`);
    
    // Buscar todos os produtos que têm esse adicional (busca case-insensitive)
    try {
      console.log(`[Delete Addon] 🔍 Passo 1: Buscando produtos da loja ${storeId}...`);
      
      // Primeiro buscar todos os produtos da loja atual
      const { data: storeProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .eq('store_id', storeId);

      console.log(`[Delete Addon] 📦 Produtos da loja encontrados:`, storeProducts?.length || 0, storeProducts);

      if (productsError) {
        console.error(`[Delete Addon] ❌ Erro ao buscar produtos:`, productsError);
        throw productsError;
      }

      if (!storeProducts || storeProducts.length === 0) {
        console.log(`[Delete Addon] ❌ Nenhum produto da loja encontrado`);
        toast({
          title: "Nenhum produto encontrado",
          description: "Não há produtos cadastrados nesta loja.",
          variant: "destructive",
        });
        setConfirmDelete({ id, name, linkedProducts: [] });
        return;
      }

      console.log(`[Delete Addon] 🔍 Passo 2: Buscando adicionais com o nome "${name}" (case-insensitive)...`);
      
      // Buscar addons com esse nome apenas dos produtos da loja (ILIKE para case-insensitive)
      const productIds = storeProducts.map(p => p.id);
      const { data: linkedAddons, error: addonsError } = await supabase
        .from('product_addons')
        .select('id, name, product_id')
        .ilike('name', name)
        .in('product_id', productIds);

      console.log(`[Delete Addon] 🔍 Adicionais "${name}" encontrados:`, linkedAddons?.length || 0, linkedAddons);

      if (addonsError) {
        console.error(`[Delete Addon] ❌ Erro ao buscar adicionais:`, addonsError);
        throw addonsError;
      }

      if (!linkedAddons || linkedAddons.length === 0) {
        console.log(`[Delete Addon] ⚠️ Nenhum adicional encontrado com o nome "${name}"`);
        toast({
          title: "Adicional não encontrado",
          description: `Não foi possível encontrar o adicional "${name}" em nenhum produto.`,
          variant: "destructive",
        });
        setConfirmDelete({ id, name, linkedProducts: [] });
        return;
      }

      console.log(`[Delete Addon] ✅ Encontrados ${linkedAddons.length} adicionais "${name}" na loja`);

      console.log(`[Delete Addon] 🔍 Passo 3: Combinando dados de produtos e adicionais...`);
      
      // Combinar os dados
      let linkedProducts = linkedAddons
        .map((addon: any) => {
          const product = storeProducts.find(p => p.id === addon.product_id);
          return product ? {
            id: addon.id,
            name: product.name,
            product_id: addon.product_id,
          } : null;
        })
        .filter(Boolean) as Array<{ id: string; name: string; product_id: string }>;

      console.log(`[Delete Addon] 📋 Produtos vinculados preparados:`, linkedProducts.length, linkedProducts);
      
      // Se não há produtos vinculados mas o adicional existe no produto atual, mostrar o produto atual
      if (linkedProducts.length === 0) {
        console.log(`[Delete Addon] ⚠️ Nenhum produto vinculado. Buscando produto atual ${productId}...`);
        const { data: currentProduct, error: currentProductError } = await supabase
          .from('products')
          .select('id, name')
          .eq('id', productId)
          .single();

        if (currentProductError) {
          console.error(`[Delete Addon] ❌ Erro ao buscar produto atual:`, currentProductError);
        } else if (currentProduct) {
          console.log(`[Delete Addon] ✅ Produto atual encontrado:`, currentProduct);
          linkedProducts = [{
            id: id,
            name: currentProduct.name,
            product_id: productId
          }];
        }
      }
      
      console.log(`[Delete Addon] ✅ Abrindo dialog de confirmação com ${linkedProducts.length} produto(s)...`);
      setConfirmDelete({ id, name, linkedProducts });
      console.log(`[Delete Addon] ✅ Dialog state atualizado!`);
    } catch (error) {
      console.error('[Delete Addon] ❌ ERRO FATAL:', error);
      toast({
        title: "Erro ao processar exclusão",
        description: "Não foi possível buscar os produtos vinculados. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;

    try {
      if (selectedProductsToDelete.length === 0) {
        toast({
          title: "Nenhum produto selecionado",
          description: "Selecione pelo menos um produto para remover o adicional.",
          variant: "destructive",
        });
        return;
      }

      console.log(`[Delete Addon] Confirmando exclusão do adicional "${confirmDelete.name}"`);
      console.log(`[Delete Addon] Produtos selecionados:`, selectedProductsToDelete);
      console.log(`[Delete Addon] Total de produtos vinculados:`, confirmDelete.linkedProducts.length);

      // Se selecionou todos, usar a função de delete padrão
      if (selectedProductsToDelete.length === confirmDelete.linkedProducts.length) {
        const idsToDelete = confirmDelete.linkedProducts.map(p => p.id);
        console.log(`[Delete Addon] Deletando TODOS os adicionais. IDs:`, idsToDelete);
        
        // Deletar todos os adicionais com esse nome
        const { error } = await supabase
          .from('product_addons')
          .delete()
          .in('id', idsToDelete);

        if (error) throw error;

        console.log(`[Delete Addon] ✅ Removido de ${idsToDelete.length} produto(s)`);
        toast({
          title: "Adicional removido",
          description: `O adicional "${confirmDelete.name}" foi removido de ${idsToDelete.length} produto(s).`,
        });
      } else {
        // Deletar apenas dos produtos selecionados
        const addonsToDelete = confirmDelete.linkedProducts
          .filter(p => selectedProductsToDelete.includes(p.product_id))
          .map(p => p.id);

        console.log(`[Delete Addon] Deletando adicionais SELECIONADOS. IDs:`, addonsToDelete);
        
        const { error } = await supabase
          .from('product_addons')
          .delete()
          .in('id', addonsToDelete);

        if (error) throw error;

        console.log(`[Delete Addon] ✅ Removido de ${selectedProductsToDelete.length} produto(s)`);
        toast({
          title: "Adicional removido",
          description: `O adicional "${confirmDelete.name}" foi removido de ${selectedProductsToDelete.length} produto(s).`,
        });
      }

      // Invalidar queries para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['product-addons'] });
      queryClient.invalidateQueries({ queryKey: ['store-all-addons'] });
      
      setConfirmDelete(null);
      setSelectedProductsToDelete([]);
    } catch (error) {
      console.error('Error deleting addon:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o adicional. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleToggleAvailability = (addon: any) => {
    updateAddon({
      id: addon.id,
      name: addon.name,
      price: addon.price,
      is_available: !addon.is_available,
      category_id: addon.category_id,
      allow_quantity: addon.allow_quantity,
    });
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

  const handleCopyStoreAddon = async (storeAddon: typeof storeAddons[0]) => {
    // Verificar se já existe um adicional com o mesmo nome e categoria neste produto
    const existingAddon = addons?.find(
      a => a.name === storeAddon.name && a.category_id === storeAddon.category_id
    );

    if (existingAddon) {
      // Se já existe, alternar disponibilidade (ativo <-> inativo)
      updateAddon({
        id: existingAddon.id,
        name: existingAddon.name,
        price: storeAddon.price,
        is_available: !existingAddon.is_available,
        category_id: existingAddon.category_id,
        allow_quantity: existingAddon.allow_quantity,
      });
    } else {
      // Se não existe, criar novo já disponível
      createAddon({
        name: storeAddon.name,
        price: storeAddon.price,
        is_available: true,
        category_id: storeAddon.category_id || null,
        product_id: productId,
      });
    }
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
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full md:w-auto">
              <Button 
                size="sm" 
                onClick={handleNewAddon}
                className="w-full sm:w-auto shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Adicional
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
        {/* Search and Filters */}
        {addons && addons.length > 0 && (
          <div className="space-y-3">
            {/* Search and Availability filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar adicionais..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={availabilityFilter} onValueChange={(value: any) => setAvailabilityFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="available">Disponíveis</SelectItem>
                  <SelectItem value="unavailable">Indisponíveis</SelectItem>
                </SelectContent>
              </Select>
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
            {(searchTerm || categoryFilter !== 'all' || availabilityFilter !== 'all') && (
              <p className="text-sm text-muted-foreground">
                {filteredAddons.length} {filteredAddons.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
              </p>
            )}
          </div>
        )}

        {!addons || filteredAddons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground min-h-[calc(90vh-350px)] flex items-center justify-center flex-col">
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
                // Group by category view with sortable categories
                <SortableContext
                  items={allCategoriesForDisplay.map((cat) => cat.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {allCategoriesForDisplay.map((category) => {
                    const categoryAddons = addonsByCategory[category.id];
                    if (!categoryAddons || categoryAddons.length === 0) return null;

                    return (
                      <SortableCategory
                        key={category.id}
                        category={category}
                        addons={categoryAddons}
                        onEdit={handleEdit}
                        onDelete={handleDeleteClick}
                        onToggleAvailability={handleToggleAvailability}
                        isDeleting={isDeleting}
                        hideDeleteButton={hideDeleteButton}
                        isExpanded={expandedCategories.has(category.id)}
                        onToggleExpand={() => toggleCategoryExpansion(category.id)}
                      />
                    );
                  })}
                </SortableContext>
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
                      onDelete={handleDeleteClick}
                      onToggleAvailability={handleToggleAvailability}
                      isDeleting={isDeleting}
                      hideDeleteButton={hideDeleteButton}
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
    <AlertDialog 
      open={!!confirmDelete} 
      onOpenChange={(open) => {
        console.log(`[Dialog] onOpenChange - open: ${open}, confirmDelete:`, confirmDelete);
        if (!open) {
          setConfirmDelete(null);
          setSelectedProductsToDelete([]);
        }
      }}
    >
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            O adicional <strong>"{confirmDelete?.name}"</strong> está vinculado aos seguintes produtos.
            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
              ⚠️ <strong>Atenção:</strong> Por padrão, todos os produtos estão selecionados. O adicional será removido de todos eles ao confirmar.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4 space-y-3 max-h-[400px] overflow-y-auto">
          {(() => {
            console.log(`[Dialog Render] confirmDelete:`, confirmDelete);
            console.log(`[Dialog Render] linkedProducts:`, confirmDelete?.linkedProducts);
            console.log(`[Dialog Render] linkedProducts.length:`, confirmDelete?.linkedProducts?.length);
            console.log(`[Dialog Render] selectedProductsToDelete:`, selectedProductsToDelete);
            return null;
          })()}
          
          {confirmDelete?.linkedProducts && confirmDelete.linkedProducts.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-3 pb-2 border-b">
                <span className="text-sm font-medium">
                  {selectedProductsToDelete.length} de {confirmDelete.linkedProducts.length} produto(s) selecionado(s)
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log(`[Dialog] Selecionar Todos clicado`);
                      setSelectedProductsToDelete(confirmDelete.linkedProducts.map(p => p.product_id));
                    }}
                  >
                    Selecionar Todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log(`[Dialog] Desmarcar Todos clicado`);
                      setSelectedProductsToDelete([]);
                    }}
                  >
                    Desmarcar Todos
                  </Button>
                </div>
              </div>
              
              {confirmDelete.linkedProducts.map((product) => (
                <div
                  key={product.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedProductsToDelete.includes(product.product_id)
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    setSelectedProductsToDelete(prev =>
                      prev.includes(product.product_id)
                        ? prev.filter(id => id !== product.product_id)
                        : [...prev, product.product_id]
                    );
                  }}
                >
                  <Checkbox
                    checked={selectedProductsToDelete.includes(product.product_id)}
                    onCheckedChange={(checked) => {
                      setSelectedProductsToDelete(prev =>
                        checked
                          ? [...prev, product.product_id]
                          : prev.filter(id => id !== product.product_id)
                      );
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Nenhum produto vinculado encontrado.
            </p>
          )}
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setSelectedProductsToDelete([])}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmDelete} 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={selectedProductsToDelete.length === 0}
          >
            Remover de {selectedProductsToDelete.length} produto(s)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Store Addons Dialog */}
    <ResponsiveDialog open={isStoreAddonsOpen} onOpenChange={(open) => {
      setIsStoreAddonsOpen(open);
      if (open) {
        // Força atualização dos dados ao abrir o diálogo
        queryClient.invalidateQueries({ queryKey: ['store-addons', storeId] });
      }
    }}>
      <ResponsiveDialogContent className="w-full max-w-full md:max-w-[80vw] lg:max-w-[50vw] max-h-[90vh] flex flex-col bg-background z-50">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Adicionais da Loja
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="space-y-4">
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
              onClick={handleNewAddon}
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
              onClick={() => setIsEditCategoriesOpen(true)}
              className="shrink-0"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar Categorias
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const availableAddons = filteredStoreAddons.filter(addon => !addons?.some(a => a.name === addon.name && a.is_available));
                availableAddons.forEach(addon => handleCopyStoreAddon(addon));
              }}
              disabled={filteredStoreAddons.filter(addon => !addons?.some(a => a.name === addon.name && a.is_available)).length === 0}
              className="shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Todos
            </Button>
          </div>

          {/* Store Addons List */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 pr-4">
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
                      <div 
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground py-2 cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => toggleStoreAddonCategoryExpansion('uncategorized')}
                      >
                        <FolderTree className="w-4 h-4" />
                        <span className="flex-1">Sem categoria</span>
                        {expandedStoreAddonCategories.has('uncategorized') ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                      {expandedStoreAddonCategories.has('uncategorized') && (
                        <div className="animate-accordion-down">
                          {groupedStoreAddons.uncategorized.map((addon) => {
                            const isInProduct = addons?.some(a => a.name === addon.name && a.is_available);
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
                                  className="w-full sm:w-auto"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  {addons?.some(a => a.name === addon.name && a.category_id === addon.category_id && a.is_available)
                                    ? 'Remover do produto'
                                    : 'Adicionar'}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Categorized */}
                  {activeCategories.map((category) => {
                    const categoryAddons = groupedStoreAddons[category.id];
                    if (!categoryAddons || categoryAddons.length === 0) return null;

                    return (
                      <div key={category.id} className="space-y-2">
                        <Separator />
                        <div 
                          className="flex items-center gap-2 text-sm font-medium text-muted-foreground py-2 cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => toggleStoreAddonCategoryExpansion(category.id)}
                        >
                          <FolderTree className="w-4 h-4" />
                          <span className="flex-1">{category.name}</span>
                          {expandedStoreAddonCategories.has(category.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                        {expandedStoreAddonCategories.has(category.id) && (
                          <div className="animate-accordion-down">
                            {categoryAddons.map((addon) => {
                              const isInProduct = addons?.some(a => a.name === addon.name && a.is_available);
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
                                    className="w-full sm:w-auto"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    {addons?.some(a => a.name === addon.name && a.category_id === addon.category_id && a.is_available)
                                      ? 'Remover do produto'
                                      : 'Adicionar'}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>

    {/* Import Templates Dialog */}
    <ResponsiveDialog open={isImportDialogOpen} onOpenChange={(open) => {
      setIsImportDialogOpen(open);
      if (!open) {
        setSelectedTemplate(null);
        setSelectedAddonsToImport([]);
      }
    }}>
      <ResponsiveDialogContent className="w-full max-w-full md:max-w-[80vw] lg:max-w-[50vw] max-h-[90vh] flex flex-col bg-background z-50">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {selectedTemplate ? 'Selecionar Adicionais' : 'Importar Templates de Adicionais'}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {selectedTemplate
              ? 'Marque os adicionais que deseja importar para este produto'
              : 'Selecione um template para visualizar seus adicionais'
            }
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

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
      </ResponsiveDialogContent>
    </ResponsiveDialog>

    {/* Dialog: Importar de Produto */}
    <ResponsiveDialog open={importFromProductOpen} onOpenChange={setImportFromProductOpen}>
      <ResponsiveDialogContent className="w-full max-w-full md:max-w-[80vw] lg:max-w-[50vw] max-h-[90vh] flex flex-col bg-background z-50">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Importar Adicionais de Produto</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Selecione um produto para importar seus adicionais
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar produto..."
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-3">
          {loadingProducts ? (
            <p className="text-center py-4 text-muted-foreground">Carregando produtos...</p>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
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
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Modal separado para criar categoria */}
      <ResponsiveDialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <ResponsiveDialogContent className="w-full max-w-full md:max-w-[80vw] lg:max-w-[50vw] max-h-[90vh] flex flex-col bg-background z-50">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Criar Nova Categoria</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Crie uma categoria para organizar seus adicionais
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          
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
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <NewAddonDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        storeId={storeId}
        onSubmit={handleSubmit}
        editData={editingAddon ? {
          name: editingAddon.name,
          price: editingAddon.price,
          category_id: editingAddon.category_id,
          is_available: editingAddon.is_available,
          allow_quantity: editingAddon.allow_quantity || false,
        } : null}
        isLoading={isCreating}
      />

      {/* Dialog de Editar Categorias */}
      <ResponsiveDialog open={isEditCategoriesOpen} onOpenChange={setIsEditCategoriesOpen}>
        <ResponsiveDialogContent className="w-full max-w-full md:max-w-[80vw] lg:max-w-[50vw] max-h-[90vh] flex flex-col bg-background z-50">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Gerenciar Categorias de Adicionais</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <AddonCategoriesManager storeId={storeId} />
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
