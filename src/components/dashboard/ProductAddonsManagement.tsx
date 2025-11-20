import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddonCategories } from "@/hooks/useAddonCategories";
import { useStoreAddons } from "@/hooks/useStoreAddons";
import { useStoreAddonsAndFlavors } from "@/hooks/useStoreAddonsAndFlavors";
import { Plus, Pencil, Trash2, Check, X, Sparkles, Package, Copy, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { addonTemplates, BusinessTemplate } from "@/lib/addonTemplates";
import { supabase } from "@/integrations/supabase/client";

interface ProductAddonsManagementProps {
  storeId: string;
}

export const ProductAddonsManagement = ({ storeId }: ProductAddonsManagementProps) => {
  const [activeTab, setActiveTab] = useState("categories");

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
          <AddonsTab storeId={storeId} />
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
  const [formData, setFormData] = useState({ name: "" });
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

    if (editingId) {
      await updateCategory(editingId, { name: formData.name });
    } else {
      await addCategory(formData.name);
    }

    setFormData({ name: "" });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (category: any) => {
    setEditingId(category.id);
    setFormData({ name: category.name });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: "" });
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
          <Button onClick={() => setIsAdding(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        )}

        {isAdding && (
          <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nome da Categoria</Label>
              <Input
                id="category-name"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                placeholder="Ex: Bordas, Tamanhos, Bebidas"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                {editingId ? "Atualizar" : "Salvar"}
              </Button>
              <Button onClick={handleCancel} variant="outline" className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Cancelar
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
                <div className="flex items-center gap-3">
                  <span className="font-medium">{category.name}</span>
                  <Badge variant={category.is_active ? "default" : "secondary"}>
                    {category.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={category.is_active}
                    onCheckedChange={(checked) => toggleCategoryStatus(category.id, checked)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(category)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(category.id)}
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
  const { categories } = useAddonCategories(storeId);
  const { addons, isLoading } = useStoreAddons(storeId);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredAddons = addons?.filter(addon => {
    if (categoryFilter === "all") return true;
    if (categoryFilter === "uncategorized") return !addon.category_id;
    return addon.category_id === categoryFilter;
  });

  const addonsByCategory = filteredAddons?.reduce((acc, addon) => {
    const categoryName = addon.category?.name || "Sem categoria";
    if (!acc[categoryName]) acc[categoryName] = [];
    acc[categoryName].push(addon);
    return acc;
  }, {} as Record<string, typeof addons>);

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
                        <div className="font-medium">{addon.name}</div>
                        <div className="text-sm text-muted-foreground">
                          R$ {addon.price.toFixed(2)}
                        </div>
                      </div>
                      <Badge variant={addon.is_available ? "default" : "secondary"}>
                        {addon.is_available ? "Disponível" : "Indisponível"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Nova Aba: Biblioteca de Adicionais e Sabores
export const LibraryTab = ({ storeId }: { storeId: string }) => {
  const { addons, flavors, isLoading } = useStoreAddonsAndFlavors(storeId);
  const [filter, setFilter] = useState<'all' | 'addons' | 'flavors'>('all');

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
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📦',
    categories: [{ name: '', addons: [{ name: '', price: 0 }] }],
    flavors: [{ name: '', description: '', price: 0 }]
  });
  const { refetch: refetchCategories } = useAddonCategories(storeId);
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

  const allTemplates = [...addonTemplates, ...customTemplates];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Templates de Adicionais</CardTitle>
              <CardDescription>
                Use templates pré-configurados ou crie seus próprios templates personalizados
              </CardDescription>
            </div>
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
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Templates Pré-configurados */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Templates Pré-configurados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {addonTemplates.map((template) => (
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
                          {template.categories.map((cat, idx) => (
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
                          Aplicar
                        </Button>
                        <Button
                          onClick={() => handleDuplicateTemplate(template)}
                          variant="outline"
                          size="sm"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

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
                            Aplicar
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
                      <Input
                        value={category.name}
                        onChange={(e) => updateCategory(catIdx, e.target.value)}
                        placeholder="Nome da categoria"
                        className="flex-1"
                      />
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
    </div>
  );
};
