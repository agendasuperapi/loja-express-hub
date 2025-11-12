import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
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
import { Store, Package, ShoppingBag, Plus, Edit, Trash2, Settings, Clock, Search, Tag, X, Copy, Check, Pizza, MessageSquare, Menu, TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, ArrowUp, ArrowDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProductAddonsManager } from "./ProductAddonsManager";
import { ProductFlavorsManager } from "./ProductFlavorsManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { format, isToday, isThisWeek, isThisMonth, startOfDay, endOfDay, isWithinInterval, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ImageUpload } from "./ImageUpload";
import { OperatingHoursManager } from "./OperatingHoursManager";
import { isStoreOpen, getStoreStatusText } from "@/lib/storeUtils";
import { WhatsAppIntegration } from "./WhatsAppIntegration";
import { DashboardSidebar } from "./DashboardSidebar";
import { CircularProgress } from "./CircularProgress";
import { DataCard } from "./DataCard";
import { BarChartCard } from "./BarChartCard";
import { MiniChart } from "./MiniChart";
import { OrderStatusManager } from "./OrderStatusManager";
import { useOrderStatusNotification } from "@/hooks/useOrderStatusNotification";
import { useOrderStatuses } from "@/hooks/useOrderStatuses";
import { cn } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { MetricsComparison } from "./MetricsComparison";

export const StoreOwnerDashboard = () => {
  const navigate = useNavigate();
  const { myStore, isLoading, updateStore } = useStoreManagement();
  const { products, createProduct, updateProduct, deleteProduct } = useProductManagement(myStore?.id);
  const { orders, updateOrderStatus } = useStoreOrders(myStore?.id);
  const { categories, addCategory, deleteCategory } = useCategories(myStore?.id);
  
  // Enable automatic WhatsApp notifications
  useOrderStatusNotification(myStore?.id);
  
  // Load custom order statuses
  const { statuses: customStatuses } = useOrderStatuses(myStore?.id);

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
    pickup_address: myStore?.pickup_address || '',
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
  const [activeTab, setActiveTab] = useState('home');
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  useEffect(() => {
    if (myStore) {
      setStoreForm({
        name: myStore.name,
        logo_url: myStore.logo_url || '',
        banner_url: myStore.banner_url || '',
        description: myStore.description || '',
        delivery_fee: myStore.delivery_fee || 0,
        address: myStore.address || '',
        pickup_address: myStore.pickup_address || '',
      });
    }
  }, [myStore]);

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending_approval: { label: 'Aguardando Aprovação', color: 'bg-yellow-500' },
    active: { label: 'Ativa', color: 'bg-green-500' },
    inactive: { label: 'Inativa', color: 'bg-gray-500' },
  };

  const storeStatus = statusConfig[myStore?.status || 'pending_approval'] || statusConfig.pending_approval;

  const storeIsOpen = myStore ? isStoreOpen(myStore.operating_hours) : false;
  const storeStatusText = myStore ? getStoreStatusText(myStore.operating_hours) : '';

  // Filter orders based on period
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (periodFilter) {
      case "today":
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case "week":
        startDate = startOfWeek(now, { locale: ptBR });
        endDate = endOfWeek(now, { locale: ptBR });
        break;
      case "month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "7days":
        startDate = subDays(now, 7);
        break;
      case "30days":
        startDate = subDays(now, 30);
        break;
      case "custom":
        if (customDateRange.from && customDateRange.to) {
          startDate = startOfDay(customDateRange.from);
          endDate = endOfDay(customDateRange.to);
        } else {
          return orders;
        }
        break;
      default:
        return orders;
    }

    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return isWithinInterval(orderDate, { start: startDate, end: endDate });
    });
  }, [orders, periodFilter, customDateRange]);

  // Calculate previous period for comparison
  const previousPeriodOrders = useMemo(() => {
    if (!orders || periodFilter === "all") return [];
    
    const now = new Date();
    let currentStartDate: Date;
    let currentEndDate: Date = now;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (periodFilter) {
      case "today":
        currentStartDate = startOfDay(now);
        currentEndDate = endOfDay(now);
        previousStartDate = startOfDay(subDays(now, 1));
        previousEndDate = endOfDay(subDays(now, 1));
        break;
      case "week":
        currentStartDate = startOfWeek(now, { locale: ptBR });
        currentEndDate = endOfWeek(now, { locale: ptBR });
        previousStartDate = startOfWeek(subDays(currentStartDate, 7), { locale: ptBR });
        previousEndDate = endOfWeek(subDays(currentStartDate, 7), { locale: ptBR });
        break;
      case "month":
        currentStartDate = startOfMonth(now);
        currentEndDate = endOfMonth(now);
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousStartDate = startOfMonth(previousMonth);
        previousEndDate = endOfMonth(previousMonth);
        break;
      case "7days":
        currentStartDate = subDays(now, 7);
        currentEndDate = now;
        previousStartDate = subDays(now, 14);
        previousEndDate = subDays(now, 7);
        break;
      case "30days":
        currentStartDate = subDays(now, 30);
        currentEndDate = now;
        previousStartDate = subDays(now, 60);
        previousEndDate = subDays(now, 30);
        break;
      case "custom":
        if (customDateRange.from && customDateRange.to) {
          currentStartDate = startOfDay(customDateRange.from);
          currentEndDate = endOfDay(customDateRange.to);
          const daysDiff = Math.ceil((currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24));
          previousStartDate = subDays(currentStartDate, daysDiff + 1);
          previousEndDate = subDays(currentStartDate, 1);
        } else {
          return [];
        }
        break;
      default:
        return [];
    }

    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return isWithinInterval(orderDate, { start: previousStartDate, end: previousEndDate });
    });
  }, [orders, periodFilter, customDateRange]);

  // Calculate metrics
  const totalOrders = filteredOrders?.length || 0;
  const totalRevenue = filteredOrders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const completedOrders = filteredOrders?.filter(o => o.status === 'delivered').length || 0;
  const pendingOrders = filteredOrders?.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length || 0;

  // Calculate previous period metrics
  const previousTotalOrders = previousPeriodOrders?.length || 0;
  const previousTotalRevenue = previousPeriodOrders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
  const previousAverageOrderValue = previousTotalOrders > 0 ? previousTotalRevenue / previousTotalOrders : 0;
  const previousCompletedOrders = previousPeriodOrders?.filter(o => o.status === 'delivered').length || 0;

  // Calculate percentage changes
  const ordersChange = previousTotalOrders > 0 ? ((totalOrders - previousTotalOrders) / previousTotalOrders) * 100 : 0;
  const revenueChange = previousTotalRevenue > 0 ? ((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100 : 0;
  const averageOrderValueChange = previousAverageOrderValue > 0 ? ((averageOrderValue - previousAverageOrderValue) / previousAverageOrderValue) * 100 : 0;
  const completedOrdersChange = previousCompletedOrders > 0 ? ((completedOrders - previousCompletedOrders) / previousCompletedOrders) * 100 : 0;

  // Orders by status
  const ordersByStatus = useMemo(() => {
    const statusCount: Record<string, number> = {};
    filteredOrders?.forEach(order => {
      statusCount[order.status] = (statusCount[order.status] || 0) + 1;
    });
    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // Orders over time
  const ordersOverTime = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) return [];

    const ordersByDate: Record<string, { date: string; pedidos: number; valor: number }> = {};
    
    filteredOrders.forEach(order => {
      const date = format(new Date(order.created_at), "dd/MM", { locale: ptBR });
      if (!ordersByDate[date]) {
        ordersByDate[date] = { date, pedidos: 0, valor: 0 };
      }
      ordersByDate[date].pedidos += 1;
      ordersByDate[date].valor += Number(order.total);
    });

    return Object.values(ordersByDate).sort((a, b) => {
      const [dayA, monthA] = a.date.split('/').map(Number);
      const [dayB, monthB] = b.date.split('/').map(Number);
      return monthA === monthB ? dayA - dayB : monthA - monthB;
    });
  }, [filteredOrders]);

  // Payment methods distribution
  const paymentMethodsData = useMemo(() => {
    const methodCount: Record<string, number> = {};
    filteredOrders?.forEach(order => {
      methodCount[order.payment_method] = (methodCount[order.payment_method] || 0) + 1;
    });
    return Object.entries(methodCount).map(([name, value]) => ({ 
      name: name === 'pix' ? 'PIX' : name === 'dinheiro' ? 'Dinheiro' : 'Cartão', 
      value 
    }));
  }, [filteredOrders]);

  // Top products
  const topProducts = useMemo(() => {
    const productCount: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    filteredOrders?.forEach(order => {
      order.order_items?.forEach((item: any) => {
        if (!productCount[item.product_name]) {
          productCount[item.product_name] = { name: item.product_name, quantity: 0, revenue: 0 };
        }
        productCount[item.product_name].quantity += item.quantity;
        productCount[item.product_name].revenue += Number(item.subtotal);
      });
    });

    return Object.values(productCount)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredOrders]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

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

  const storeUrl = myStore ? `https://appofertas.lovable.app/${myStore.slug}` : '';

  const handleCopyUrl = async () => {
    if (storeUrl) {
      await navigator.clipboard.writeText(storeUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleCreateProduct = () => {
    if (!myStore) return;

    if (!productForm.category.trim()) {
      toast({
        title: 'Categoria obrigatória',
        description: 'Por favor, selecione uma categoria para o produto.',
        variant: 'destructive',
      });
      return;
    }
    
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

    if (!productForm.category.trim()) {
      toast({
        title: 'Categoria obrigatória',
        description: 'Por favor, selecione uma categoria para o produto.',
        variant: 'destructive',
      });
      return;
    }

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

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 ml-28">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card border-b border-border px-8 py-4 flex items-center justify-between shadow-sm"
        >
          <div>
            <h1 className="text-2xl font-bold text-orange-500">Dashboard Lojista</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-foreground font-medium">{myStore?.name || 'Lojista'}</span>
            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </motion.header>

        {activeTab === 'home' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 space-y-6"
          >
            {/* Period Filter */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between flex-wrap gap-4"
            >
              <div>
                <h2 className="text-2xl font-bold gradient-text">Estatísticas da Loja</h2>
                <p className="text-muted-foreground">Acompanhe o desempenho do seu negócio</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={periodFilter} onValueChange={(value) => {
                  if (value === "custom") {
                    setShowCustomDatePicker(true);
                  } else {
                    setPeriodFilter(value);
                  }
                }}>
                  <SelectTrigger className="w-[200px]">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Pedidos</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="7days">Últimos 7 Dias</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="30days">Últimos 30 Dias</SelectItem>
                    <SelectItem value="month">Este Mês</SelectItem>
                    <SelectItem value="custom">Data Personalizada</SelectItem>
                  </SelectContent>
                </Select>

                {periodFilter === "custom" && customDateRange.from && customDateRange.to && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomDatePicker(true)}
                    className="gap-2"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {format(customDateRange.from, "dd/MM/yy")} - {format(customDateRange.to, "dd/MM/yy")}
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Custom Date Range Dialog */}
            <Dialog open={showCustomDatePicker} onOpenChange={setShowCustomDatePicker}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Selecionar Período Personalizado</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data Inicial</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !customDateRange.from && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customDateRange.from ? format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customDateRange.from}
                            onSelect={(date) => setCustomDateRange(prev => ({ ...prev, from: date }))}
                            initialFocus
                            locale={ptBR}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data Final</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !customDateRange.to && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customDateRange.to ? format(customDateRange.to, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customDateRange.to}
                            onSelect={(date) => setCustomDateRange(prev => ({ ...prev, to: date }))}
                            initialFocus
                            locale={ptBR}
                            disabled={(date) => customDateRange.from ? date < customDateRange.from : false}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCustomDatePicker(false);
                        if (!customDateRange.from || !customDateRange.to) {
                          setPeriodFilter("all");
                        }
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        if (customDateRange.from && customDateRange.to) {
                          setPeriodFilter("custom");
                          setShowCustomDatePicker(false);
                        }
                      }}
                      disabled={!customDateRange.from || !customDateRange.to}
                    >
                      Aplicar Filtro
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="hover-scale overflow-hidden relative border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                    <ShoppingBag className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="flex items-end justify-between">
                      <div className="text-3xl font-bold gradient-text">{totalOrders}</div>
                      {periodFilter !== "all" && previousTotalOrders > 0 && (
                        <div className={cn(
                          "flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-md",
                          ordersChange >= 0 ? "text-green-600 bg-green-100 dark:bg-green-900/30" : "text-red-600 bg-red-100 dark:bg-red-900/30"
                        )}>
                          {ordersChange >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {Math.abs(ordersChange).toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pendingOrders} pendentes
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="hover-scale overflow-hidden relative border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="flex items-end justify-between gap-2">
                      <div className="text-3xl font-bold text-green-500">
                        R$ {totalRevenue.toFixed(2)}
                      </div>
                      {periodFilter !== "all" && previousTotalRevenue > 0 && (
                        <div className={cn(
                          "flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-md",
                          revenueChange >= 0 ? "text-green-600 bg-green-100 dark:bg-green-900/30" : "text-red-600 bg-red-100 dark:bg-red-900/30"
                        )}>
                          {revenueChange >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {Math.abs(revenueChange).toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      No período selecionado
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="hover-scale overflow-hidden relative border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="flex items-end justify-between gap-2">
                      <div className="text-3xl font-bold text-purple-500">
                        R$ {averageOrderValue.toFixed(2)}
                      </div>
                      {periodFilter !== "all" && previousAverageOrderValue > 0 && (
                        <div className={cn(
                          "flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-md",
                          averageOrderValueChange >= 0 ? "text-green-600 bg-green-100 dark:bg-green-900/30" : "text-red-600 bg-red-100 dark:bg-red-900/30"
                        )}>
                          {averageOrderValueChange >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {Math.abs(averageOrderValueChange).toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Valor médio por pedido
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="hover-scale overflow-hidden relative border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium">Pedidos Concluídos</CardTitle>
                    <Check className="h-5 w-5 text-blue-500" />
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="flex items-end justify-between">
                      <div className="text-3xl font-bold text-blue-500">{completedOrders}</div>
                      {periodFilter !== "all" && previousCompletedOrders > 0 && (
                        <div className={cn(
                          "flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-md",
                          completedOrdersChange >= 0 ? "text-green-600 bg-green-100 dark:bg-green-900/30" : "text-red-600 bg-red-100 dark:bg-red-900/30"
                        )}>
                          {completedOrdersChange >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {Math.abs(completedOrdersChange).toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Taxa: {totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0}%
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Charts Section */}
            {totalOrders > 0 && (
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Orders Over Time */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Card className="shadow-lg">
                      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          Pedidos ao Longo do Tempo
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={ordersOverTime}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="date" 
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                            />
                            <YAxis 
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                              labelStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="pedidos" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={3}
                              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                              name="Pedidos"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Revenue Over Time */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Card className="shadow-lg">
                      <CardHeader className="bg-gradient-to-r from-green-500/5 to-transparent">
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-green-500" />
                          Receita ao Longo do Tempo
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={ordersOverTime}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="date" 
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                            />
                            <YAxis 
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                              labelStyle={{ color: 'hsl(var(--foreground))' }}
                              formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                            />
                            <Bar 
                              dataKey="valor" 
                              fill="hsl(142 76% 36%)"
                              radius={[8, 8, 0, 0]}
                              name="Receita"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Payment Methods */}
                  {paymentMethodsData.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <Card className="shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-blue-500/5 to-transparent">
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-blue-500" />
                            Métodos de Pagamento
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={paymentMethodsData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={100}
                                fill="hsl(var(--primary))"
                                dataKey="value"
                              >
                                {paymentMethodsData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Top Products */}
                  {topProducts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      <Card className="shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-purple-500/5 to-transparent">
                          <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-purple-500" />
                            Produtos Mais Vendidos
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            {topProducts.map((product, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <Badge className="bg-primary text-primary-foreground">{index + 1}</Badge>
                                  <div>
                                    <p className="font-medium">{product.name}</p>
                                    <p className="text-sm text-muted-foreground">{product.quantity} unidades</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-green-500">R$ {product.revenue.toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </div>
              </>
            )}

            {totalOrders === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Nenhum pedido encontrado</h3>
                <p className="text-muted-foreground">
                  Não há pedidos no período selecionado
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'metricas' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8"
          >
            <MetricsComparison orders={orders} products={products} />
          </motion.div>
        )}

        {activeTab === 'result' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8 space-y-6"
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
                <TabsList className="grid w-full grid-cols-5 bg-muted/50">
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
                  <TabsTrigger value="status" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                    <Menu className="w-4 h-4 mr-2" />
                    Status
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
              {customStatuses.map((status) => (
                <TabsTrigger key={status.status_key} value={status.status_key}>
                  {status.status_label}
                </TabsTrigger>
              ))}
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
                        onValueChange={(value: string) => 
                          updateOrderStatus({ orderId: order.id, status: value })
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {customStatuses.map((status) => (
                            <SelectItem key={status.status_key} value={status.status_key}>
                              <span style={{ color: status.status_color }}>
                                {status.status_label}
                              </span>
                            </SelectItem>
                          ))}
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

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {myStore && <OrderStatusManager storeId={myStore.id} />}
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

              <div>
                <Label>Endereço para Retirada</Label>
                <Input
                  value={storeForm.pickup_address}
                  onChange={(e) => setStoreForm({ ...storeForm, pickup_address: e.target.value })}
                  placeholder="Endereço onde os clientes farão a retirada dos produtos..."
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
  )}
      </div>
    </div>
  );
};
