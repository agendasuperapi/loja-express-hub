import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, DollarSign, Package, Search, GripVertical, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProductFlavors } from "@/hooks/useProductFlavors";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
}

interface SortableFlavorItemProps {
  flavor: any;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

const SortableFlavorItem = ({ flavor, isSelected, onToggleSelect, onEdit, onDelete, isDeleting }: SortableFlavorItemProps) => {
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
      className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-background"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
      />
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
          onClick={onEdit}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};

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
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [selectedFlavorIds, setSelectedFlavorIds] = useState<string[]>([]);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        .from('store_addon_templates' as any)
        .select('*')
        .eq('store_id', storeId)
        .eq('is_custom', true)
        .order('created_at', { ascending: false });
      
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

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    const allFlavors = (template.flavors || []).map((f: any, idx: number) => `${idx}`);
    setSelectedFlavors(allFlavors);
  };

  const handleToggleFlavor = (flavorIndex: string) => {
    setSelectedFlavors(prev => 
      prev.includes(flavorIndex) 
        ? prev.filter(idx => idx !== flavorIndex)
        : [...prev, flavorIndex]
    );
  };

  const handleConfirmImportTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const flavorsToImport = (selectedTemplate.flavors || []).filter(
        (_: any, idx: number) => selectedFlavors.includes(`${idx}`)
      );
      
      if (flavorsToImport.length > 0) {
        for (const flavor of flavorsToImport) {
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
          description: `${flavorsToImport.length} sabor(es) foram importados do template.`,
        });
      } else {
        toast({
          title: 'Nenhum sabor selecionado',
          description: 'Selecione pelo menos um sabor para importar.',
          variant: 'destructive',
        });
        return;
      }
      
      setImportTemplateOpen(false);
      setSelectedTemplate(null);
      setSelectedFlavors([]);
    } catch (error: any) {
      toast({
        title: 'Erro ao importar template',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancelImportTemplate = () => {
    setSelectedTemplate(null);
    setSelectedFlavors([]);
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

  const handleToggleFlavorSelect = (flavorId: string) => {
    setSelectedFlavorIds(prev =>
      prev.includes(flavorId)
        ? prev.filter(id => id !== flavorId)
        : [...prev, flavorId]
    );
  };

  const handleSelectAllFlavors = () => {
    if (flavors) {
      setSelectedFlavorIds(flavors.map(f => f.id));
    }
  };

  const handleDeselectAllFlavors = () => {
    setSelectedFlavorIds([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedFlavorIds.length === 0) return;

    setIsBulkActionLoading(true);
    try {
      for (const flavorId of selectedFlavorIds) {
        await deleteFlavor(flavorId);
      }
      setSelectedFlavorIds([]);
      toast({
        title: 'Sabores removidos!',
        description: `${selectedFlavorIds.length} sabor(es) foram removidos.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover sabores',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkToggleAvailability = async (makeAvailable: boolean) => {
    if (selectedFlavorIds.length === 0) return;

    setIsBulkActionLoading(true);
    try {
      const updates = selectedFlavorIds.map(async (flavorId) => {
        const flavor = flavors?.find(f => f.id === flavorId);
        if (flavor) {
          await updateFlavor({
            id: flavorId,
            name: flavor.name,
            description: flavor.description,
            price: flavor.price,
            is_available: makeAvailable,
          });
        }
      });

      await Promise.all(updates);

      toast({
        title: makeAvailable ? 'Sabores ativados' : 'Sabores desativados',
        description: `${selectedFlavorIds.length} sabor(es) foram ${makeAvailable ? 'ativados' : 'desativados'} com sucesso.`,
      });

      setSelectedFlavorIds([]);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar sabores.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  return (
    <>
      {/* Bulk Actions Floating Bar */}
      {selectedFlavorIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <Card className="shadow-lg border-2">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {selectedFlavorIds.length} selecionado{selectedFlavorIds.length > 1 ? 's' : ''}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedFlavorIds([])}
                    disabled={isBulkActionLoading}
                  >
                    <X className="w-4 h-4" />
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
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isBulkActionLoading}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir {selectedFlavorIds.length} sabor(es)? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                variant="outline"
                onClick={() => {
                  loadTemplates();
                  setImportTemplateOpen(true);
                }}
                className="w-full sm:w-auto"
              >
                <Package className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Importar Template</span>
                <span className="sm:hidden">Template</span>
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
              <Button 
                size="sm" 
                onClick={() => setIsAdding(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Novo Sabor</span>
                <span className="sm:hidden">Novo</span>
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

        {flavors && flavors.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedFlavorIds.length === flavors.length}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleSelectAllFlavors();
                  } else {
                    handleDeselectAllFlavors();
                  }
                }}
              />
              <span className="text-sm font-medium">
                {selectedFlavorIds.length > 0
                  ? `${selectedFlavorIds.length} selecionado(s)`
                  : 'Selecionar todos'}
              </span>
            </div>
            {selectedFlavorIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAllFlavors}
              >
                Desmarcar Todos
              </Button>
            )}
          </div>
        )}

        <div className="space-y-2">
          {flavors && flavors.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={flavors.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                {flavors.map((flavor) => (
                  <SortableFlavorItem
                    key={flavor.id}
                    flavor={flavor}
                    isSelected={selectedFlavorIds.includes(flavor.id)}
                    onToggleSelect={() => handleToggleFlavorSelect(flavor.id)}
                    onEdit={() => handleEdit(flavor)}
                    onDelete={() => deleteFlavor(flavor.id)}
                    isDeleting={isDeleting}
                  />
                ))}
              </SortableContext>
            </DndContext>
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
        <Dialog open={importTemplateOpen} onOpenChange={(open) => {
          setImportTemplateOpen(open);
          if (!open) {
            setSelectedTemplate(null);
            setSelectedFlavors([]);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {selectedTemplate ? 'Selecionar Sabores' : 'Importar Templates de Sabores'}
              </DialogTitle>
              <DialogDescription>
                {selectedTemplate 
                  ? 'Marque os sabores que deseja importar para este produto'
                  : 'Selecione um template para visualizar seus sabores'
                }
              </DialogDescription>
            </DialogHeader>
            {!selectedTemplate ? (
              <div className="space-y-3">
                {loadingTemplates ? (
                  <p className="text-center py-4 text-muted-foreground">Carregando templates...</p>
                ) : templates.length > 0 ? (
                  templates.map((template) => {
                    const flavorCount = Array.isArray(template.flavors) ? template.flavors.length : 0;
                    const hasNoFlavors = flavorCount === 0;
                    
                    return (
                      <div
                        key={template.id}
                        className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                          hasNoFlavors 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-muted/50 cursor-pointer'
                        }`}
                        onClick={() => !hasNoFlavors && handleSelectTemplate(template)}
                      >
                        <div className="text-3xl">{template.icon || '📦'}</div>
                        <div className="flex-1">
                          <p className="font-medium">{template.name}</p>
                          {template.description && (
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {flavorCount} sabor(es)
                            </p>
                            {hasNoFlavors && (
                              <Badge variant="destructive" className="text-xs">
                                Sem sabores
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
                    <Label className="text-sm font-medium">Sabores disponíveis:</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {selectedFlavors.length} de {selectedTemplate.flavors?.length || 0} selecionados
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allFlavors = (selectedTemplate.flavors || []).map((_: any, idx: number) => `${idx}`);
                          setSelectedFlavors(allFlavors);
                        }}
                        className="h-7 text-xs"
                      >
                        Selecionar Todos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFlavors([])}
                        className="h-7 text-xs"
                      >
                        Desmarcar Todos
                      </Button>
                    </div>
                  </div>
                  
                  {(selectedTemplate.flavors || []).map((flavor: any, index: number) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedFlavors.includes(`${index}`)}
                        onCheckedChange={() => handleToggleFlavor(`${index}`)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{flavor.name}</p>
                          <span className="text-sm text-muted-foreground">
                            R$ {(flavor.price || 0).toFixed(2)}
                          </span>
                        </div>
                        {flavor.description && (
                          <p className="text-sm text-muted-foreground">{flavor.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleConfirmImportTemplate}
                    disabled={selectedFlavors.length === 0}
                    className="flex-1"
                  >
                    Importar {selectedFlavors.length} Sabor(es)
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
    </>
  );
};
