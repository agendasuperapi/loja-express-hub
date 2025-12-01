import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import { useStoreSizes, type StoreSize } from '@/hooks/useStoreSizes';
import { useSizeCategories } from '@/hooks/useSizeCategories';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from '@/components/ui/responsive-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface StoreSizesManagerProps {
  storeId: string;
}

export function StoreSizesManager({ storeId }: StoreSizesManagerProps) {
  const { sizes: storeSizes, isLoading, createSize, updateSize, deleteSize } = useStoreSizes(storeId);
  const { categories = [] } = useSizeCategories(storeId);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<StoreSize | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sizeToDelete, setSizeToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    category_id: '',
    description: '',
    is_available: true,
    allow_quantity: false,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      price: 0,
      category_id: '',
      description: '',
      is_available: true,
      allow_quantity: false,
    });
    setEditingSize(null);
  };

  const handleOpenDialog = (size?: StoreSize) => {
    if (size) {
      setEditingSize(size);
      setFormData({
        name: size.name,
        price: size.price,
        category_id: size.category_id || '',
        description: size.description || '',
        is_available: size.is_available,
        allow_quantity: size.allow_quantity || false,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Para variações globais, precisamos pegar o primeiro produto da loja
    // ou criar usando o product_id de uma variação existente
    let productId = '';
    
    if (editingSize) {
      productId = editingSize.product_id;
      await updateSize({
        id: editingSize.id,
        ...formData,
        category_id: formData.category_id || null,
      });
    } else {
      // Usar o product_id da primeira variação existente, se houver
      if (storeSizes && storeSizes.length > 0) {
        productId = storeSizes[0].product_id;
      } else {
        // Se não houver variações, não podemos criar (precisa de um produto primeiro)
        return;
      }
      
      await createSize({
        ...formData,
        category_id: formData.category_id || null,
        product_id: productId,
      });
    }
    
    handleCloseDialog();
  };

  const handleDeleteClick = (sizeId: string) => {
    setSizeToDelete(sizeId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (sizeToDelete) {
      await deleteSize(sizeToDelete);
      setDeleteDialogOpen(false);
      setSizeToDelete(null);
    }
  };

  const handleToggleStatus = async (size: StoreSize) => {
    await updateSize({
      id: size.id,
      is_available: !size.is_available,
    });
  };

  // Agrupar por categoria
  const groupedSizes = storeSizes?.reduce((acc, size) => {
    const categoryName = size.category?.name || 'Sem Categoria';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(size);
    return acc;
  }, {} as Record<string, StoreSize[]>) || {};

  if (isLoading) {
    return <div className="text-center py-8">Carregando variações...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Variações Globais
              </CardTitle>
              <CardDescription>
                Crie variações que podem ser reutilizadas em vários produtos
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} disabled={!storeSizes || storeSizes.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Variação
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedSizes).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">Nenhuma variação cadastrada.</p>
              <p className="text-sm">
                Crie variações nos seus produtos primeiro, depois você poderá gerenciá-las aqui de forma global.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSizes).map(([categoryName, sizes]) => (
                <div key={categoryName} className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {categoryName}
                  </h3>
                  <div className="grid gap-3">
                    {sizes.map((size) => (
                      <div
                        key={size.id}
                        className="flex items-center gap-3 p-4 bg-card border rounded-lg hover:border-primary/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{size.name}</h4>
                            {!size.is_available && (
                              <Badge variant="secondary" className="text-xs">
                                Indisponível
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span>Preço: R$ {size.price.toFixed(2)}</span>
                            {size.allow_quantity && (
                              <span>• Permite quantidade</span>
                            )}
                          </div>
                          {size.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {size.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={size.is_available}
                            onCheckedChange={() => handleToggleStatus(size)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(size)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(size.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criar/Editar */}
      <ResponsiveDialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {editingSize ? 'Editar Variação' : 'Nova Variação'}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {editingSize 
                ? 'Atualize os dados da variação' 
                : 'Crie uma nova variação que pode ser adicionada a vários produtos'}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Variação *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Pequeno, Médio, Grande"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem categoria</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição adicional da variação"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_available">Disponível</Label>
              <Switch
                id="is_available"
                checked={formData.is_available}
                onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow_quantity">Permite Quantidade</Label>
                <p className="text-xs text-muted-foreground">
                  Permite que o cliente escolha a quantidade desta variação
                </p>
              </div>
              <Switch
                id="allow_quantity"
                checked={formData.allow_quantity}
                onCheckedChange={(checked) => setFormData({ ...formData, allow_quantity: checked })}
              />
            </div>

            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingSize ? 'Atualizar' : 'Criar'}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Dialog de Confirmação de Exclusão */}
      <ResponsiveDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Confirmar Exclusão</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Tem certeza que deseja excluir esta variação? Esta ação não pode ser desfeita.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Excluir
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
