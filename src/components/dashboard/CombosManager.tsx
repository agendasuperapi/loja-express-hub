import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Package, X } from "lucide-react";
import { useCombos, type ComboFormData, type Combo } from "@/hooks/useCombos";
import { ImageUpload } from "./ImageUpload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CombosManagerProps {
  storeId: string;
  products: any[];
}

export const CombosManager = ({ storeId, products }: CombosManagerProps) => {
  const { combos, createCombo, updateCombo, toggleComboAvailability, deleteCombo, isCreating, isUpdating } = useCombos(storeId);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [comboToDelete, setComboToDelete] = useState<Combo | null>(null);
  
  const [formData, setFormData] = useState<ComboFormData>({
    name: '',
    description: '',
    image_url: '',
    combo_price: 0,
    is_available: true,
    items: [],
  });

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image_url: '',
      combo_price: 0,
      is_available: true,
      items: [],
    });
    setSelectedProductId('');
    setSelectedQuantity(1);
    setEditingCombo(null);
  };

  const handleOpenDialog = (combo?: Combo) => {
    if (combo) {
      setEditingCombo(combo);
      setFormData({
        name: combo.name,
        description: combo.description || '',
        image_url: combo.image_url || '',
        combo_price: combo.combo_price,
        is_available: combo.is_available,
        items: combo.combo_items?.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })) || [],
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleAddProduct = () => {
    if (!selectedProductId) return;
    
    // Check if product already in list
    const existingIndex = formData.items.findIndex(item => item.product_id === selectedProductId);
    
    if (existingIndex >= 0) {
      // Update quantity
      const newItems = [...formData.items];
      newItems[existingIndex].quantity += selectedQuantity;
      setFormData({ ...formData, items: newItems });
    } else {
      // Add new item
      setFormData({
        ...formData,
        items: [...formData.items, { product_id: selectedProductId, quantity: selectedQuantity }],
      });
    }
    
    setSelectedProductId('');
    setSelectedQuantity(1);
  };

  const handleRemoveProduct = (productId: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter(item => item.product_id !== productId),
    });
  };

  const calculateTotalPrice = () => {
    return formData.items.reduce((total, item) => {
      const product = products.find(p => p.id === item.product_id);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  };

  const getProductInfo = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.items.length === 0) {
      return;
    }

    try {
      if (editingCombo) {
        await updateCombo({ id: editingCombo.id, formData });
      } else {
        await createCombo(formData);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving combo:', error);
    }
  };

  const handleDelete = async () => {
    if (comboToDelete) {
      await deleteCombo(comboToDelete.id);
      setComboToDelete(null);
    }
  };

  const totalPrice = calculateTotalPrice();
  const savings = totalPrice - formData.combo_price;
  const savingsPercent = totalPrice > 0 ? ((savings / totalPrice) * 100).toFixed(0) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Combos Promocionais</CardTitle>
            <CardDescription>
              Crie pacotes com múltiplos produtos a preços especiais
            </CardDescription>
          </div>
          <ResponsiveDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Combo
            </Button>
            <ResponsiveDialogContent>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>{editingCombo ? 'Editar Combo' : 'Novo Combo'}</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  Configure o combo com produtos e preço promocional
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="combo-name">Nome do Combo *</Label>
                  <Input
                    id="combo-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Combo Família"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="combo-description">Descrição</Label>
                  <Textarea
                    id="combo-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o combo..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Imagem do Combo</Label>
                  <ImageUpload
                    bucket="product-images"
                    folder="combos"
                    currentImageUrl={formData.image_url}
                    onUploadComplete={(url) => setFormData({ ...formData, image_url: url })}
                    label="Imagem do Combo"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Produtos do Combo *</Label>
                  <div className="flex gap-2">
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter(p => p.is_available)
                          .map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - R$ {product.price.toFixed(2)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      className="w-20"
                      value={selectedQuantity}
                      onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                      placeholder="Qtd"
                    />
                    <Button type="button" onClick={handleAddProduct} disabled={!selectedProductId}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {formData.items.length > 0 && (
                    <ScrollArea className="h-40 border rounded-md p-3">
                      <div className="space-y-2">
                        {formData.items.map((item) => {
                          const product = getProductInfo(item.product_id);
                          if (!product) return null;
                          return (
                            <div key={item.product_id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                              <div className="flex items-center gap-2">
                                {product.image_url && (
                                  <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded" />
                                )}
                                <div>
                                  <p className="font-medium text-sm">{product.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.quantity}x R$ {product.price.toFixed(2)} = R$ {(product.price * item.quantity).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveProduct(item.product_id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}

                  {formData.items.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum produto adicionado</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor Total dos Produtos</Label>
                    <div className="text-2xl font-bold">
                      R$ {totalPrice.toFixed(2)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="combo-price">Preço do Combo *</Label>
                    <Input
                      id="combo-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.combo_price}
                      onChange={(e) => setFormData({ ...formData, combo_price: parseFloat(e.target.value) || 0 })}
                      required
                    />
                    {savings > 0 && (
                      <p className="text-sm text-green-600 font-medium">
                        Economia: R$ {savings.toFixed(2)} ({savingsPercent}%)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="combo-available"
                    checked={formData.is_available}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                  />
                  <Label htmlFor="combo-available">Disponível para venda</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating || formData.items.length === 0}>
                    {editingCombo ? 'Atualizar' : 'Criar'} Combo
                  </Button>
                </div>
              </form>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </div>
      </CardHeader>

      <CardContent>
        {combos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum combo cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie combos promocionais para aumentar suas vendas
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {combos.map((combo) => {
              const totalNormal = combo.combo_items?.reduce((sum, item) => {
                const product = products.find(p => p.id === item.product_id);
                return sum + (product?.price || 0) * item.quantity;
              }, 0) || 0;
              
              const discount = totalNormal - combo.combo_price;
              const discountPercent = totalNormal > 0 ? ((discount / totalNormal) * 100).toFixed(0) : 0;

              return (
                <Card key={combo.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {combo.image_url ? (
                          <img
                            src={combo.image_url}
                            alt={combo.name}
                            className="w-24 h-24 object-cover rounded-md"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center">
                            <Package className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-lg">{combo.name}</h4>
                            {combo.description && (
                              <p className="text-sm text-muted-foreground">{combo.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={combo.is_available}
                              onCheckedChange={(checked) =>
                                toggleComboAvailability({ id: combo.id, is_available: checked })
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(combo)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setComboToDelete(combo)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1 mb-3">
                          <p className="text-sm font-medium">Produtos inclusos:</p>
                          <div className="flex flex-wrap gap-2">
                            {combo.combo_items?.map((item) => {
                              const product = products.find(p => p.id === item.product_id);
                              return product ? (
                                <Badge key={item.id} variant="secondary">
                                  {item.quantity}x {product.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground line-through">
                              De R$ {totalNormal.toFixed(2)}
                            </p>
                            <p className="text-2xl font-bold text-green-600">
                              R$ {combo.combo_price.toFixed(2)}
                            </p>
                          </div>
                          {discount > 0 && (
                            <Badge variant="default" className="bg-green-600">
                              -{discountPercent}%
                            </Badge>
                          )}
                          <Badge variant={combo.is_available ? 'default' : 'secondary'}>
                            {combo.is_available ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!comboToDelete} onOpenChange={() => setComboToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o combo "{comboToDelete?.name}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
