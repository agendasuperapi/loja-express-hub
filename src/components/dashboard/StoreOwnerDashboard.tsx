import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useStoreManagement } from "@/hooks/useStoreManagement";
import { useProductManagement } from "@/hooks/useProductManagement";
import { useStoreOrders } from "@/hooks/useStoreOrders";
import { useCategories } from "@/hooks/useCategories";
import { Store, Package, ShoppingBag, Plus, Edit, Trash2, Settings, Clock, Search, Tag, X, Copy, Check, Pizza, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProductAddonsManager } from "./ProductAddonsManager";
import { ProductFlavorsManager } from "./ProductFlavorsManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { format, isToday, isThisWeek, isThisMonth, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { ImageUpload } from "./ImageUpload";
import { OperatingHoursManager } from "./OperatingHoursManager";
import { isStoreOpen, getStoreStatusText } from "@/lib/storeUtils";
import { WhatsAppIntegration } from "./WhatsAppIntegration";

export const StoreOwnerDashboard = () => {
  const navigate = useNavigate();
  const { myStore, isLoading, updateStore } = useStoreManagement();
  const { products, createProduct, updateProduct, deleteProduct } = useProductManagement(myStore?.id);
  const { orders, updateOrderStatus } = useStoreOrders(myStore?.id);
  const { categories, addCategory, deleteCategory } = useCategories(myStore?.id);

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: '',
    price: 0,
    promotional_price: 0,
    is_available: true,
    image_url: '',
    is_pizza: false,
    max_flavors: 2,
  });

  const [storeForm, setStoreForm] = useState({
    name: myStore?.name || '',
    logo_url: myStore?.logo_url || '',
    banner_url: myStore?.banner_url || '',
    description: myStore?.description || '',
    delivery_fee: myStore?.delivery_fee || 0,
    address: myStore?.address || '',
  });

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (myStore) {
      setStoreForm({
        name: myStore.name,
        logo_url: myStore.logo_url || '',
        banner_url: myStore.banner_url || '',
        description: myStore.description || '',
        delivery_fee: myStore.delivery_fee || 0,
        address: myStore.address || '',
      });
    }
  }, [myStore]);

  const handleCreateProduct = () => {
    if (!myStore) return;
    
    createProduct({
      ...productForm,
      store_id: myStore.id,
      promotional_price: productForm.promotional_price || undefined,
      image_url: productForm.image_url || undefined,
    }, {
      onSuccess: () => {
        setIsProductDialogOpen(false);
        setProductForm({
          name: '',
          description: '',
          category: '',
          price: 0,
          promotional_price: 0,
          is_available: true,
          image_url: '',
          is_pizza: false,
          max_flavors: 2,
        });
      },
    });
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price,
      promotional_price: product.promotional_price || 0,
      is_available: product.is_available,
      image_url: product.image_url || '',
      is_pizza: product.is_pizza || false,
      max_flavors: product.max_flavors || 2,
    });
    setIsProductDialogOpen(true);
  };

  const handleUpdateProduct = () => {
    if (!editingProduct) return;

    updateProduct({
      ...productForm,
      id: editingProduct.id,
      promotional_price: productForm.promotional_price || undefined,
      image_url: productForm.image_url || undefined,
    }, {
      onSuccess: () => {
        setIsProductDialogOpen(false);
        setEditingProduct(null);
        setProductForm({
          name: '',
          description: '',
          category: '',
          price: 0,
          promotional_price: 0,
          is_available: true,
          image_url: '',
          is_pizza: false,
          max_flavors: 2,
        });
      },
    });
  };

  const handleUpdateStore = () => {
    if (!myStore) return;
    updateStore({
      id: myStore.id,
      name: storeForm.name,
      slug: myStore.slug,
      category: myStore.category,
      logo_url: storeForm.logo_url,
      banner_url: storeForm.banner_url,
      description: storeForm.description,
      delivery_fee: storeForm.delivery_fee,
      address: storeForm.address,
    });
  };

  const handleSaveOperatingHours = async (hours: any) => {
    if (!myStore?.id) return;
    
    await updateStore({
      id: myStore.id,
      name: myStore.name,
      slug: myStore.slug,
      category: myStore.category,
      operating_hours: hours as any,
    });
    
    setIsHoursDialogOpen(false);
  };

  const storeUrl = myStore ? `${window.location.origin}/${myStore.slug}` : '';

  const handleCopyUrl = async () => {
    if (storeUrl) {
      await navigator.clipboard.writeText(storeUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!myStore) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto text-center"
      >
        <Card>
          <CardContent className="py-12">
            <Store className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">Você ainda não tem uma loja</h2>
            <p className="text-muted-foreground mb-6">
              Crie sua loja agora e comece a vender na plataforma
            </p>
            <Button 
              onClick={() => navigate('/become-partner')}
              className="bg-gradient-primary"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Criar Minha Loja
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending_approval: { label: 'Aguardando Aprovação', color: 'bg-yellow-500' },
    active: { label: 'Ativa', color: 'bg-green-500' },
    inactive: { label: 'Inativa', color: 'bg-gray-500' },
  };

  const storeStatus = statusConfig[myStore.status] || statusConfig.pending_approval;

  const storeIsOpen = myStore ? isStoreOpen(myStore.operating_hours) : false;
  const storeStatusText = myStore ? getStoreStatusText(myStore.operating_hours) : '';

  const filterOrdersByDate = (orders: any[] | undefined) => {
    if (!orders) return [];
    
    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      
      switch (dateFilter) {
        case 'daily':
          return isToday(orderDate);
        case 'weekly':
          return isThisWeek(orderDate, { weekStartsOn: 0 });
        case 'monthly':
          return isThisMonth(orderDate);
        case 'custom':
          if (!customDate) return true;
          return isWithinInterval(orderDate, {
            start: startOfDay(customDate),
            end: endOfDay(customDate)
          });
        default:
          return true;
      }
    });
  };

  const filteredOrdersByDate = filterOrdersByDate(orders);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Store Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-primary/30 shadow-lg overflow-hidden relative bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <motion.h2 
                    className="text-3xl font-bold gradient-text"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {myStore.name}
                  </motion.h2>
                  <Badge 
                    className={`${
                      storeIsOpen 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-red-500 hover:bg-red-600'
                    } text-white px-3 py-1`}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {storeStatusText}
                  </Badge>
                </div>
                <motion.p
                  className="text-muted-foreground text-lg"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {myStore.category}
                </motion.p>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <Badge className={`${storeStatus.color} text-white text-sm px-4 py-1.5`}>
                  {storeStatus.label}
                </Badge>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50">
            <TabsTrigger value="products" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              <Package className="w-4 h-4 mr-2" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </TabsTrigger>
          </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Meus Produtos</h3>
              <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingProduct(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Produto
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>
                    {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                  </DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="flex-1 h-0 -mx-6 px-6">
                  <div className="pr-4 space-y-4">
                    <Tabs defaultValue="info" className="w-full">
                      <TabsList className={`grid w-full ${productForm.is_pizza ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        <TabsTrigger value="info">Informações</TabsTrigger>
                        {productForm.is_pizza && (
                          <TabsTrigger value="flavors" disabled={!editingProduct}>
                            Sabores {!editingProduct && <span className="text-xs ml-1">(salve primeiro)</span>}
                          </TabsTrigger>
                        )}
                        <TabsTrigger value="addons" disabled={!editingProduct}>
                          Adicionais {!editingProduct && <span className="text-xs ml-1">(salve primeiro)</span>}
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="info" className="space-y-4 mt-4">
                  
                    <ImageUpload
                      bucket="product-images"
                      folder="temp"
                      productId={editingProduct?.id}
                      currentImageUrl={productForm.image_url}
                      onUploadComplete={(url) => setProductForm({ ...productForm, image_url: url })}
                      label="Imagem do Produto"
                      aspectRatio="aspect-video"
                    />
                    <div>
                      <Label>Nome *</Label>
                      <Input
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Categoria *</Label>
                      <div className="flex gap-2">
                        <Select 
                          value={productForm.category} 
                          onValueChange={(value) => setProductForm({ ...productForm, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Nova Categoria</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Nome da Categoria</Label>
                                <Input
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                  placeholder="Ex: Hambúrgueres, Bebidas..."
                                />
                              </div>
                              <Button
                                onClick={async () => {
                                  if (newCategoryName.trim()) {
                                    await addCategory(newCategoryName.trim());
                                    setNewCategoryName('');
                                    setIsCategoryDialogOpen(false);
                                  }
                                }}
                                className="w-full"
                              >
                                Adicionar Categoria
                              </Button>
                              
                              {categories.length > 0 && (
                                <>
                                  <Separator />
                                  <div>
                                    <Label className="text-sm font-semibold mb-2 block">Categorias Cadastradas</Label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                      {categories.map((cat) => (
                                        <div key={cat.id} className="flex items-center justify-between p-2 rounded-md bg-muted">
                                          <span className="text-sm">{cat.name}</span>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => deleteCategory(cat.id)}
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Preço *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={productForm.price}
                          onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Preço Promocional</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={productForm.promotional_price}
                          onChange={(e) => setProductForm({ ...productForm, promotional_price: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                    <Separator />
                    
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Pizza className="w-4 h-4" />
                            <Label>Este produto permite múltiplos sabores (Pizza)</Label>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Ative para permitir que clientes escolham mais de um sabor
                          </p>
                        </div>
                        <Switch
                          checked={productForm.is_pizza}
                          onCheckedChange={(checked) => setProductForm({ ...productForm, is_pizza: checked })}
                        />
                      </div>

                      {productForm.is_pizza && (
                        <div>
                          <Label>Número máximo de sabores</Label>
                          <Input
                            type="number"
                            min="1"
                            max="4"
                            value={productForm.max_flavors}
                            onChange={(e) => setProductForm({ ...productForm, max_flavors: parseInt(e.target.value) || 2 })}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Define quantos sabores o cliente pode escolher (ex: 2 para meio a meio)
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={productForm.is_available}
                        onCheckedChange={(checked) => setProductForm({ ...productForm, is_available: checked })}
                      />
                      <Label>Disponível</Label>
                    </div>
                  </TabsContent>

                  {productForm.is_pizza && (
                    <TabsContent value="flavors" className="mt-4">
                      {editingProduct && (
                        <ProductFlavorsManager productId={editingProduct.id} />
                      )}
                    </TabsContent>
                  )}

                      <TabsContent value="addons" className="mt-4">
                        {editingProduct && (
                          <ProductAddonsManager productId={editingProduct.id} />
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </ScrollArea>
                
                {/* Botão Salvar fixo no rodapé */}
                <div className="flex-shrink-0 pt-4 border-t mt-4">
                  <Button
                    onClick={editingProduct ? handleUpdateProduct : handleCreateProduct}
                    className="w-full"
                  >
                    {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryFilter !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCategoryFilter('all')}
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products
              ?.filter(product => categoryFilter === 'all' || product.category === categoryFilter)
              .map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover-scale border-muted/50 hover:border-primary/30 transition-all hover:shadow-lg">
                  <CardContent className="p-4">
                    {product.image_url && (
                      <div className="aspect-video w-full rounded-lg overflow-hidden mb-3 bg-muted">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                      </div>
                      <Badge variant={product.is_available ? 'default' : 'secondary'}>
                        {product.is_available ? 'Disponível' : 'Indisponível'}
                      </Badge>
                    </div>
                    {product.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-primary text-lg">
                        R$ {Number(product.price).toFixed(2)}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditProduct(product)}
                          className="hover-scale"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteProduct(product.id)}
                          className="hover-scale hover:border-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Pedidos Recebidos</h3>
          </div>

          {/* Date Filter */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium mr-2">Período:</span>
                <Button
                  variant={dateFilter === 'daily' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter('daily')}
                >
                  Diário
                </Button>
                <Button
                  variant={dateFilter === 'weekly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter('weekly')}
                >
                  Semanal
                </Button>
                <Button
                  variant={dateFilter === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter('monthly')}
                >
                  Mensal
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={dateFilter === 'custom' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDateFilter('custom')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFilter === 'custom' && customDate
                        ? format(customDate, "dd/MM/yyyy")
                        : 'Personalizado'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDate}
                      onSelect={(date) => {
                        setCustomDate(date);
                        setDateFilter('custom');
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="all" className="w-full" onValueChange={setOrderStatusFilter}>
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 bg-muted/50">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmados</TabsTrigger>
              <TabsTrigger value="preparing">Preparando</TabsTrigger>
              <TabsTrigger value="ready">Prontos</TabsTrigger>
              <TabsTrigger value="in_delivery">Em Entrega</TabsTrigger>
              <TabsTrigger value="delivered">Entregues</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
            </TabsList>

            <TabsContent value={orderStatusFilter} className="mt-4">
              {filteredOrdersByDate.filter(order => orderStatusFilter === 'all' || order.status === orderStatusFilter).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      {orderStatusFilter === 'all' 
                        ? 'Nenhum pedido recebido ainda' 
                        : `Nenhum pedido ${
                            orderStatusFilter === 'pending' ? 'pendente' :
                            orderStatusFilter === 'confirmed' ? 'confirmado' :
                            orderStatusFilter === 'preparing' ? 'em preparo' :
                            orderStatusFilter === 'ready' ? 'pronto' :
                            orderStatusFilter === 'in_delivery' ? 'em entrega' :
                            orderStatusFilter === 'delivered' ? 'entregue' :
                            orderStatusFilter === 'cancelled' ? 'cancelado' : ''
                          }`
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredOrdersByDate.filter(order => orderStatusFilter === 'all' || order.status === orderStatusFilter).map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover-scale border-muted/50 hover:border-primary/20 transition-all hover:shadow-md">
                    <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg">{order.order_number}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Select
                        value={order.status}
                        onValueChange={(value: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'in_delivery' | 'delivered' | 'cancelled') => 
                          updateOrderStatus({ orderId: order.id, status: value })
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="confirmed">Confirmado</SelectItem>
                          <SelectItem value="preparing">Preparando</SelectItem>
                          <SelectItem value="ready">Pronto</SelectItem>
                          <SelectItem value="in_delivery">Em entrega</SelectItem>
                          <SelectItem value="delivered">Entregue</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-2">
                      <p className="font-medium">Cliente: {order.customer_name}</p>
                      <p className="text-sm">Telefone: {order.customer_phone}</p>
                      {order.delivery_type === 'pickup' ? (
                        <p className="text-sm font-medium flex items-center gap-2 text-primary">
                          <Store className="w-4 h-4" />
                          Retirar na loja
                        </p>
                      ) : (
                        <>
                          <p className="text-sm">
                            Endereço: {order.delivery_street}, {order.delivery_number}
                            {order.delivery_complement && ` - ${order.delivery_complement}`}
                          </p>
                          <p className="text-sm">Bairro: {order.delivery_neighborhood}</p>
                        </>
                      )}
                      <p className="text-sm font-medium mt-2">
                        Pagamento: {order.payment_method === 'pix' && 'PIX'}
                        {order.payment_method === 'dinheiro' && 'Dinheiro'}
                        {order.payment_method === 'cartao' && 'Cartão'}
                      </p>
                      {order.payment_method === 'dinheiro' && order.change_amount && (
                        <p className="text-sm">
                          Troco para: R$ {Number(order.change_amount).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-2">
                      {order.order_items?.map((item: any) => (
                        <div key={item.id}>
                          <div className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.product_name}</span>
                            <span>R$ {Number(item.subtotal).toFixed(2)}</span>
                          </div>
                          {item.order_item_addons && item.order_item_addons.length > 0 && (
                            <div className="pl-4 text-xs text-muted-foreground">
                              {item.order_item_addons.map((addon: any) => (
                                <div key={addon.id}>+ {addon.addon_name} (R$ {Number(addon.addon_price).toFixed(2)})</div>
                              ))}
                            </div>
                          )}
                          {item.observation && (
                            <div className="pl-4 text-xs text-muted-foreground italic">Obs: {item.observation}</div>
                          )}
                        </div>
                      ))}
                    </div>

                    <Separator className="my-4" />

                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary">R$ {Number(order.total).toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <WhatsAppIntegration storeId={myStore.id} />
          </motion.div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          {/* Store URL Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-muted/50 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Store className="h-5 w-5" />
                  URL da Loja
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Input 
                    value={storeUrl} 
                    readOnly 
                    className="flex-1 font-mono text-sm bg-muted/50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyUrl}
                    className="shrink-0"
                  >
                    {copiedUrl ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {copiedUrl && (
                  <p className="text-sm text-green-500 mt-2">URL copiada!</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Store Settings Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-muted/50 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações da Loja
                </CardTitle>
              </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Nome da Loja *</Label>
                <Input
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={storeForm.description}
                  onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                  placeholder="Descreva sua loja..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Taxa de Entrega (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={storeForm.delivery_fee}
                  onChange={(e) => setStoreForm({ ...storeForm, delivery_fee: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label>Endereço</Label>
                <Input
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  placeholder="Rua, número, bairro, cidade..."
                />
              </div>

              <ImageUpload
                bucket="store-logos"
                folder={myStore?.id || ''}
                currentImageUrl={storeForm.logo_url}
                onUploadComplete={(url) => setStoreForm({ ...storeForm, logo_url: url })}
                label="Logo da Loja"
                aspectRatio="aspect-square"
              />

              <ImageUpload
                bucket="store-banners"
                folder={myStore?.id || ''}
                currentImageUrl={storeForm.banner_url}
                onUploadComplete={(url) => setStoreForm({ ...storeForm, banner_url: url })}
                label="Banner da Loja"
                aspectRatio="aspect-[21/9]"
              />

              <Separator className="my-6" />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Horários de Funcionamento
                </h3>
                
                <Dialog open={isHoursDialogOpen} onOpenChange={setIsHoursDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg" className="w-full flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Gerenciar Horários de Funcionamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Horários de Funcionamento</DialogTitle>
                    </DialogHeader>
                    <OperatingHoursManager 
                      initialHours={(myStore?.operating_hours as any) || {
                        monday: { open: "08:00", close: "18:00", is_closed: false },
                        tuesday: { open: "08:00", close: "18:00", is_closed: false },
                        wednesday: { open: "08:00", close: "18:00", is_closed: false },
                        thursday: { open: "08:00", close: "18:00", is_closed: false },
                        friday: { open: "08:00", close: "18:00", is_closed: false },
                        saturday: { open: "08:00", close: "14:00", is_closed: false },
                        sunday: { open: "08:00", close: "12:00", is_closed: true }
                      }}
                      onSave={handleSaveOperatingHours}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <Separator className="my-6" />

              <Button
                onClick={handleUpdateStore} 
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
      </motion.div>
    </motion.div>
  );
};
