import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, GripVertical, Search, Filter, FolderPlus, X, Download, Package, Store, Edit, FolderTree, Power, PowerOff } from 'lucide-react';
import { useProductSizes, type ProductSize, type SizeFormData } from '@/hooks/useProductSizes';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from '@/components/ui/responsive-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SizeCategoriesManager } from './SizeCategoriesManager';
import { useSizeCategories } from '@/hooks/useSizeCategories';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useStoreSizes, type StoreSize } from '@/hooks/useStoreSizes';
interface ProductSizesManagerProps {
  productId: string;
  storeId: string;
  hideDeleteButton?: boolean;
}
interface SortableSizeItemProps {
  size: ProductSize;
  onEdit: (size: ProductSize) => void;
  onDelete: (id: string) => void;
  onToggleAvailability: (args: {
    id: string;
    is_available: boolean;
  }) => void;
  hideDeleteButton?: boolean;
}
function SortableSizeItem({
  size,
  onEdit,
  onDelete,
  onToggleAvailability,
  hideDeleteButton
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
  return <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-card border rounded-lg hover:border-primary/50 transition-colors ${!size.is_available ? 'opacity-60 bg-muted/30' : ''}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing flex-shrink-0">
        <GripVertical className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-sm font-semibold truncate">{size.name}</h4>
          <Badge variant={size.is_available ? "default" : "destructive"} className={size.is_available ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}>
            {size.is_available ? "Ativo" : "Inativo"}
          </Badge>
          {size.allow_quantity && (
            <Badge variant="outline" className="text-xs">
              Quantidade
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          + R$ {size.price.toFixed(2)}
        </p>
        {size.description && <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{size.description}</p>}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onToggleAvailability({
            id: size.id,
            is_available: !size.is_available
          })}
          className="h-8 w-8 sm:h-10 sm:w-10"
        >
          {size.is_available ? (
            <PowerOff className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
          ) : (
            <Power className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onEdit(size)} className="h-8 w-8 sm:h-10 sm:w-10">
          <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        {!hideDeleteButton && (
          <Button variant="ghost" size="icon" onClick={() => onDelete(size.id)} className="h-8 w-8 sm:h-10 sm:w-10">
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        )}
      </div>
    </div>;
}
export function ProductSizesManager({
  productId,
  storeId,
  hideDeleteButton
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
  const { categories, addCategory } = useSizeCategories(storeId);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [importFromProductOpen, setImportFromProductOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isStoreSizesOpen, setIsStoreSizesOpen] = useState(false);
  const [storeSizesSearch, setStoreSizesSearch] = useState('');
  const [isEditCategoriesOpen, setIsEditCategoriesOpen] = useState(false);
  const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({
    name: '',
    is_exclusive: false,
    min_items: 1,
    max_items: null as number | null
  });
  
  const { sizes: storeSizes, isLoading: isLoadingStoreSizes } = useStoreSizes(storeId);
  const [formData, setFormData] = useState<SizeFormData>({
    name: '',
    price: 0,
    description: '',
    is_available: true,
    category_id: null,
    allow_quantity: false
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
  const handleNewAddon = () => {
    setEditingSize(null);
    setFormData({
      name: '',
      price: 0,
      description: '',
      is_available: true,
      category_id: null,
      allow_quantity: false
    });
    setIsDialogOpen(true);
  };

  const handleOpenDialog = (size?: ProductSize) => {
    if (size) {
      setEditingSize(size);
      setFormData({
        name: size.name,
        price: size.price,
        description: size.description || '',
        is_available: size.is_available,
        category_id: size.category_id,
        allow_quantity: size.allow_quantity
      });
    } else {
      setEditingSize(null);
      setFormData({
        name: '',
        price: 0,
        description: '',
        is_available: true,
        category_id: null,
        allow_quantity: false
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
        .from('product_sizes')
        .select('*')
        .eq('product_id', selectedProductId);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        for (const size of data) {
          await createSize({
            product_id: productId,
            name: size.name,
            price: size.price,
            description: size.description,
            is_available: size.is_available,
            category_id: size.category_id,
            allow_quantity: size.allow_quantity,
          });
        }
        
        toast({
          title: 'Variações importadas!',
          description: `${data.length} variação(ões) foram importadas com sucesso.`,
        });
      } else {
        toast({
          title: 'Nenhuma variação encontrada',
          description: 'O produto selecionado não possui variações cadastradas.',
          variant: 'destructive',
        });
      }
      
      setImportFromProductOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao importar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!productSearchTerm.trim()) return products;
    
    const term = productSearchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.description && p.description.toLowerCase().includes(term))
    );
  }, [products, productSearchTerm]);

  const filteredStoreSizes = useMemo(() => {
    if (!storeSizes) return [];
    if (!storeSizesSearch.trim()) return storeSizes;
    
    const term = storeSizesSearch.toLowerCase();
    return storeSizes.filter(s => 
      s.name.toLowerCase().includes(term) || 
      (s.description && s.description.toLowerCase().includes(term))
    );
  }, [storeSizes, storeSizesSearch]);

  const groupedStoreSizes = useMemo(() => {
    const grouped: Record<string, StoreSize[]> = {
      uncategorized: filteredStoreSizes.filter(s => !s.category_id)
    };

    categories.forEach(cat => {
      const categorySizes = filteredStoreSizes.filter(s => s.category_id === cat.id);
      if (categorySizes.length > 0) {
        grouped[cat.id] = categorySizes;
      }
    });

    return grouped;
  }, [filteredStoreSizes, categories]);

  const handleCopyStoreSize = async (storeSize: StoreSize) => {
    const existingSize = sizes?.find(
      s => s.name === storeSize.name && s.category_id === storeSize.category_id
    );

    if (existingSize) {
      toggleSizeAvailability({
        id: existingSize.id,
        is_available: !existingSize.is_available
      });
    } else {
      createSize({
        product_id: productId,
        name: storeSize.name,
        price: storeSize.price,
        description: storeSize.description,
        is_available: true,
        category_id: storeSize.category_id,
        allow_quantity: storeSize.allow_quantity || false
      });
    }
  };

  const handleAddAllStoreSizes = () => {
    filteredStoreSizes.forEach(storeSize => {
      const existingSize = sizes?.find(
        s => s.name === storeSize.name && s.category_id === storeSize.category_id
      );
      
      if (!existingSize) {
        createSize({
          product_id: productId,
          name: storeSize.name,
          price: storeSize.price,
          description: storeSize.description,
          is_available: true,
          category_id: storeSize.category_id,
          allow_quantity: storeSize.allow_quantity || false
        });
      }
    });
  };

  const handleCreateCategory = async () => {
    if (!newCategoryForm.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da categoria é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      const newCategory = await addCategory({
        name: newCategoryForm.name.trim(),
        is_exclusive: newCategoryForm.is_exclusive,
        min_items: newCategoryForm.min_items,
        max_items: newCategoryForm.max_items
      });
      
      if (newCategory) {
        // Usa forma funcional para garantir o estado mais recente
        setFormData(prev => ({
          ...prev,
          category_id: newCategory.id
        }));
      }
      
      setIsNewCategoryDialogOpen(false);
      setNewCategoryForm({
        name: '',
        is_exclusive: false,
        min_items: 1,
        max_items: null
      });
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
    }
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
      <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex-1">
                  <CardTitle>Variações</CardTitle>
                  <CardDescription className="mt-1">
                    Gerencie os tamanhos disponíveis para este produto
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full">
                  <Button 
                    size="sm" 
                    onClick={handleNewAddon}
                    className="w-full sm:w-auto shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Variação
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setIsStoreSizesOpen(true)}
                    className="w-full sm:w-auto shrink-0 justify-start sm:justify-center"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Buscar variações</span>
                    <span className="sm:hidden">Buscar</span>
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
                    onClick={() => setShowCategoryManager(true)}
                    className="w-full sm:w-auto shrink-0 justify-start sm:justify-center"
                  >
                    <FolderPlus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Gerenciar Categorias</span>
                    <span className="sm:hidden">Categorias</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filters */}
        {sizes && sizes.length > 0 && (
          <div className="space-y-3">
            {/* Search and Availability filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar variações..."
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
          </div>
        )}

        {!filteredSizes || filteredSizes.length === 0 ? <div className="text-center py-12 text-muted-foreground flex items-center justify-center">
            {searchTerm || availabilityFilter !== 'all' ? 'Nenhum tamanho encontrado com os filtros aplicados.' : 'Nenhum tamanho cadastrado. Clique em "Novo Tamanho" para adicionar.'}
          </div> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredSizes.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-6">
                {/* Variações com categorias */}
                {categories && categories.length > 0 && categories
                  .filter(cat => cat.is_active && filteredSizes.some(size => size.category_id === cat.id))
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((category) => {
                    const categorySizes = filteredSizes.filter(size => size.category_id === category.id);
                    if (categorySizes.length === 0) return null;

                    return (
                      <div key={category.id} className="space-y-2">
                        <div className="flex items-center justify-between px-2 py-2 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              {category.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {category.is_exclusive ? 'Exclusivo' : 'Não exclusivo'}
                              {' • '}
                              Mín: {category.min_items}
                              {category.max_items !== null && ` • Máx: ${category.max_items}`}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {categorySizes.length} {categorySizes.length === 1 ? 'variação' : 'variações'}
                          </Badge>
                        </div>
                        <div className="space-y-2 pl-4 border-l-2 border-muted">
                          {categorySizes.map(size => (
                            <SortableSizeItem 
                              key={size.id} 
                              size={size} 
                              onEdit={handleOpenDialog} 
                              onDelete={deleteSize} 
                              onToggleAvailability={toggleSizeAvailability}
                              hideDeleteButton={hideDeleteButton}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                {/* Variações sem categoria */}
                {filteredSizes.filter(size => !size.category_id).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-2 py-2 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          Sem Categoria
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Variações não categorizadas
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {filteredSizes.filter(size => !size.category_id).length} {filteredSizes.filter(size => !size.category_id).length === 1 ? 'variação' : 'variações'}
                      </Badge>
                    </div>
                    <div className="space-y-2 pl-4 border-l-2 border-muted">
                      {filteredSizes.filter(size => !size.category_id).map(size => (
                        <SortableSizeItem 
                          key={size.id} 
                          size={size} 
                          onEdit={handleOpenDialog} 
                          onDelete={deleteSize} 
                          onToggleAvailability={toggleSizeAvailability}
                          hideDeleteButton={hideDeleteButton}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>}
          </CardContent>
          </Card>

      <ResponsiveDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <ResponsiveDialogContent className="w-full max-w-full md:max-w-[80vw] lg:max-w-[50vw] max-h-[90vh] flex flex-col bg-background z-50">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{editingSize ? 'Editar Variação' : 'Nova Variação'}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {editingSize ? 'Edite as informações da variação.' : 'Adicione uma nova variação ao produto.'}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <ScrollArea className="flex-1 px-4 md:px-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Variação *</Label>
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
                <Label htmlFor="category">Categoria *</Label>
                <div className="flex gap-2">
                  <Select value={formData.category_id || ''} onValueChange={(value) => setFormData({
                    ...formData,
                    category_id: value
                  })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      setNewCategoryForm({
                        name: '',
                        is_exclusive: false,
                        min_items: 1,
                        max_items: null
                      });
                      setIsNewCategoryDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea id="description" placeholder="Descrição da variação..." value={formData.description} onChange={e => setFormData({
                ...formData,
                description: e.target.value
              })} />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="allow_quantity" checked={formData.allow_quantity} onCheckedChange={checked => setFormData({
                ...formData,
                allow_quantity: checked
              })} />
                <Label htmlFor="allow_quantity">Permitir seleção de quantidade</Label>
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
            <Button onClick={handleSubmit} disabled={!formData.name || formData.price <= 0 || !formData.category_id} className="w-full sm:w-auto">
              {editingSize ? 'Salvar' : 'Criar'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Store Sizes Dialog */}
      <ResponsiveDialog open={isStoreSizesOpen} onOpenChange={setIsStoreSizesOpen}>
        <ResponsiveDialogContent className="w-full max-w-full md:max-w-[80vw] lg:max-w-[50vw] max-h-[90vh] flex flex-col bg-background z-50">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Variações da Loja
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Adicione variações existentes na loja a este produto
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="px-4 md:px-6 space-y-3 pb-3">
            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar variações..."
                  value={storeSizesSearch}
                  onChange={(e) => setStoreSizesSearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {storeSizesSearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setStoreSizesSearch('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                onClick={handleNewAddon}
                className="shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Variação
              </Button>
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => {
                  setNewCategoryForm({
                    name: '',
                    is_exclusive: false,
                    min_items: 1,
                    max_items: null
                  });
                  setIsNewCategoryDialogOpen(true);
                }}
                className="shrink-0"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Nova Categoria
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setIsEditCategoriesOpen(true);
                  setIsStoreSizesOpen(false);
                  setShowCategoryManager(true);
                }}
                className="shrink-0"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar Categorias
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleAddAllStoreSizes}
                disabled={filteredStoreSizes.length === 0}
                className="shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Todos
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-4 md:px-6 max-h-[600px]">
            {isLoadingStoreSizes ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando variações...
              </div>
            ) : filteredStoreSizes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {storeSizesSearch ? 'Nenhuma variação encontrada' : 'Nenhuma variação disponível na loja'}
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                {/* Variações com categorias */}
                {categories && categories.length > 0 && categories
                  .filter(cat => cat.is_active && groupedStoreSizes[cat.id]?.length > 0)
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((category) => {
                    const categorySizes = groupedStoreSizes[category.id] || [];
                    
                    return (
                      <div key={category.id} className="space-y-2">
                        <div className="flex items-center gap-2 px-2 py-2 bg-muted/50 rounded-lg sticky top-0 z-10">
                          <FolderTree className="w-4 h-4 text-primary" />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-foreground">
                              {category.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {category.is_exclusive ? 'Exclusivo' : 'Não exclusivo'}
                              {' • '}
                              Mín: {category.min_items}
                              {category.max_items !== null && ` • Máx: ${category.max_items}`}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {categorySizes.length}
                          </Badge>
                        </div>
                        <div className="space-y-2 pl-4 border-l-2 border-muted">
                          {categorySizes.map((storeSize) => {
                            const existingSize = sizes?.find(
                              s => s.name === storeSize.name && s.category_id === storeSize.category_id
                            );
                            const isAlreadyAdded = !!existingSize;
                            
                            return (
                              <div 
                                key={storeSize.id} 
                                className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:border-primary/50 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-semibold truncate">{storeSize.name}</h4>
                                    <span className="text-sm font-bold text-primary whitespace-nowrap">
                                      R$ {storeSize.price.toFixed(2)}
                                    </span>
                                    {storeSize.allow_quantity && (
                                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                        Quantidade
                                      </span>
                                    )}
                                    {isAlreadyAdded && (
                                      <Badge variant="secondary" className="text-xs">
                                        {existingSize.is_available ? 'Já adicionado' : 'Indisponível no produto'}
                                      </Badge>
                                    )}
                                  </div>
                                  {storeSize.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {storeSize.description}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant={isAlreadyAdded ? "outline" : "default"}
                                  onClick={() => handleCopyStoreSize(storeSize)}
                                  className="w-full sm:w-auto"
                                >
                                  {!isAlreadyAdded || !existingSize.is_available ? (
                                    <Plus className="w-4 h-4 mr-2" />
                                  ) : null}
                                  {isAlreadyAdded 
                                    ? (existingSize.is_available ? 'Remover do produto' : 'Adicionar novamente')
                                    : 'Adicionar'
                                  }
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                {/* Variações sem categoria */}
                {groupedStoreSizes.uncategorized.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-2 py-2 bg-muted/50 rounded-lg sticky top-0 z-10">
                      <FolderTree className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">
                          Sem Categoria
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Variações não categorizadas
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {groupedStoreSizes.uncategorized.length}
                      </Badge>
                    </div>
                    <div className="space-y-2 pl-4 border-l-2 border-muted">
                      {groupedStoreSizes.uncategorized.map((storeSize) => {
                        const existingSize = sizes?.find(
                          s => s.name === storeSize.name && s.category_id === storeSize.category_id
                        );
                        const isAlreadyAdded = !!existingSize;
                        
                        return (
                          <div 
                            key={storeSize.id} 
                            className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:border-primary/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-semibold truncate">{storeSize.name}</h4>
                                <span className="text-sm font-bold text-primary whitespace-nowrap">
                                  R$ {storeSize.price.toFixed(2)}
                                </span>
                                {storeSize.allow_quantity && (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    Quantidade
                                  </span>
                                )}
                                {isAlreadyAdded && (
                                  <Badge variant="secondary" className="text-xs">
                                    {existingSize.is_available ? 'Já adicionado' : 'Indisponível no produto'}
                                  </Badge>
                                )}
                              </div>
                              {storeSize.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {storeSize.description}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={isAlreadyAdded ? "outline" : "default"}
                              onClick={() => handleCopyStoreSize(storeSize)}
                              className="w-full sm:w-auto"
                            >
                              {!isAlreadyAdded || !existingSize.is_available ? (
                                <Plus className="w-4 h-4 mr-2" />
                              ) : null}
                              {isAlreadyAdded 
                                ? (existingSize.is_available ? 'Remover do produto' : 'Adicionar novamente')
                                : 'Adicionar'
                              }
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Import from Product Dialog */}
      <ResponsiveDialog open={importFromProductOpen} onOpenChange={setImportFromProductOpen}>
        <ResponsiveDialogContent className="w-full max-w-full md:max-w-[80vw] lg:max-w-[50vw] max-h-[90vh] flex flex-col bg-background z-50">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Importar Variações de Outro Produto</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Selecione um produto para importar suas variações
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <ScrollArea className="flex-1 px-4 md:px-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {loadingProducts ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando produtos...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleImportFromProduct(product.id)}
                    >
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {product.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">
                        R$ {product.price.toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Editar Categorias Modal */}
      <ResponsiveDialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <ResponsiveDialogContent className="w-full max-w-full md:max-w-[80vw] lg:max-w-[50vw] max-h-[90vh] flex flex-col bg-background z-50">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <FolderTree className="w-5 h-5" />
              Gerenciar Categorias de Variações
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Organize suas variações em categorias para facilitar a seleção
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <ScrollArea className="flex-1 px-4 md:px-6">
            <SizeCategoriesManager storeId={storeId} />
          </ScrollArea>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Dialog Nova Categoria */}
      <ResponsiveDialog open={isNewCategoryDialogOpen} onOpenChange={setIsNewCategoryDialogOpen}>
        <ResponsiveDialogContent className="max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Nova Categoria de Variação</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Crie uma nova categoria para organizar suas variações
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <ScrollArea className="max-h-[90vh]">
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Nome da Categoria *</Label>
                <Input
                  id="category-name"
                  placeholder="Ex: Tamanhos, Sabores..."
                  value={newCategoryForm.name}
                  onChange={(e) => setNewCategoryForm({ ...newCategoryForm, name: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is-exclusive"
                  checked={newCategoryForm.is_exclusive}
                  onCheckedChange={(checked) => setNewCategoryForm({ ...newCategoryForm, is_exclusive: checked })}
                />
                <Label htmlFor="is-exclusive">Categoria exclusiva (apenas uma variação pode ser selecionada)</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-items">Mínimo de itens</Label>
                <Input
                  id="min-items"
                  type="number"
                  min="0"
                  value={newCategoryForm.min_items}
                  onChange={(e) => setNewCategoryForm({ ...newCategoryForm, min_items: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-items">Máximo de itens (opcional)</Label>
                <Input
                  id="max-items"
                  type="number"
                  min="0"
                  placeholder="Deixe vazio para ilimitado"
                  value={newCategoryForm.max_items || ''}
                  onChange={(e) => setNewCategoryForm({ 
                    ...newCategoryForm, 
                    max_items: e.target.value ? parseInt(e.target.value) : null 
                  })}
                />
              </div>
            </div>
          </ScrollArea>

          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setIsNewCategoryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCategory}>
              Criar Categoria
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>;
}