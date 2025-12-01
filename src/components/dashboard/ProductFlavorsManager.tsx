import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, DollarSign, Package, Search, GripVertical, X, Filter, Power, PowerOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProductFlavors } from "@/hooks/useProductFlavors";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription } from "@/components/ui/responsive-dialog";
import { useStoreAddonsAndFlavors } from "@/hooks/useStoreAddonsAndFlavors";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
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

interface ProductFlavorsManagerProps {
  productId: string;
  storeId?: string;
  hideDeleteButton?: boolean;
}

interface SortableFlavorItemProps {
  flavor: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAvailability: () => void;
  isDeleting: boolean;
  hideDeleteButton?: boolean;
}

const SortableFlavorItem = ({ flavor, onEdit, onDelete, onToggleAvailability, isDeleting, hideDeleteButton }: SortableFlavorItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: flavor.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 sm:gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-background"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing flex-shrink-0">
        <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="font-medium text-sm sm:text-base truncate">{flavor.name}</p>
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            R$ {flavor.price.toFixed(2)}
          </span>
        </div>
        {flavor.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{flavor.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleAvailability}
          title={flavor.is_available ? 'Inativar' : 'Ativar'}
          className="h-8 w-8 sm:h-10 sm:w-10"
        >
          {flavor.is_available ? (
            <PowerOff className="w-3 h-3 sm:w-4 sm:h-4" />
          ) : (
            <Power className="w-3 h-3 sm:w-4 sm:h-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-8 w-8 sm:h-10 sm:w-10"
        >
          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
        {!hideDeleteButton && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10"
                disabled={isDeleting}
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir sabor</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este sabor? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};

export const ProductFlavorsManager = ({ productId, storeId, hideDeleteButton }: ProductFlavorsManagerProps) => {
  const { flavors, createFlavor, updateFlavor, deleteFlavor, isCreating, isDeleting } = useProductFlavors(productId);
  const { flavors: storeFlavors } = useStoreAddonsAndFlavors(storeId);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    is_available: true,
  });
  const [importFromProductOpen, setImportFromProductOpen] = useState(false);
  const [searchFlavorsOpen, setSearchFlavorsOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showFlavorFormInModal, setShowFlavorFormInModal] = useState(false);
  const [flavorFormData, setFlavorFormData] = useState({
    name: '',
    description: '',
    price: 0,
    is_available: true,
  });
  const [storeFlavorSearch, setStoreFlavorSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [flavorSearchTerm, setFlavorSearchTerm] = useState('');
  const [newFlavorModalOpen, setNewFlavorModalOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filtered store flavors for the dialog
  const filteredStoreFlavors = useMemo(() => {
    if (!storeFlavors) return [];
    if (!storeFlavorSearch.trim()) return storeFlavors;
    
    const term = storeFlavorSearch.toLowerCase();
    return storeFlavors.filter(f => 
      f.name.toLowerCase().includes(term) || 
      (f.description && f.description.toLowerCase().includes(term))
    );
  }, [storeFlavors, storeFlavorSearch]);

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

  // Filtered flavors for the main list (availability + search)
  const filteredFlavors = useMemo(() => {
    if (!flavors) return [];
    
    let result = [...flavors];
    
    // Apply availability filter
    if (availabilityFilter === 'available') {
      result = result.filter(f => f.is_available);
    } else if (availabilityFilter === 'unavailable') {
      result = result.filter(f => !f.is_available);
    }
    
    // Apply search filter
    if (flavorSearchTerm.trim()) {
      const term = flavorSearchTerm.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(term) || 
        (f.description && f.description.toLowerCase().includes(term))
      );
    }
    
    return result;
  }, [flavors, availabilityFilter, flavorSearchTerm]);

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingId) {
      updateFlavor({ id: editingId, ...formData });
      setEditingId(null);
    } else {
      createFlavor({ ...formData, product_id: productId });
    }
    
    setFormData({ name: '', description: '', price: 0, is_available: true });
    setIsAdding(false);
  };

  const handleEdit = (flavor: any) => {
    setEditingId(flavor.id);
    setFormData({
      name: flavor.name,
      description: flavor.description || '',
      price: flavor.price,
      is_available: flavor.is_available,
    });
    setNewFlavorModalOpen(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', description: '', price: 0, is_available: true });
  };

  const handleCreateFlavorInModal = async () => {
    if (!flavorFormData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para o sabor.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createFlavor({ ...flavorFormData, product_id: productId });
      
      setShowFlavorFormInModal(false);
      setFlavorFormData({
        name: '',
        description: '',
        price: 0,
        is_available: true,
      });
      
      toast({
        title: "Sabor cadastrado!",
        description: "O sabor foi adicionado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao cadastrar sabor',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadProducts = async () => {
    if (!storeId) return;
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
        .from('product_flavors')
        .select('*')
        .eq('product_id', selectedProductId);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        for (const flavor of data) {
          await createFlavor({
            product_id: productId,
            name: flavor.name,
            description: flavor.description || '',
            price: flavor.price,
            is_available: flavor.is_available,
          });
        }
        
        toast({
          title: 'Sabores importados!',
          description: `${data.length} sabor(es) foram importados com sucesso.`,
        });
      } else {
        toast({
          title: 'Nenhum sabor encontrado',
          description: 'O produto selecionado não possui sabores cadastrados.',
          variant: 'destructive',
        });
      }
      
      setImportFromProductOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao importar sabores',
        description: error.message,
        variant: 'destructive',
      });
    }
  };


  const handleAddStoreFlavor = async (flavor: any) => {
    // Verificar se já existe um sabor com o mesmo nome neste produto
    const existingFlavor = flavors?.find(f => f.name === flavor.name);

    if (existingFlavor) {
      // Se já existe, alternar disponibilidade (ativo <-> inativo)
      updateFlavor({
        id: existingFlavor.id,
        name: existingFlavor.name,
        description: existingFlavor.description,
        price: flavor.price,
        is_available: !existingFlavor.is_available,
        product_id: productId,
      });
    } else {
      // Se não existe, criar novo já disponível
      try {
        await createFlavor({
          product_id: productId,
          name: flavor.name,
          description: flavor.description || '',
          price: flavor.price,
          is_available: true,
        });
        
        toast({
          title: 'Sabor adicionado!',
          description: `${flavor.name} foi adicionado ao produto.`,
        });
      } catch (error: any) {
        toast({
          title: 'Erro ao adicionar sabor',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && flavors) {
      const oldIndex = flavors.findIndex((f) => f.id === active.id);
      const newIndex = flavors.findIndex((f) => f.id === over.id);

      const reorderedFlavors = arrayMove(flavors, oldIndex, newIndex);

      // Update display_order for each flavor
      try {
        for (let i = 0; i < reorderedFlavors.length; i++) {
          const { error } = await supabase
            .from('product_flavors')
            .update({ display_order: i } as any)
            .eq('id', reorderedFlavors[i].id);

          if (error) throw error;
        }

        toast({
          title: 'Ordem atualizada!',
          description: 'A ordem dos sabores foi atualizada com sucesso.',
        });
      } catch (error: any) {
        toast({
          title: 'Erro ao reordenar',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleToggleAvailability = (flavor: any) => {
    updateFlavor({
      id: flavor.id,
      name: flavor.name,
      description: flavor.description,
      price: flavor.price,
      is_available: !flavor.is_available,
      product_id: productId,
    });
  };

  return (
    <>
      <Card>
       <CardHeader>
         <div className="flex items-center justify-between">
           <div>
             <CardTitle>Sabores</CardTitle>
             <CardDescription>Gerencie os sabores disponíveis para este produto</CardDescription>
           </div>
           {!isAdding && (
             <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
               <Button 
                 size="sm" 
                 variant="default"
                 onClick={() => setNewFlavorModalOpen(true)}
                 className="w-full sm:w-auto"
               >
                 <Plus className="w-4 h-4 sm:mr-2" />
                 <span className="hidden sm:inline">Novo Sabor</span>
                 <span className="sm:hidden">Novo</span>
               </Button>
               <Button 
                 size="sm" 
                 variant="outline"
                 onClick={() => {
                   loadProducts();
                   setImportFromProductOpen(true);
                 }}
                 className="w-full sm:w-auto"
               >
                 <Package className="w-4 h-4 sm:mr-2" />
                 <span className="hidden sm:inline">Importar de Produto</span>
                 <span className="sm:hidden">Produto</span>
               </Button>
               <Button 
                 size="sm" 
                 variant="outline"
                 onClick={() => setSearchFlavorsOpen(true)}
                 className="w-full sm:w-auto"
               >
                 <Search className="w-4 h-4 sm:mr-2" />
                 <span className="hidden sm:inline">Buscar Sabores</span>
                 <span className="sm:hidden">Buscar</span>
               </Button>
             </div>
           )}
         </div>
       </CardHeader>
       <CardContent className="space-y-4">
         {isAdding && (
           <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
             <div className="space-y-2">
               <Label>Nome do Sabor</Label>
               <Input
                 placeholder="Ex: Calabresa, Mussarela..."
                 value={formData.name}
                 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
               />
             </div>
             
             <div className="space-y-2">
               <Label>Descrição (Opcional)</Label>
               <Textarea
                 placeholder="Descreva os ingredientes do sabor..."
                 value={formData.description}
                 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                 rows={2}
               />
             </div>

             <div className="space-y-2">
               <Label>Preço do Sabor</Label>
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
               <p className="text-xs text-muted-foreground">
                 Quando o cliente escolher múltiplos sabores, o preço final será a média dos sabores selecionados
               </p>
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
               <Button variant="outline" onClick={handleCancel}>
                 Cancelar
               </Button>
             </div>
           </div>
         )}

         {/* Filters */}
         {flavors && flavors.length > 0 && (
           <div className="space-y-3">
             <div className="flex flex-col sm:flex-row gap-2">
               <div className="flex-1">
                 <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                   <Input
                     placeholder="Buscar sabores..."
                     value={flavorSearchTerm}
                     onChange={(e) => setFlavorSearchTerm(e.target.value)}
                     className="pl-9"
                   />
                 </div>
               </div>
               <Select value={availabilityFilter} onValueChange={(value: any) => setAvailabilityFilter(value)}>
                 <SelectTrigger className="w-full sm:w-[180px]">
                   <Filter className="w-4 h-4 mr-2" />
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Todos</SelectItem>
                   <SelectItem value="available">Disponíveis</SelectItem>
                   <SelectItem value="unavailable">Indisponíveis</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </div>
         )}

         <div className="space-y-2">
           {filteredFlavors && filteredFlavors.length > 0 ? (
             <DndContext
               sensors={sensors}
               collisionDetection={closestCenter}
               onDragEnd={handleDragEnd}
             >
               <SortableContext
                 items={filteredFlavors.map(f => f.id)}
                 strategy={verticalListSortingStrategy}
               >
                  {filteredFlavors.map((flavor) => (
                    <SortableFlavorItem
                      key={flavor.id}
                      flavor={flavor}
                      onEdit={() => handleEdit(flavor)}
                      onDelete={() => deleteFlavor(flavor.id)}
                      onToggleAvailability={() => handleToggleAvailability(flavor)}
                      isDeleting={isDeleting}
                      hideDeleteButton={hideDeleteButton}
                    />
                  ))}
               </SortableContext>
             </DndContext>
           ) : flavors && flavors.length > 0 ? (
             <div className="flex items-center justify-center">
               <p className="text-sm text-muted-foreground text-center py-4">
                 Nenhum sabor encontrado com os filtros aplicados
               </p>
             </div>
           ) : (
             <div className="flex items-center justify-center">
               <p className="text-sm text-muted-foreground text-center py-4">
                 Nenhum sabor cadastrado
               </p>
             </div>
           )}
         </div>

         {/* Dialog: Importar de Produto */}
         <ResponsiveDialog open={importFromProductOpen} onOpenChange={setImportFromProductOpen}>
           <ResponsiveDialogContent className="w-full max-w-full md:max-w-[80vw] lg:max-w-[50vw] max-h-[90vh] flex flex-col bg-background z-50">
             <ResponsiveDialogHeader>
               <ResponsiveDialogTitle>Importar Sabores de Produto</ResponsiveDialogTitle>
               <ResponsiveDialogDescription>
                 Selecione um produto para importar seus sabores
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
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
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
              </ScrollArea>
           </ResponsiveDialogContent>
         </ResponsiveDialog>

        {/* Dialog: Novo Sabor */}
        <ResponsiveDialog open={newFlavorModalOpen} onOpenChange={setNewFlavorModalOpen}>
          <ResponsiveDialogContent className="w-full max-w-full md:max-w-[80vw] lg:max-w-[50vw] max-h-[90vh] flex flex-col bg-background z-50">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Novo Sabor</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Adicione um novo sabor para este produto
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Sabor</Label>
                <Input
                  placeholder="Ex: Calabresa, Mussarela..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Descrição (Opcional)</Label>
                <Textarea
                  placeholder="Descreva os ingredientes do sabor..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Preço do Sabor</Label>
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
                <p className="text-xs text-muted-foreground">
                  Quando o cliente escolher múltiplos sabores, o preço final será a média dos sabores selecionados
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                />
                <Label>Disponível</Label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={() => {
                    if (!formData.name.trim()) {
                      toast({
                        title: "Nome obrigatório",
                        description: "Por favor, insira um nome para o sabor.",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (editingId) {
                      updateFlavor({ id: editingId, ...formData });
                      setEditingId(null);
                    } else {
                      createFlavor({ ...formData, product_id: productId });
                    }
                    
                    setFormData({ name: '', description: '', price: 0, is_available: true });
                    setNewFlavorModalOpen(false);
                  }}
                  disabled={isCreating} 
                  className="flex-1"
                >
                  {editingId ? 'Atualizar' : 'Adicionar'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setNewFlavorModalOpen(false);
                    setEditingId(null);
                    setFormData({ name: '', description: '', price: 0, is_available: true });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </ResponsiveDialogContent>
        </ResponsiveDialog>

        {/* Dialog: Buscar Sabores da Loja */}
        <ResponsiveDialog open={searchFlavorsOpen} onOpenChange={setSearchFlavorsOpen}>
          <ResponsiveDialogContent className="w-full max-w-full md:max-w-[80vw] lg:max-w-[50vw] max-h-[90vh] flex flex-col bg-background z-50">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Buscar Sabores da Loja</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Todos os sabores únicos cadastrados em sua loja
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            {/* Form to Create New Flavor */}
            {showFlavorFormInModal && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30 mb-4">
                <div className="space-y-2">
                  <Label>Nome do Sabor</Label>
                  <Input
                    placeholder="Ex: Calabresa, Margherita..."
                    value={flavorFormData.name}
                    onChange={(e) => setFlavorFormData({ ...flavorFormData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea
                    placeholder="Ex: Molho, queijo, calabresa..."
                    value={flavorFormData.description}
                    onChange={(e) => setFlavorFormData({ ...flavorFormData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                
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
                      value={flavorFormData.price}
                      onChange={(e) => setFlavorFormData({ ...flavorFormData, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={flavorFormData.is_available}
                    onCheckedChange={(checked) => setFlavorFormData({ ...flavorFormData, is_available: checked })}
                  />
                  <Label>Disponível</Label>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleCreateFlavorInModal}
                    disabled={isCreating} 
                    className="flex-1"
                  >
                    Cadastrar
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowFlavorFormInModal(false);
                      setFlavorFormData({
                        name: '',
                        description: '',
                        price: 0,
                        is_available: true,
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
                  placeholder="Buscar sabor..."
                  value={storeFlavorSearch}
                  onChange={(e) => setStoreFlavorSearch(e.target.value)}
                  className="pl-9"
                />
                {storeFlavorSearch && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                    onClick={() => setStoreFlavorSearch('')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowFlavorFormInModal(!showFlavorFormInModal)}
                className="shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Sabor
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!filteredStoreFlavors || filteredStoreFlavors.length === 0) return;
                  
                  try {
                    for (const flavor of filteredStoreFlavors) {
                      const isInProduct = flavors?.some(f => f.name === flavor.name && f.is_available);
                      if (!isInProduct) {
                        await handleAddStoreFlavor(flavor);
                      }
                    }
                    
                    toast({
                      title: "Sabores adicionados",
                      description: "Todos os sabores disponíveis foram adicionados ao produto com sucesso.",
                    });
                  } catch (error) {
                    toast({
                      title: "Erro ao adicionar sabores",
                      description: "Ocorreu um erro ao adicionar os sabores. Tente novamente.",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={!filteredStoreFlavors || filteredStoreFlavors.length === 0}
                className="shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Todos
              </Button>
            </div>

            {/* Store Flavors List */}
            <ScrollArea className="h-[500px]">
              <div className="space-y-2 pr-4">
              {filteredStoreFlavors && filteredStoreFlavors.length > 0 ? (
                filteredStoreFlavors.map((flavor) => {
                  const isInProduct = flavors?.some(f => f.name === flavor.name && f.is_available);
                  
                  return (
                    <div
                      key={flavor.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{flavor.name}</span>
                          {isInProduct && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              Já adicionado
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          R$ {flavor.price.toFixed(2)}
                          {flavor.description && ` • ${flavor.description}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddStoreFlavor(flavor)}
                        className="w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {isInProduct ? 'Remover do produto' : 'Adicionar'}
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {storeFlavorSearch.trim() ? (
                    <>
                      <p>Nenhum sabor encontrado para "{storeFlavorSearch}"</p>
                      <p className="text-sm mt-1">Tente buscar com outros termos</p>
                    </>
                  ) : (
                    <>
                      <p>Nenhum sabor encontrado na loja</p>
                      <p className="text-sm mt-1">Adicione sabores em outros produtos para reutilizá-los aqui</p>
                    </>
                  )}
                </div>
              )}
              </div>
            </ScrollArea>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </CardContent>
    </Card>
    </>
  );
};
