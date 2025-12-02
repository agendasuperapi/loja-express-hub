import { useState, useMemo } from 'react';
import { useCoupons, Coupon, DiscountType } from '@/hooks/useCoupons';
import { useEmployeeAccess } from '@/hooks/useEmployeeAccess';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Pencil, Trash2, Ticket, Calendar, DollarSign, Users, Copy, BarChart3, Search, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { CouponsReport } from './CouponsReport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CouponsManagerProps {
  storeId: string;
}

const couponSchema = z.object({
  code: z.string().min(3, 'Código deve ter no mínimo 3 caracteres').max(20, 'Código deve ter no máximo 20 caracteres').regex(/^[A-Z0-9]+$/, 'Use apenas letras maiúsculas e números'),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive('Valor deve ser positivo'),
  min_order_value: z.number().min(0, 'Valor mínimo não pode ser negativo'),
  max_uses: z.number().nullable(),
  valid_from: z.string(),
  valid_until: z.string().nullable(),
});

export function CouponsManager({ storeId }: CouponsManagerProps) {
  const { coupons, isLoading, createCoupon, updateCoupon, deleteCoupon, toggleCouponStatus } = useCoupons(storeId);
  const { categories } = useCategories(storeId);
  const { data: products = [] } = useProducts(storeId);
  const employeeAccess = useEmployeeAccess();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const { toast } = useToast();

  // Estados de busca
  const [categorySearch, setCategorySearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Verificar permissões
  const hasPermission = (action: string): boolean => {
    if (!employeeAccess.isEmployee || !employeeAccess.permissions) return true;
    const modulePermissions = (employeeAccess.permissions as any)['coupons'];
    return modulePermissions?.[action] === true;
  };

  const canCreate = hasPermission('create');
  const canUpdate = hasPermission('update');
  const canDelete = hasPermission('delete');
  const canToggleStatus = hasPermission('toggle_status');

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as DiscountType,
    discount_value: '',
    min_order_value: '0',
    max_uses: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    is_active: true,
    applies_to: 'all' as 'all' | 'category' | 'product',
    category_names: [] as string[],
    product_ids: [] as string[],
  });

  // Filtros de busca
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
  }, [categories, categorySearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [products, productSearch]);

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_value: '0',
      max_uses: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      is_active: true,
      applies_to: 'all',
      category_names: [],
      product_ids: [],
    });
    setEditingCoupon(null);
    setCategorySearch('');
    setProductSearch('');
  };

  const handleOpenDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      const couponAny = coupon as any;
      setFormData({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value.toString(),
        min_order_value: coupon.min_order_value.toString(),
        max_uses: coupon.max_uses?.toString() || '',
        valid_from: coupon.valid_from.split('T')[0],
        valid_until: coupon.valid_until?.split('T')[0] || '',
        is_active: coupon.is_active,
        applies_to: couponAny.applies_to || 'all',
        category_names: couponAny.category_names || [],
        product_ids: couponAny.product_ids || [],
      });
    } else {
      resetForm();
    }
    setCategorySearch('');
    setProductSearch('');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = couponSchema.parse({
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_order_value: parseFloat(formData.min_order_value),
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until || null,
      });

      if (formData.discount_type === 'percentage' && validatedData.discount_value > 100) {
        toast({
          title: 'Valor inválido',
          description: 'Desconto percentual não pode ser maior que 100%',
          variant: 'destructive',
        });
        return;
      }

      // Validação de escopo
      if (formData.applies_to === 'category' && formData.category_names.length === 0) {
        toast({
          title: 'Selecione pelo menos uma categoria',
          description: 'Para cupom por categoria, selecione pelo menos uma categoria.',
          variant: 'destructive',
        });
        return;
      }

      if (formData.applies_to === 'product' && formData.product_ids.length === 0) {
        toast({
          title: 'Selecione pelo menos um produto',
          description: 'Para cupom por produto, selecione pelo menos um produto.',
          variant: 'destructive',
        });
        return;
      }

      const couponData = {
        ...validatedData,
        is_active: formData.is_active,
        applies_to: formData.applies_to,
        category_names: formData.category_names,
        product_ids: formData.product_ids,
      };

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, couponData as any);
      } else {
        await createCoupon({
          store_id: storeId,
          ...couponData,
        } as any);
      }

      handleCloseDialog();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.issues[0].message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Código copiado',
      description: `O código ${code} foi copiado para a área de transferência`,
    });
  };

  const formatDiscount = (type: DiscountType, value: number) => {
    return type === 'percentage' ? `${value}%` : `R$ ${value.toFixed(2)}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Carregando cupons...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Cupons de Desconto</h2>
          <p className="text-muted-foreground">Gerencie os cupons promocionais da sua loja</p>
        </div>
      </div>

      <Tabs defaultValue="management" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="management" className="gap-2">
            <Ticket className="h-4 w-4" />
            Gerenciar Cupons
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Relatório
          </TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-6">
          <div className="flex justify-end">
            {canCreate && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Cupom
                  </Button>
                </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingCoupon ? 'Editar Cupom' : 'Criar Novo Cupom'}
                </DialogTitle>
                <DialogDescription>
                  Configure os detalhes do cupom de desconto
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Código do Cupom *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: PROMO10"
                    required
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">Apenas letras maiúsculas e números</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="discount_type">Tipo de Desconto *</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value: DiscountType) => setFormData({ ...formData, discount_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentual (%)</SelectItem>
                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="discount_value">
                      Valor {formData.discount_type === 'percentage' ? '(%)' : '(R$)'} *
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="min_order_value">Pedido Mínimo (R$)</Label>
                    <Input
                      id="min_order_value"
                      type="number"
                      step="0.01"
                      value={formData.min_order_value}
                      onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="max_uses">Usos Máximos</Label>
                    <Input
                      id="max_uses"
                      type="number"
                      value={formData.max_uses}
                      onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                      placeholder="Ilimitado"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="valid_from">Válido de *</Label>
                    <Input
                      id="valid_from"
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="valid_until">Válido até</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      min={formData.valid_from}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Cupom aplica-se a</Label>
                  <Select
                    value={formData.applies_to}
                    onValueChange={(value: 'all' | 'category' | 'product') => setFormData({ 
                      ...formData, 
                      applies_to: value,
                      category_names: [],
                      product_ids: []
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os produtos</SelectItem>
                      <SelectItem value="category">Por Categoria</SelectItem>
                      <SelectItem value="product">Por Produto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.applies_to === 'category' && (
                  <div className="space-y-2">
                    <Label>Categorias ({formData.category_names.length} selecionadas)</Label>
                    {formData.category_names.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {formData.category_names.map((categoryName) => (
                          <Badge key={categoryName} variant="secondary" className="flex items-center gap-1">
                            {categoryName}
                            <XCircle 
                              className="h-3 w-3 cursor-pointer hover:text-destructive" 
                              onClick={() => setFormData({
                                ...formData,
                                category_names: formData.category_names.filter(c => c !== categoryName)
                              })}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar categoria..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <ScrollArea className="h-32 border rounded-md p-2">
                      <div className="space-y-2">
                        {filteredCategories.map((category) => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`cat-${category.id}`}
                              checked={formData.category_names.includes(category.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    category_names: [...formData.category_names, category.name]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    category_names: formData.category_names.filter(c => c !== category.name)
                                  });
                                }
                              }}
                              className="rounded border-input"
                            />
                            <Label htmlFor={`cat-${category.id}`} className="text-sm font-normal cursor-pointer">
                              {category.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {formData.applies_to === 'product' && (
                  <div className="space-y-2">
                    <Label>Produtos ({formData.product_ids.length} selecionados)</Label>
                    {formData.product_ids.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {formData.product_ids.map((productId) => {
                          const product = products.find(p => p.id === productId);
                          return (
                            <Badge key={productId} variant="secondary" className="flex items-center gap-1">
                              {product?.name || productId}
                              <XCircle 
                                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                onClick={() => setFormData({
                                  ...formData,
                                  product_ids: formData.product_ids.filter(p => p !== productId)
                                })}
                              />
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar produto..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <ScrollArea className="h-32 border rounded-md p-2">
                      <div className="space-y-2">
                        {filteredProducts.map((product) => (
                          <div key={product.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`prod-${product.id}`}
                              checked={formData.product_ids.includes(product.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    product_ids: [...formData.product_ids, product.id]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    product_ids: formData.product_ids.filter(p => p !== product.id)
                                  });
                                }
                              }}
                              className="rounded border-input"
                            />
                            <Label htmlFor={`prod-${product.id}`} className="text-sm font-normal cursor-pointer">
                              {product.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Cupom ativo</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCoupon ? 'Salvar Alterações' : 'Criar Cupom'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {coupons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              Você ainda não criou nenhum cupom de desconto
            </p>
            {canCreate && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Cupom
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon, index) => (
            <motion.div
              key={coupon.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={!coupon.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg font-mono">{coupon.code}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(coupon.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(coupon)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O cupom {coupon.code} será permanentemente removido.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCoupon(coupon.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                      {coupon.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="outline">
                      {formatDiscount(coupon.discount_type, coupon.discount_value)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Pedido mínimo: R$ {coupon.min_order_value.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      Usos: {coupon.used_count}
                      {coupon.max_uses ? ` / ${coupon.max_uses}` : ' (ilimitado)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(coupon.valid_from)} até{' '}
                      {coupon.valid_until ? formatDate(coupon.valid_until) : 'Sem data limite'}
                    </span>
                  </div>
                  <div className="pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status</span>
                      {canToggleStatus ? (
                        <Switch
                          checked={coupon.is_active}
                          onCheckedChange={(checked) => toggleCouponStatus(coupon.id, checked)}
                        />
                      ) : (
                        <Badge variant={coupon.is_active ? 'default' : 'secondary'} className="text-xs">
                          {coupon.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
        </TabsContent>

        <TabsContent value="report">
          <CouponsReport storeId={storeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
