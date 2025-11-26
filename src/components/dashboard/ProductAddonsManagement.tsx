import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddonCategories } from "@/hooks/useAddonCategories";
import { useStoreAddons } from "@/hooks/useStoreAddons";
import { useStoreAddonsAndFlavors } from "@/hooks/useStoreAddonsAndFlavors";
import { Plus, Pencil, Trash2, Check, X, Sparkles, Package, Copy, ChevronDown, Power, EyeOff, Link } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { addonTemplates, BusinessTemplate } from "@/lib/addonTemplates";
import { supabase } from "@/integrations/supabase/client";
import { NewAddonDialog } from "./NewAddonDialog";
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ProductAddonsManagementProps {
  storeId: string;
}

// Componente para mostrar produtos vinculados
const LinkedProducts = ({ addonName, categoryId, storeId }: { addonName: string; categoryId: string | null; storeId: string }) => {
  const { data: linkedProducts, isLoading } = useQuery({
    queryKey: ['linked-products', storeId, addonName, categoryId],
    queryFn: async () => {
      // Buscar produtos que têm este adicional
      const { data: addons, error } = await supabase
        .from('product_addons')
        .select(`
          product_id,
          category_id,
          products!inner(
            id,
            name,
            store_id
          )
        `)
        .eq('name', addonName)
        .eq('products.store_id', storeId);

      if (error) throw error;

      // Filtrar por categoria se houver
      const filtered = categoryId 
        ? addons?.filter(a => a.category_id === categoryId)
        : addons;

      // Remover duplicatas e extrair nomes dos produtos
      const uniqueProducts = new Map();
      filtered?.forEach(addon => {
        const product = addon.products;
        if (product && !uniqueProducts.has(product.id)) {
          uniqueProducts.set(product.id, product.name);
        }
      });

      return Array.from(uniqueProducts.values());
    },
    enabled: !!storeId && !!addonName,
  });

  if (isLoading) {
    return <div className="text-xs text-muted-foreground mt-1">Carregando produtos...</div>;
  }

  if (!linkedProducts || linkedProducts.length === 0) {
    return (
      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        <Link className="w-3 h-3" />
        Nenhum produto vinculado
      </div>
    );
  }

  return (
    <div className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
      <Link className="w-3 h-3 mt-0.5 flex-shrink-0" />
      <span>
        Usado em: {linkedProducts.join(', ')}
      </span>
    </div>
  );
};

export const ProductAddonsManagement = ({ storeId }: ProductAddonsManagementProps) => {
  const [activeTab, setActiveTab] = useState("categories");
  const [addonTabKey, setAddonTabKey] = useState(0);

  // Detectar quando a aba addons é aberta e forçar remontagem completa
  useEffect(() => {
    if (activeTab === 'addons') {
      console.log('[ProductAddonsManagement] Aba addons aberta - forçando remontagem completa');
      setAddonTabKey(prev => prev + 1);
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="addons">Adicionais Globais</TabsTrigger>
          <TabsTrigger value="library">Biblioteca</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <CategoriesTab storeId={storeId} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <TemplatesTab storeId={storeId} />
        </TabsContent>

        <TabsContent value="addons" className="space-y-4">
          <AddonsTab key={`addons-tab-${addonTabKey}`} storeId={storeId} />
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <LibraryTab storeId={storeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Aba de Categorias
export const CategoriesTab = ({ storeId }: { storeId: string }) => {
  const { categories, loading, addCategory, updateCategory, toggleCategoryStatus, deleteCategory } = useAddonCategories(storeId);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", min_items: 0, max_items: null as number | null, is_exclusive: false });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome da categoria.",
        variant: "destructive",
      });
      return;
    }

    // Validação de limites
    if (formData.min_items < 0) {
      toast({
        title: "Valor inválido",
        description: "O mínimo de itens não pode ser negativo.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.is_exclusive && formData.max_items !== null && formData.max_items < formData.min_items) {
      toast({
        title: "Valor inválido",
        description: "O máximo de itens deve ser maior ou igual ao mínimo.",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      await updateCategory(editingId, { 
        name: formData.name,
        min_items: formData.min_items,
        max_items: formData.is_exclusive ? 1 : formData.max_items,
        is_exclusive: formData.is_exclusive,
      });
    } else {
      await addCategory(formData.name, formData.min_items, formData.max_items, formData.is_exclusive);
    }

    setFormData({ name: "", min_items: 0, max_items: null, is_exclusive: false });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (category: any) => {
    setEditingId(category.id);
    setFormData({ 
      name: category.name,
      min_items: category.min_items ?? 0,
      max_items: category.max_items,
      is_exclusive: category.is_exclusive ?? false,
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: "", min_items: 0, max_items: null, is_exclusive: false });
  };

  const handleDeleteClick = (categoryId: string) => {
    setCategoryToDelete(categoryId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (categoryToDelete) {
      await deleteCategory(categoryToDelete);
      setCategoryToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando categorias...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorias de Adicionais</CardTitle>
        <CardDescription>
          Organize seus adicionais em categorias para facilitar a gestão
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAdding && (
          <div className="flex justify-end">
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          </div>
        )}

        {isAdding && (
          <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nome da Categoria</Label>
              <Input
                id="category-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Bordas, Tamanhos, Bebidas"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Mínimo de Itens</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0 = opcional"
                  value={formData.min_items}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      min_items: Number.isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Máximo de Itens</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Deixe vazio = ilimitado"
                  value={formData.max_items ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_items: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button onClick={handleCancel} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                <Check className="w-4 h-4 mr-2" />
                {editingId ? "Atualizar" : "Salvar"}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {categories?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma categoria cadastrada
            </div>
          ) : (
            categories?.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{category.name}</span>
                    {category.is_exclusive && (
                      <Badge variant="outline" className="text-xs">
                        Exclusivo
                      </Badge>
                    )}
                    <Badge variant={category.is_active ? "default" : "secondary"}>
                      {category.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {category.is_exclusive ? (
                      "Apenas 1 item pode ser selecionado"
                    ) : (
                      <>
                        {category.min_items > 0 ? `Mín: ${category.min_items}` : "Opcional"}
                        {category.max_items !== null && ` • Máx: ${category.max_items}`}
                        {category.max_items === null && category.min_items === 0 && " • Ilimitado"}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCategoryStatus(category.id, !category.is_active)}
                    title={category.is_active ? 'Inativar' : 'Ativar'}
                  >
                    {category.is_active ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(category)}
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(category.id)}
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

// Aba de Adicionais Globais
export const AddonsTab = ({ storeId }: { storeId: string }) => {
  const queryClient = useQueryClient();
  const { categories } = useAddonCategories(storeId);
  const { addons, isLoading, createAddon, updateAddon, deleteAddon, isCreating, isUpdating } = useStoreAddons(storeId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addonToDelete, setAddonToDelete] = useState<{
    id: string;
    name: string;
    categoryId: string | null;
    linkedProducts: Array<{ id: string; name: string }>;
  } | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [addonToToggle, setAddonToToggle] = useState<{
    id: string;
    name: string;
    categoryId: string | null;
    currentAvailability: boolean;
    linkedProducts: Array<{ id: string; name: string }>;
  } | null>(null);
  const [selectedToggleProductIds, setSelectedToggleProductIds] = useState<Set<string>>(new Set());
  
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  const filteredAddons = addons?.filter(addon => {
    // Filtro de categoria
    let matchesCategory = true;
    if (categoryFilter === "uncategorized") {
      matchesCategory = !addon.category_id;
    } else if (categoryFilter !== "all") {
      matchesCategory = addon.category_id === categoryFilter;
    }
    
    // Filtro de disponibilidade
    let matchesAvailability = true;
    if (availabilityFilter === 'available') {
      matchesAvailability = addon.is_available;
    } else if (availabilityFilter === 'unavailable') {
      matchesAvailability = !addon.is_available;
    }
    
    return matchesCategory && matchesAvailability;
  });

  const addonsByCategory = filteredAddons?.reduce((acc, addon) => {
    const categoryName = addon.category?.name || "Sem categoria";
    if (!acc[categoryName]) acc[categoryName] = [];
    acc[categoryName].push(addon);
    return acc;
  }, {} as Record<string, typeof addons>);

  const handleSubmit = async (data: {
    name: string;
    price: number;
    category_id: string | null;
    is_available: boolean;
    allow_quantity: boolean;
  }) => {
    try {
      if (editingAddon) {
        await updateAddon({
          id: editingAddon.id,
          ...data,
        });
      } else {
        // Para criar adicional global, precisamos de um product_id temporário
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('store_id', storeId)
          .limit(1)
          .single();

        if (!existingProduct) {
          toast({
            title: "Produto necessário",
            description: "Crie ao menos um produto antes de adicionar adicionais globais.",
            variant: "destructive",
          });
          return;
        }

        await createAddon({
          product_id: existingProduct.id,
          ...data,
        });
      }

      setIsDialogOpen(false);
      setEditingAddon(null);
    } catch (error) {
      console.error('Error saving addon:', error);
    }
  };

  const handleEdit = (addon: any) => {
    setEditingAddon(addon);
    setIsDialogOpen(true);
  };

  const handleNewAddon = () => {
    setEditingAddon(null);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (addonId: string, addonName: string, categoryId: string | null) => {
    // Buscar produtos vinculados a este adicional
    try {
      const { data: linkedAddons, error } = await supabase
        .from('product_addons')
        .select(`
          id,
          product_id,
          category_id,
          products!inner(
            id,
            name,
            store_id
          )
        `)
        .eq('name', addonName)
        .eq('products.store_id', storeId);

      if (error) throw error;

      // Filtrar por categoria se houver
      const filtered = categoryId 
        ? linkedAddons?.filter(a => a.category_id === categoryId)
        : linkedAddons;

      // Remover duplicatas e extrair nomes dos produtos
      const uniqueProducts = new Map();
      filtered?.forEach(addon => {
        const product = addon.products;
        if (product && !uniqueProducts.has(product.id)) {
          uniqueProducts.set(product.id, { id: product.id, name: product.name });
        }
      });

      const linkedProducts = Array.from(uniqueProducts.values());

      setAddonToDelete({ 
        id: addonId, 
        name: addonName,
        categoryId,
        linkedProducts 
      });
      
      // Inicializar todos os produtos como selecionados
      setSelectedProductIds(new Set(linkedProducts.map(p => p.id)));
      setDeleteDialogOpen(true);
    } catch (error) {
      console.error('Error fetching linked products:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos vinculados.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!addonToDelete || selectedProductIds.size === 0) {
      toast({
        title: "Nenhum produto selecionado",
        description: "Selecione ao menos um produto para remover o adicional.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Buscar todos os addons vinculados aos produtos selecionados com o mesmo nome e categoria
      const { data: addonsToDelete, error: fetchError } = await supabase
        .from('product_addons')
        .select('id, product_id, category_id')
        .eq('name', addonToDelete.name)
        .in('product_id', Array.from(selectedProductIds));

      if (fetchError) throw fetchError;

      // Filtrar por categoria se houver
      const filteredAddons = addonToDelete.categoryId
        ? addonsToDelete?.filter(a => a.category_id === addonToDelete.categoryId)
        : addonsToDelete;

      if (!filteredAddons || filteredAddons.length === 0) {
        toast({
          title: "Nenhum adicional encontrado",
          description: "Não foram encontrados adicionais para remover.",
          variant: "destructive",
        });
        return;
      }

      // Deletar os adicionais encontrados
      const { error: deleteError } = await supabase
        .from('product_addons')
        .delete()
        .in('id', filteredAddons.map(a => a.id));

      if (deleteError) throw deleteError;

      toast({
        title: "Adicional removido",
        description: `O adicional foi removido de ${selectedProductIds.size} produto(s).`,
      });

      setAddonToDelete(null);
      setSelectedProductIds(new Set());
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting addon:', error);
      toast({
        title: "Erro ao remover adicional",
        description: "Não foi possível remover o adicional dos produtos selecionados.",
        variant: "destructive",
      });
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleAllProducts = () => {
    if (!addonToDelete?.linkedProducts) return;
    
    if (selectedProductIds.size === addonToDelete.linkedProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(addonToDelete.linkedProducts.map(p => p.id)));
    }
  };

  const handleToggleAvailability = async (addon: any) => {
    // Buscar produtos vinculados a este adicional
    try {
      const { data: linkedAddons, error } = await supabase
        .from('product_addons')
        .select(`
          id,
          product_id,
          category_id,
          is_available,
          products!inner(
            id,
            name,
            store_id
          )
        `)
        .eq('name', addon.name)
        .eq('products.store_id', storeId);

      if (error) throw error;

      // Filtrar por categoria se houver
      const filtered = addon.category_id 
        ? linkedAddons?.filter(a => a.category_id === addon.category_id)
        : linkedAddons;

      // Remover duplicatas e extrair nomes dos produtos
      // Também contar quantos estão ativos
      const uniqueProducts = new Map();
      let activeCount = 0;
      let totalCount = 0;
      
      filtered?.forEach(addonItem => {
        const product = addonItem.products;
        if (product && !uniqueProducts.has(product.id)) {
          uniqueProducts.set(product.id, { id: product.id, name: product.name });
          totalCount++;
          if (addonItem.is_available) activeCount++;
        }
      });

      const linkedProducts = Array.from(uniqueProducts.values());
      
      // Determinar o estado atual: se a maioria está ativa, consideramos "ativos"
      // Isso permite mostrar "Desativar" quando a maioria está ativa e vice-versa
      const currentAvailability = activeCount > totalCount / 2;

      setAddonToToggle({ 
        id: addon.id, 
        name: addon.name,
        categoryId: addon.category_id,
        currentAvailability,
        linkedProducts 
      });
      
      // Inicializar todos os produtos como selecionados
      setSelectedToggleProductIds(new Set(linkedProducts.map(p => p.id)));
      setToggleDialogOpen(true);
    } catch (error) {
      console.error('Error fetching linked products:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos vinculados.",
        variant: "destructive",
      });
    }
  };

  const handleToggleConfirm = async () => {
    if (!addonToToggle || selectedToggleProductIds.size === 0) {
      toast({
        title: "Nenhum produto selecionado",
        description: "Selecione ao menos um produto para alterar a disponibilidade.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newAvailability = !addonToToggle.currentAvailability;
      
      // Buscar todos os addons vinculados aos produtos selecionados com o mesmo nome e categoria
      const { data: addonsToUpdate, error: fetchError } = await supabase
        .from('product_addons')
        .select('id, product_id, category_id')
        .eq('name', addonToToggle.name)
        .in('product_id', Array.from(selectedToggleProductIds));

      if (fetchError) throw fetchError;

      // Filtrar por categoria se houver
      const filteredAddons = addonToToggle.categoryId
        ? addonsToUpdate?.filter(a => a.category_id === addonToToggle.categoryId)
        : addonsToUpdate;

      if (!filteredAddons || filteredAddons.length === 0) {
        toast({
          title: "Nenhum adicional encontrado",
          description: "Não foram encontrados adicionais para atualizar.",
          variant: "destructive",
        });
        return;
      }

      // Atualizar os adicionais encontrados
      const { error: updateError } = await supabase
        .from('product_addons')
        .update({ is_available: newAvailability })
        .in('id', filteredAddons.map(a => a.id));

      if (updateError) throw updateError;

      // Invalidate all related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['store-addons', storeId] });
      queryClient.invalidateQueries({ queryKey: ['store-addons-flavors', storeId] });

      toast({
        title: newAvailability ? "Adicional ativado" : "Adicional desativado",
        description: `O adicional foi ${newAvailability ? 'ativado' : 'desativado'} em ${selectedToggleProductIds.size} produto(s).`,
      });

      setAddonToToggle(null);
      setSelectedToggleProductIds(new Set());
      setToggleDialogOpen(false);
    } catch (error) {
      console.error('Error toggling addon availability:', error);
      toast({
        title: "Erro ao alterar disponibilidade",
        description: "Não foi possível alterar a disponibilidade do adicional.",
        variant: "destructive",
      });
    }
  };

  const toggleToggleProductSelection = (productId: string) => {
    setSelectedToggleProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleAllToggleProducts = () => {
    if (!addonToToggle?.linkedProducts) return;
    
    if (selectedToggleProductIds.size === addonToToggle.linkedProducts.length) {
      setSelectedToggleProductIds(new Set());
    } else {
      setSelectedToggleProductIds(new Set(addonToToggle.linkedProducts.map(p => p.id)));
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando adicionais...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adicionais Globais</CardTitle>
        <CardDescription>
          Visualize e gerencie todos os adicionais da sua loja
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={handleNewAddon} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Novo Adicional
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Filtrar por categoria</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="uncategorized">Sem categoria</SelectItem>
                {categories?.filter(c => c.is_active).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Filtrar por status</Label>
            <Select 
              value={availabilityFilter}
              onValueChange={(v: 'all' | 'available' | 'unavailable') => setAvailabilityFilter(v)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="available">Disponíveis</SelectItem>
                <SelectItem value="unavailable">Indisponíveis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          {!addons || addons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum adicional cadastrado</p>
              <p className="text-sm">Adicione produtos com adicionais para começar</p>
            </div>
          ) : filteredAddons && filteredAddons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum adicional encontrado para este filtro
            </div>
          ) : (
            Object.entries(addonsByCategory || {}).map(([categoryName, categoryAddons]) => (
              <div key={categoryName} className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">{categoryName}</h3>
                <div className="space-y-2">
                  {categoryAddons?.map((addon) => (
                    <div
                      key={addon.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{addon.name}</span>
                          <Badge 
                            variant={addon.is_available ? "default" : "secondary"} 
                            className={`text-xs ${addon.is_available ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20'}`}
                          >
                            {addon.is_available ? "Disponível" : "Indisponível"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          R$ {addon.price.toFixed(2)}
                        </div>
                        <LinkedProducts addonName={addon.name} categoryId={addon.category_id} storeId={storeId} />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAvailability(addon)}
                          title={addon.is_available ? "Inativar" : "Ativar"}
                        >
                          {addon.is_available ? (
                            <EyeOff className="w-4 h-4 text-red-600" />
                          ) : (
                            <Power className="w-4 h-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(addon)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(addon.id, addon.name, addon.category_id)}
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover adicional dos produtos</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Selecione de quais produtos deseja remover o adicional <strong>{addonToDelete?.name}</strong>:
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {addonToDelete?.linkedProducts && addonToDelete.linkedProducts.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-1 pb-2 border-b">
                <Checkbox
                  id="select-all"
                  checked={selectedProductIds.size === addonToDelete.linkedProducts.length && addonToDelete.linkedProducts.length > 0}
                  onCheckedChange={toggleAllProducts}
                />
                <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Selecionar todos ({addonToDelete.linkedProducts.length} produtos)
                </Label>
              </div>
              
              <div className="flex-1 overflow-y-auto py-2 space-y-2 max-h-[300px]">
                {addonToDelete.linkedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => toggleProductSelection(product.id)}
                  >
                    <Checkbox
                      id={`product-${product.id}`}
                      checked={selectedProductIds.has(product.id)}
                      onCheckedChange={() => toggleProductSelection(product.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Label 
                      htmlFor={`product-${product.id}`}
                      className="flex-1 font-medium text-sm cursor-pointer"
                    >
                      {product.name}
                    </Label>
                  </div>
                ))}
              </div>
            </>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedProductIds(new Set())}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={selectedProductIds.size === 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Remover de {selectedProductIds.size} produto(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={toggleDialogOpen} onOpenChange={setToggleDialogOpen}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {addonToToggle?.currentAvailability ? 'Desativar' : 'Ativar'} adicional
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Selecione em quais produtos deseja {addonToToggle?.currentAvailability ? 'desativar' : 'ativar'} o adicional <strong>{addonToToggle?.name}</strong>:
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {addonToToggle?.linkedProducts && addonToToggle.linkedProducts.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-1 pb-2 border-b">
                <Checkbox
                  id="select-all-toggle"
                  checked={selectedToggleProductIds.size === addonToToggle.linkedProducts.length && addonToToggle.linkedProducts.length > 0}
                  onCheckedChange={toggleAllToggleProducts}
                />
                <Label htmlFor="select-all-toggle" className="text-sm font-medium cursor-pointer">
                  Selecionar todos ({addonToToggle.linkedProducts.length} produtos)
                </Label>
              </div>
              
              <div className="flex-1 overflow-y-auto py-2 space-y-2 max-h-[300px]">
                {addonToToggle.linkedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => toggleToggleProductSelection(product.id)}
                  >
                    <Checkbox
                      id={`toggle-product-${product.id}`}
                      checked={selectedToggleProductIds.has(product.id)}
                      onCheckedChange={() => toggleToggleProductSelection(product.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Label 
                      htmlFor={`toggle-product-${product.id}`}
                      className="flex-1 font-medium text-sm cursor-pointer"
                    >
                      {product.name}
                    </Label>
                  </div>
                ))}
              </div>
            </>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedToggleProductIds(new Set())}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleConfirm}
              disabled={selectedToggleProductIds.size === 0}
              className="disabled:opacity-50"
            >
              {addonToToggle?.currentAvailability ? 'Desativar' : 'Ativar'} em {selectedToggleProductIds.size} produto(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        isLoading={isCreating || isUpdating}
      />
    </Card>
  );
};

// Nova Aba: Biblioteca de Adicionais e Sabores
export const LibraryTab = ({ storeId }: { storeId: string }) => {
  const { addons, flavors, isLoading, refetch } = useStoreAddonsAndFlavors(storeId);
  const { categories } = useAddonCategories(storeId);
  const [filter, setFilter] = useState<'all' | 'addons' | 'flavors'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: "", price: "0", category_id: "", is_available: true });

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do adicional.",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      toast({
        title: "Preço inválido",
        description: "Por favor, informe um preço válido.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Buscar um produto existente da loja
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', storeId)
        .limit(1)
        .single();

      if (!existingProduct) {
        toast({
          title: "Produto necessário",
          description: "Crie ao menos um produto antes de adicionar adicionais.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('product_addons')
        .insert({
          product_id: existingProduct.id,
          name: formData.name,
          price,
          category_id: formData.category_id || null,
          is_available: formData.is_available,
        });

      if (error) throw error;

      toast({
        title: 'Adicional criado!',
        description: 'O adicional foi adicionado com sucesso.',
      });

      setFormData({ name: "", price: "0", category_id: "", is_available: true });
      setIsAdding(false);
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar adicional',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setFormData({ name: "", price: "0", category_id: "", is_available: true });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando biblioteca...</div>;
  }

  const filteredAddons = filter === 'flavors' ? [] : addons;
  const filteredFlavors = filter === 'addons' ? [] : flavors;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Biblioteca da Loja</CardTitle>
            <CardDescription>
              Todos os adicionais e sabores cadastrados em produtos da sua loja
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="addons">Apenas Adicionais</SelectItem>
                <SelectItem value="flavors">Apenas Sabores</SelectItem>
              </SelectContent>
            </Select>
            {!isAdding && (
              <Button onClick={() => setIsAdding(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Adicional
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulário de Cadastro */}
        {isAdding && (
          <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="library-addon-name">Nome do Adicional</Label>
                <Input
                  id="library-addon-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Borda de Catupiry"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="library-addon-price">Preço (R$)</Label>
                <Input
                  id="library-addon-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="library-addon-category">Categoria</Label>
              <Select value={formData.category_id || "uncategorized"} onValueChange={(value) => setFormData({ ...formData, category_id: value === "uncategorized" ? "" : value })}>
                <SelectTrigger id="library-addon-category">
                  <SelectValue placeholder="Selecione uma categoria (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">Sem categoria</SelectItem>
                  {categories?.filter(c => c.is_active).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Salvar
              </Button>
              <Button onClick={handleCancel} variant="outline" className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        )}
        {/* Adicionais */}
        {filteredAddons.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              Adicionais ({addons.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAddons.map((addon) => (
                <Card key={addon.id} className="hover:border-primary transition-colors">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{addon.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {addon.product_name}
                          </div>
                        </div>
                        <Badge variant="secondary">R$ {addon.price.toFixed(2)}</Badge>
                      </div>
                      {addon.category_name && (
                        <Badge variant="outline" className="text-xs">
                          {addon.category_name}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Sabores */}
        {filteredFlavors.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Sabores ({flavors.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredFlavors.map((flavor) => (
                <Card key={flavor.id} className="hover:border-primary transition-colors">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{flavor.name}</div>
                          {flavor.description && (
                            <div className="text-xs text-muted-foreground">{flavor.description}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {flavor.product_name}
                          </div>
                        </div>
                        <Badge variant="secondary">R$ {flavor.price.toFixed(2)}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {addons.length === 0 && flavors.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhum adicional ou sabor cadastrado</p>
            <p className="text-sm">Adicione produtos com adicionais e sabores para começar</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Aba de Templates
export const TemplatesTab = ({ storeId }: { storeId: string }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<BusinessTemplate | any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [openCategoryPopover, setOpenCategoryPopover] = useState<number | null>(null);
  const [importFromProductOpen, setImportFromProductOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📦',
    categories: [{ name: '', addons: [{ name: '', price: 0 }] }],
    flavors: [{ name: '', description: '', price: 0 }]
  });
  const { categories: addonCategories, refetch: refetchCategories } = useAddonCategories(storeId);
  const { addons: storeAddons, flavors: storeFlavors } = useStoreAddonsAndFlavors(storeId);

  // Carregar templates customizados
  useEffect(() => {
    loadCustomTemplates();
  }, [storeId]);

  const loadCustomTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('store_addon_templates' as any)
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading custom templates:', error);
        setCustomTemplates([]);
      } else {
        setCustomTemplates(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setCustomTemplates([]);
    } finally {
      setLoadingCustom(false);
    }
  };

  const handleApplyTemplate = async (template: BusinessTemplate | any) => {
    setIsApplying(true);
    try {
      // Criar categorias de adicionais
      for (const category of template.categories) {
        const { data: categoryData, error: categoryError } = await supabase
          .from('addon_categories')
          .insert({
            store_id: storeId,
            name: category.name,
            is_active: true,
          })
          .select()
          .single();

        if (categoryError) throw categoryError;
      }

      // Criar sabores se existirem no template
      if (template.flavors && template.flavors.length > 0) {
        // Nota: Sabores são criados por produto, não globalmente
        // Esta informação será usada quando o template for aplicado a um produto específico
        console.log('Template inclui sabores:', template.flavors);
      }

      await refetchCategories();

      const message = template.flavors?.length > 0
        ? `As categorias e ${template.flavors.length} sabores de ${template.name} foram configurados.`
        : `As categorias de ${template.name} foram criadas com sucesso.`;

      toast({
        title: "Template aplicado!",
        description: message,
      });

      setPreviewOpen(false);
      setSelectedTemplate(null);
    } catch (error: any) {
      toast({
        title: "Erro ao aplicar template",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleSaveCustomTemplate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do template.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('store_addon_templates' as any)
          .update({
            name: formData.name,
            description: formData.description,
            icon: formData.icon,
            categories: formData.categories,
            flavors: formData.flavors,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;

        toast({
          title: "Template atualizado!",
          description: "Suas alterações foram salvas.",
        });
      } else {
        const { error } = await supabase
          .from('store_addon_templates' as any)
          .insert({
            store_id: storeId,
            name: formData.name,
            description: formData.description,
            icon: formData.icon,
            categories: formData.categories,
            flavors: formData.flavors,
            is_custom: true,
          });

        if (error) throw error;

        toast({
          title: "Template criado!",
          description: "Seu template personalizado foi criado com sucesso.",
        });
      }

      setEditFormOpen(false);
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        icon: '📦',
        categories: [{ name: '', addons: [{ name: '', price: 0 }] }],
        flavors: [{ name: '', description: '', price: 0 }]
      });
      await loadCustomTemplates();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCustomTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('store_addon_templates' as any)
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Template excluído!",
        description: "O template foi removido com sucesso.",
      });

      await loadCustomTemplates();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDuplicateTemplate = (template: any) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (Cópia)`,
      description: template.description,
      icon: template.icon,
      categories: JSON.parse(JSON.stringify(template.categories)),
      flavors: template.flavors ? JSON.parse(JSON.stringify(template.flavors)) : [{ name: '', description: '', price: 0 }]
    });
    setEditFormOpen(true);
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      icon: template.icon || '📦',
      categories: template.categories || [{ name: '', addons: [{ name: '', price: 0 }] }],
      flavors: template.flavors || [{ name: '', description: '', price: 0 }]
    });
    setEditFormOpen(true);
  };

  const addCategory = () => {
    setFormData({
      ...formData,
      categories: [...formData.categories, { name: '', addons: [{ name: '', price: 0 }] }]
    });
  };

  const removeCategory = (index: number) => {
    const newCategories = formData.categories.filter((_, i) => i !== index);
    setFormData({ ...formData, categories: newCategories });
  };

  const updateCategory = (index: number, name: string) => {
    const newCategories = [...formData.categories];
    newCategories[index].name = name;
    setFormData({ ...formData, categories: newCategories });
  };

  const addAddon = (categoryIndex: number) => {
    const newCategories = [...formData.categories];
    newCategories[categoryIndex].addons.push({ name: '', price: 0 });
    setFormData({ ...formData, categories: newCategories });
  };

  const removeAddon = (categoryIndex: number, addonIndex: number) => {
    const newCategories = [...formData.categories];
    newCategories[categoryIndex].addons = newCategories[categoryIndex].addons.filter((_, i) => i !== addonIndex);
    setFormData({ ...formData, categories: newCategories });
  };

  const updateAddon = (categoryIndex: number, addonIndex: number, field: 'name' | 'price', value: any) => {
    const newCategories = [...formData.categories];
    if (field === 'price') {
      newCategories[categoryIndex].addons[addonIndex][field] = value;
    } else {
      newCategories[categoryIndex].addons[addonIndex][field] = value;
    }
    setFormData({ ...formData, categories: newCategories });
  };

  // Funções para gerenciar sabores
  const addFlavor = () => {
    setFormData({
      ...formData,
      flavors: [...formData.flavors, { name: '', description: '', price: 0 }]
    });
  };

  const removeFlavor = (flavorIndex: number) => {
    setFormData({
      ...formData,
      flavors: formData.flavors.filter((_, i) => i !== flavorIndex)
    });
  };

  const updateFlavor = (flavorIndex: number, field: string, value: any) => {
    const updatedFlavors = formData.flavors.map((flavor, i) =>
      i === flavorIndex ? { ...flavor, [field]: value } : flavor
    );
    setFormData({ ...formData, flavors: updatedFlavors });
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleImportFromProduct = async (product: any) => {
    try {
      // Buscar add-ons do produto
      const { data: addons, error: addonsError } = await supabase
        .from('product_addons')
        .select(`
          *,
          addon_categories (
            id,
            name
          )
        `)
        .eq('product_id', product.id)
        .order('display_order');

      if (addonsError) throw addonsError;

      // Buscar sabores do produto
      const { data: flavors, error: flavorsError } = await supabase
        .from('product_flavors')
        .select('*')
        .eq('product_id', product.id);

      if (flavorsError) throw flavorsError;

      // Agrupar add-ons por categoria
      const categoriesMap = new Map();
      
      (addons || []).forEach((addon: any) => {
        const categoryName = addon.addon_categories?.name || 'Sem Categoria';
        if (!categoriesMap.has(categoryName)) {
          categoriesMap.set(categoryName, []);
        }
        categoriesMap.get(categoryName).push({
          name: addon.name,
          price: addon.price
        });
      });

      const categories = Array.from(categoriesMap.entries()).map(([name, addons]) => ({
        name,
        addons
      }));

      // Mapear sabores
      const templateFlavors = (flavors || []).map((flavor: any) => ({
        name: flavor.name,
        description: flavor.description || '',
        price: flavor.price
      }));

      // Criar template com as configurações do produto
      setFormData({
        name: `Template de ${product.name}`,
        description: `Importado do produto: ${product.name}`,
        icon: '📦',
        categories: categories.length > 0 ? categories : [{ name: '', addons: [{ name: '', price: 0 }] }],
        flavors: templateFlavors.length > 0 ? templateFlavors : [{ name: '', description: '', price: 0 }]
      });

      setImportFromProductOpen(false);
      setEditFormOpen(true);

      toast({
        title: "Template importado!",
        description: `Configurações do produto "${product.name}" foram carregadas. Revise e salve o template.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao importar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const allTemplates = customTemplates;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Templates de Adicionais e sabores</CardTitle>
              <CardDescription>
                Crie e gerencie seus próprios templates personalizados
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  loadProducts();
                  setImportFromProductOpen(true);
                }}
                variant="outline"
              >
                <Package className="w-4 h-4 mr-2" />
                Importar de Produto
              </Button>
              <Button onClick={() => {
                setEditingTemplate(null);
                setFormData({
                  name: '',
                  description: '',
                  icon: '📦',
                  categories: [{ name: '', addons: [{ name: '', price: 0 }] }],
                  flavors: [{ name: '', description: '', price: 0 }]
                });
                setEditFormOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Template
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Templates Personalizados */}
          {!loadingCustom && customTemplates.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Meus Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customTemplates.map((template) => (
                  <Card key={template.id} className="hover:border-primary transition-colors">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{template.icon}</div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {template.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-xs">
                          <span className="font-medium">Categorias:</span>
                          <ul className="text-muted-foreground space-y-1 mt-1">
                            {template.categories.map((cat: any, idx: number) => (
                              <li key={idx}>• {cat.name} ({cat.addons.length})</li>
                            ))}
                          </ul>
                        </div>
                        {template.flavors && template.flavors.length > 0 && (
                          <div className="text-xs">
                            <span className="font-medium">Sabores:</span>
                            <span className="text-muted-foreground ml-1">
                              {template.flavors.length} sabores inclusos
                            </span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setSelectedTemplate(template);
                              setPreviewOpen(true);
                            }}
                            className="flex-1"
                            size="sm"
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            Visualizar
                          </Button>
                          <Button
                            onClick={() => handleEditTemplate(template)}
                            variant="outline"
                            size="sm"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => handleDuplicateTemplate(template)}
                            variant="outline"
                            size="sm"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Template</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCustomTemplate(template.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Visualização e Aplicação */}
      <AlertDialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <AlertDialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <span className="text-4xl">{selectedTemplate?.icon}</span>
              {selectedTemplate?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedTemplate?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedTemplate?.categories.map((category: any, catIdx: number) => (
              <div key={catIdx} className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">{category.name}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {category.addons.map((addon: any, addonIdx: number) => (
                    <div key={addonIdx} className="flex justify-between items-center text-sm p-2 bg-muted rounded">
                      <span>{addon.name}</span>
                      <Badge variant="secondary">R$ {addon.price.toFixed(2)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {selectedTemplate?.flavors && selectedTemplate.flavors.length > 0 && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-semibold mb-3">Sabores</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedTemplate.flavors.map((flavor: any, flavorIdx: number) => (
                    <div key={flavorIdx} className="flex flex-col text-sm p-2 bg-background rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{flavor.name}</span>
                        <Badge variant="secondary">R$ {flavor.price.toFixed(2)}</Badge>
                      </div>
                      {flavor.description && (
                        <span className="text-xs text-muted-foreground mt-1">{flavor.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplying}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTemplate && handleApplyTemplate(selectedTemplate)}
              disabled={isApplying}
            >
              {isApplying ? 'Aplicando...' : 'Aplicar Template'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Edição/Criação */}
      <Dialog open={editFormOpen} onOpenChange={setEditFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template Personalizado'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Template</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Pizzaria Premium"
                />
              </div>
              <div className="space-y-2">
                <Label>Ícone (Emoji)</Label>
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="🍕"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva seu template..."
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Categorias e Adicionais</Label>
                <Button onClick={addCategory} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Categoria
                </Button>
              </div>

              {formData.categories.map((category, catIdx) => (
                <Card key={catIdx}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Popover open={openCategoryPopover === catIdx} onOpenChange={(open) => setOpenCategoryPopover(open ? catIdx : null)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between font-normal"
                            >
                              {category.name || "Nome da categoria"}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput 
                                placeholder="Buscar ou digitar nova..." 
                                value={category.name}
                                onValueChange={(value) => updateCategory(catIdx, value)}
                              />
                              <CommandList>
                                <CommandEmpty>Digite para criar nova categoria</CommandEmpty>
                                {addonCategories.length > 0 && (
                                  <CommandGroup heading="Categorias cadastradas">
                                    {addonCategories
                                      .filter(cat => cat.name.toLowerCase().includes((category.name || '').toLowerCase()))
                                      .slice(0, 5)
                                      .map((cat) => (
                                        <CommandItem
                                          key={cat.id}
                                          value={cat.name}
                                          onSelect={() => {
                                            updateCategory(catIdx, cat.name);
                                            setOpenCategoryPopover(null);
                                          }}
                                        >
                                          {cat.name}
                                        </CommandItem>
                                      ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Button
                        onClick={() => removeCategory(catIdx)}
                        size="sm"
                        variant="ghost"
                        disabled={formData.categories.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {category.addons.map((addon, addonIdx) => (
                      <div key={addonIdx} className="flex gap-2 items-start">
                        <div className="flex-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal"
                              >
                                {addon.name || "Nome do adicional"}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput 
                                  placeholder="Buscar ou digitar novo..." 
                                  value={addon.name}
                                  onValueChange={(value) => updateAddon(catIdx, addonIdx, 'name', value)}
                                />
                                <CommandList>
                                  <CommandEmpty>Digite para criar novo adicional</CommandEmpty>
                                  {storeAddons.length > 0 && (
                                    <CommandGroup heading="Adicionais cadastrados">
                                      {storeAddons
                                        .filter(a => a.name.toLowerCase().includes((addon.name || '').toLowerCase()))
                                        .slice(0, 5)
                                        .map((storeAddon) => (
                                          <CommandItem
                                            key={storeAddon.id}
                                            value={storeAddon.name}
                                            onSelect={() => {
                                              updateAddon(catIdx, addonIdx, 'name', storeAddon.name);
                                              updateAddon(catIdx, addonIdx, 'price', storeAddon.price);
                                            }}
                                          >
                                            <div className="flex items-center justify-between w-full">
                                              <span>{storeAddon.name}</span>
                                              <Badge variant="secondary" className="ml-2">
                                                R$ {storeAddon.price.toFixed(2)}
                                              </Badge>
                                            </div>
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  )}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <Input
                          type="number"
                          value={addon.price}
                          onChange={(e) => updateAddon(catIdx, addonIdx, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="Preço"
                          className="w-28"
                          step="0.01"
                        />
                        <Button
                          onClick={() => removeAddon(catIdx, addonIdx)}
                          size="sm"
                          variant="ghost"
                          disabled={category.addons.length === 1}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      onClick={() => addAddon(catIdx)}
                      size="sm"
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar Adicional
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Seção de Sabores */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Sabores</Label>
                <Button onClick={addFlavor} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Sabor
                </Button>
              </div>

              {formData.flavors.map((flavor, flavorIdx) => (
                <Card key={flavorIdx}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal"
                              >
                                {flavor.name || "Nome do sabor"}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput 
                                  placeholder="Buscar ou digitar novo..." 
                                  value={flavor.name}
                                  onValueChange={(value) => updateFlavor(flavorIdx, 'name', value)}
                                />
                                <CommandList>
                                  <CommandEmpty>Digite para criar novo sabor</CommandEmpty>
                                  {storeFlavors.length > 0 && (
                                    <CommandGroup heading="Sabores cadastrados">
                                      {storeFlavors
                                        .filter(f => f.name.toLowerCase().includes((flavor.name || '').toLowerCase()))
                                        .slice(0, 5)
                                        .map((storeFlavor) => (
                                          <CommandItem
                                            key={storeFlavor.id}
                                            value={storeFlavor.name}
                                            onSelect={() => {
                                              updateFlavor(flavorIdx, 'name', storeFlavor.name);
                                              updateFlavor(flavorIdx, 'description', storeFlavor.description || '');
                                              updateFlavor(flavorIdx, 'price', storeFlavor.price);
                                            }}
                                          >
                                            <div className="flex flex-col flex-1">
                                              <div className="flex items-center justify-between">
                                                <span>{storeFlavor.name}</span>
                                                <Badge variant="secondary" className="ml-2">
                                                  R$ {storeFlavor.price.toFixed(2)}
                                                </Badge>
                                              </div>
                                              {storeFlavor.description && (
                                                <span className="text-xs text-muted-foreground">
                                                  {storeFlavor.description}
                                                </span>
                                              )}
                                            </div>
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  )}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <Button
                          onClick={() => removeFlavor(flavorIdx)}
                          variant="ghost"
                          size="sm"
                          disabled={formData.flavors.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <Input
                            value={flavor.description}
                            onChange={(e) => updateFlavor(flavorIdx, 'description', e.target.value)}
                            placeholder="Descrição (opcional)"
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={flavor.price}
                            onChange={(e) => updateFlavor(flavorIdx, 'price', parseFloat(e.target.value) || 0)}
                            placeholder="Preço"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setEditFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCustomTemplate}>
              {editingTemplate ? 'Salvar Alterações' : 'Criar Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Importar de Produto */}
      <Dialog open={importFromProductOpen} onOpenChange={setImportFromProductOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Template de Produto</DialogTitle>
            <CardDescription>
              Selecione um produto para criar um template baseado em seus add-ons e sabores
            </CardDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingProducts ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando produtos...
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum produto encontrado na loja
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {products.map((product) => (
                  <Card 
                    key={product.id} 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleImportFromProduct(product)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {product.image_url && (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-muted-foreground">{product.category}</p>
                          {product.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {product.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">
                          R$ {product.price?.toFixed(2)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setImportFromProductOpen(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
