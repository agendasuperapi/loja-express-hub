import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, DollarSign, Package, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProductFlavors } from "@/hooks/useProductFlavors";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStoreAddonsAndFlavors } from "@/hooks/useStoreAddonsAndFlavors";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ProductFlavorsManagerProps {
  productId: string;
  storeId?: string;
}

export const ProductFlavorsManager = ({ productId, storeId }: ProductFlavorsManagerProps) => {
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
  const [importTemplateOpen, setImportTemplateOpen] = useState(false);
  const [searchFlavorsOpen, setSearchFlavorsOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

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
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', description: '', price: 0, is_available: true });
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

  const loadTemplates = async () => {
    if (!storeId) return;
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('store_addon_templates')
        .select('*')
        .eq('store_id', storeId);
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar templates',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingTemplates(false);
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

  const handleImportFromTemplate = async (template: any) => {
    try {
      const flavors = template.flavors || [];
      
      if (flavors.length > 0) {
        for (const flavor of flavors) {
          await createFlavor({
            product_id: productId,
            name: flavor.name,
            description: flavor.description || '',
            price: flavor.price || 0,
            is_available: true,
          });
        }
        
        toast({
          title: 'Sabores importados!',
          description: `${flavors.length} sabor(es) foram importados do template.`,
        });
      } else {
        toast({
          title: 'Nenhum sabor no template',
          description: 'O template selecionado não possui sabores.',
          variant: 'destructive',
        });
      }
      
      setImportTemplateOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao importar template',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAddStoreFlavor = async (flavor: any) => {
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
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sabores</CardTitle>
            <CardDescription>Gerencie os sabores disponíveis para este produto</CardDescription>
          </div>
          {!isAdding && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  loadTemplates();
                  setImportTemplateOpen(true);
                }}
              >
                <Package className="w-4 h-4 mr-2" />
                Importar Template
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  loadProducts();
                  setImportFromProductOpen(true);
                }}
              >
                <Package className="w-4 h-4 mr-2" />
                Importar de Produto
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setSearchFlavorsOpen(true)}
              >
                <Search className="w-4 h-4 mr-2" />
                Buscar Sabores
              </Button>
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Sabor
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

        <div className="space-y-2">
          {flavors && flavors.length > 0 ? (
            flavors.map((flavor) => (
              <div
                key={flavor.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{flavor.name}</p>
                    <span className="text-sm text-muted-foreground">
                      R$ {flavor.price.toFixed(2)}
                    </span>
                  </div>
                  {flavor.description && (
                    <p className="text-sm text-muted-foreground">{flavor.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={flavor.is_available ? "default" : "secondary"}>
                    {flavor.is_available ? 'Disponível' : 'Indisponível'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(flavor)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteFlavor(flavor.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum sabor cadastrado
            </p>
          )}
        </div>

        {/* Dialog: Importar de Produto */}
        <Dialog open={importFromProductOpen} onOpenChange={setImportFromProductOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Importar Sabores de Produto</DialogTitle>
              <DialogDescription>
                Selecione um produto para importar seus sabores
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

        {/* Dialog: Importar Template */}
        <Dialog open={importTemplateOpen} onOpenChange={setImportTemplateOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Importar de Template</DialogTitle>
              <DialogDescription>
                Selecione um template para importar seus sabores
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {loadingTemplates ? (
                <p className="text-center py-4 text-muted-foreground">Carregando templates...</p>
              ) : templates.length > 0 ? (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleImportFromTemplate(template)}
                  >
                    <div className="text-3xl">{template.icon || '📦'}</div>
                    <div className="flex-1">
                      <p className="font-medium">{template.name}</p>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {template.flavors?.length || 0} sabor(es)
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  Nenhum template encontrado
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog: Buscar Sabores da Loja */}
        <Dialog open={searchFlavorsOpen} onOpenChange={setSearchFlavorsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buscar Sabores da Loja</DialogTitle>
              <DialogDescription>
                Todos os sabores únicos cadastrados em sua loja
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {storeFlavors && storeFlavors.length > 0 ? (
                storeFlavors.map((flavor) => (
                  <div
                    key={flavor.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{flavor.name}</p>
                      {flavor.description && (
                        <p className="text-sm text-muted-foreground">{flavor.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">
                          R$ {flavor.price.toFixed(2)}
                        </p>
                        {flavor.product_name && (
                          <Badge variant="outline" className="text-xs">
                            {flavor.product_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddStoreFlavor(flavor)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  Nenhum sabor encontrado na loja
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
