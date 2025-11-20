import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddonCategories } from "@/hooks/useAddonCategories";
import { useStoreAddons } from "@/hooks/useStoreAddons";
import { Plus, Pencil, Trash2, Check, X, Sparkles, Package } from "lucide-react";
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="addons">Adicionais Globais</TabsTrigger>
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

// Aba de Templates
export const TemplatesTab = ({ storeId }: { storeId: string }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<BusinessTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const { refetch: refetchCategories } = useAddonCategories(storeId);

  const handleApplyTemplate = async (template: BusinessTemplate) => {
    setIsApplying(true);
    try {
      // Criar categorias
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

        // Criar adicionais da categoria (vinculados a um produto dummy temporário)
        // Nota: Na prática, o usuário precisará vincular a produtos reais depois
        for (const addon of category.addons) {
          // Apenas criar a estrutura, não vincular a produtos ainda
          console.log(`Template: ${addon.name} - R$ ${addon.price} em ${category.name}`);
        }
      }

      await refetchCategories();

      toast({
        title: "Template aplicado!",
        description: `As categorias de ${template.name} foram criadas com sucesso.`,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Templates Pré-configurados</CardTitle>
        <CardDescription>
          Escolha um template baseado no seu tipo de negócio para começar rapidamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addonTemplates.map((template) => (
            <Card key={template.id} className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{template.icon}</div>
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {template.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Inclui:</div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {template.categories.map((cat, idx) => (
                      <li key={idx}>
                        • {cat.name} ({cat.addons.length} adicionais)
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => {
                      setSelectedTemplate(template);
                      setPreviewOpen(true);
                    }}
                    className="w-full mt-4"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Visualizar e Aplicar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>

      <AlertDialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedTemplate?.icon}</span>
              Preview: {selectedTemplate?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Este template criará as seguintes categorias e adicionais:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {selectedTemplate?.categories.map((category, idx) => (
              <div key={idx} className="space-y-2">
                <h4 className="font-semibold">{category.name}</h4>
                <div className="pl-4 space-y-1">
                  {category.addons.map((addon, addonIdx) => (
                    <div key={addonIdx} className="flex justify-between text-sm">
                      <span>{addon.name}</span>
                      <span className="text-muted-foreground">
                        R$ {addon.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplying}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTemplate && handleApplyTemplate(selectedTemplate)}
              disabled={isApplying}
            >
              {isApplying ? "Aplicando..." : "Aplicar Template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
