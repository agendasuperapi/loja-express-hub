import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStoreAddonsAndFlavors } from "@/hooks/useStoreAddonsAndFlavors";
import { useProductFlavors } from "@/hooks/useProductFlavors";
import { Package, Sparkles, Edit, Save, X, Plus, Trash2, Power, PowerOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

interface ProductFlavorsManagementProps {
  storeId: string;
}

export const ProductFlavorsManagement = ({ storeId }: ProductFlavorsManagementProps) => {
  const [activeTab, setActiveTab] = useState("flavors");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="flavors">Sabores Globais</TabsTrigger>
        </TabsList>

        <TabsContent value="flavors" className="space-y-4">
          <FlavorsTab storeId={storeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Aba de Sabores Globais
export const FlavorsTab = ({ storeId }: { storeId: string }) => {
  const { flavors, isLoading, refetch } = useStoreAddonsAndFlavors(storeId);
  const { updateFlavor, deleteFlavor, createFlavor, isUpdating, isDeleting } = useProductFlavors();
  const [editingFlavorId, setEditingFlavorId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<{
    name: string;
    description: string;
    price: string;
  }>({ name: '', description: '', price: '' });
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [isNewFlavorOpen, setIsNewFlavorOpen] = useState(false);
  const [newFlavorData, setNewFlavorData] = useState({
    name: '',
    description: '',
    price: '',
    is_available: true,
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando sabores...</div>;
  }

  const flavorsByProduct = flavors?.reduce((acc, flavor) => {
    const productName = flavor.product_name || "Sem produto";
    if (!acc[productName]) acc[productName] = [];
    acc[productName].push(flavor);
    return acc;
  }, {} as Record<string, typeof flavors>);

  const handleEdit = (flavor: any) => {
    setEditingFlavorId(flavor.id);
    setEditedValues({
      name: flavor.name,
      description: flavor.description || '',
      price: flavor.price.toString(),
    });
  };

  const handleCancel = () => {
    setEditingFlavorId(null);
    setEditedValues({ name: '', description: '', price: '' });
  };

  const handleSave = (flavorId: string) => {
    const price = parseFloat(editedValues.price);
    if (isNaN(price) || price < 0) {
      return;
    }

    updateFlavor({
      id: flavorId,
      name: editedValues.name,
      description: editedValues.description || undefined,
      price,
    }, {
      onSuccess: () => {
        setEditingFlavorId(null);
        setEditedValues({ name: '', description: '', price: '' });
        refetch();
      },
    });
  };

  const handleToggleAvailability = (flavor: any) => {
    updateFlavor({
      id: flavor.id,
      is_available: !flavor.is_available,
    }, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  const handleDeleteClick = (id: string, name: string) => {
    setConfirmDelete({ id, name });
  };

  const handleConfirmDelete = () => {
    if (confirmDelete) {
      deleteFlavor(confirmDelete.id, {
        onSuccess: () => {
          setConfirmDelete(null);
          refetch();
        },
      });
    }
  };

  const handleCreateFlavor = () => {
    const price = parseFloat(newFlavorData.price);
    if (isNaN(price) || price < 0 || !newFlavorData.name) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    // Precisamos de um product_id para criar o sabor
    // Como estamos criando um sabor "global", vamos exigir que o usuário selecione um produto
    toast({
      title: 'Atenção',
      description: 'Adicione sabores diretamente em produtos específicos',
      variant: 'destructive',
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sabores Globais</CardTitle>
              <CardDescription>
                Visualize e gerencie todos os sabores da sua loja
              </CardDescription>
            </div>
            <Button onClick={() => setIsNewFlavorOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Novo Sabor
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {!flavors || flavors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum sabor cadastrado</p>
                <p className="text-sm">Adicione produtos com sabores para começar</p>
              </div>
            ) : (
              Object.entries(flavorsByProduct || {}).map(([productName, productFlavors]) => (
                <div key={productName} className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">{productName}</h3>
                  <div className="space-y-2">
                    {productFlavors?.map((flavor) => (
                      <div
                        key={flavor.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        {editingFlavorId === flavor.id ? (
                          <div className="flex-1 space-y-3">
                            <div className="grid gap-2">
                              <Label htmlFor={`name-${flavor.id}`}>Nome</Label>
                              <Input
                                id={`name-${flavor.id}`}
                                value={editedValues.name}
                                onChange={(e) => setEditedValues({ ...editedValues, name: e.target.value })}
                                placeholder="Nome do sabor"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor={`desc-${flavor.id}`}>Descrição</Label>
                              <Textarea
                                id={`desc-${flavor.id}`}
                                value={editedValues.description}
                                onChange={(e) => setEditedValues({ ...editedValues, description: e.target.value })}
                                placeholder="Descrição (opcional)"
                                rows={2}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor={`price-${flavor.id}`}>Preço (R$)</Label>
                              <Input
                                id={`price-${flavor.id}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={editedValues.price}
                                onChange={(e) => setEditedValues({ ...editedValues, price: e.target.value })}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                disabled={isUpdating}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSave(flavor.id)}
                                disabled={isUpdating || !editedValues.name || !editedValues.price}
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Salvar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{flavor.name}</span>
                                <Badge variant={flavor.is_available ? "default" : "secondary"} className="text-xs">
                                  {flavor.is_available ? 'Disponível' : 'Indisponível'}
                                </Badge>
                              </div>
                              {flavor.description && (
                                <div className="text-sm text-muted-foreground">{flavor.description}</div>
                              )}
                              <div className="text-sm text-muted-foreground">
                                R$ {flavor.price.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleAvailability(flavor)}
                                disabled={isUpdating}
                                title={flavor.is_available ? 'Inativar' : 'Ativar'}
                              >
                                {flavor.is_available ? (
                                  <PowerOff className="w-4 h-4" />
                                ) : (
                                  <Power className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(flavor)}
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(flavor.id, flavor.name)}
                                disabled={isDeleting}
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Novo Sabor */}
      <ResponsiveDialog open={isNewFlavorOpen} onOpenChange={setIsNewFlavorOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Novo Sabor</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="space-y-4 px-4 sm:px-0">
            <div className="space-y-2">
              <Label className="text-sm">Nome do Sabor</Label>
              <Input
                value={newFlavorData.name}
                onChange={(e) => setNewFlavorData({ ...newFlavorData, name: e.target.value })}
                placeholder="Ex: Calabresa"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Descrição (opcional)</Label>
              <Textarea
                value={newFlavorData.description}
                onChange={(e) => setNewFlavorData({ ...newFlavorData, description: e.target.value })}
                placeholder="Descrição do sabor"
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Preço (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newFlavorData.price}
                onChange={(e) => setNewFlavorData({ ...newFlavorData, price: e.target.value })}
                placeholder="0.00"
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newFlavorData.is_available}
                onCheckedChange={(checked) => setNewFlavorData({ ...newFlavorData, is_available: checked })}
              />
              <Label className="text-sm">Disponível</Label>
            </div>
            <div className="bg-muted p-3 rounded-lg text-xs sm:text-sm text-muted-foreground">
              <p>💡 Sabores devem ser criados diretamente em produtos específicos.</p>
              <p className="mt-1">Acesse a aba "Produtos" e adicione sabores aos seus produtos.</p>
            </div>
          </div>
          <ResponsiveDialogFooter className="px-4 sm:px-0">
            <Button onClick={() => setIsNewFlavorOpen(false)} className="w-full text-sm">
              Entendi
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* AlertDialog para confirmar exclusão */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o sabor <strong>"{confirmDelete?.name}"</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Aba de Biblioteca (Adicionais e Sabores)
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
