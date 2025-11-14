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
import { PhoneInput } from "@/components/ui/phone-input";
import { useStoreManagement } from "@/hooks/useStoreManagement";
import { useProductManagement } from "@/hooks/useProductManagement";
import { useStoreOrders } from "@/hooks/useStoreOrders";
import { useCategories } from "@/hooks/useCategories";
import { Store, Package, ShoppingBag, Plus, Edit, Trash2, Settings, Clock, Search, Tag, X, Copy, Check, Pizza, MessageSquare, Menu, TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, ArrowUp, ArrowDown, FolderTree, User, Lock, Edit2, Eye, Printer } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProductAddonsManager } from "./ProductAddonsManager";
import { ProductFlavorsManager } from "./ProductFlavorsManager";
import { EditOrderDialog } from "./EditOrderDialog";
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
import { WhatsAppStatusIndicator } from "./WhatsAppStatusIndicator";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardMobileSidebar } from "./DashboardMobileSidebar";
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
import { useQueryClient } from '@tanstack/react-query';
import { PersonalDataSettings } from "@/components/settings/PersonalDataSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { OwnerDataSettings } from "@/components/settings/OwnerDataSettings";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { CouponsManager } from "./CouponsManager";
import { EmployeesManager } from "./EmployeesManager";
import { useEmployeeAccess } from "@/hooks/useEmployeeAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { CustomersReport } from "./CustomersReport";
import { BestSellingProductsReport } from "./BestSellingProductsReport";
import { RegisteredProductsReport } from "./RegisteredProductsReport";
import { OrdersReport } from "./OrdersReport";
import { ReportsFilters } from "./ReportsFilters";
import { useDateRangeFilter } from "@/hooks/useDateRangeFilter";

export const StoreOwnerDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isStoreOwner } = useUserRole();
  const employeeAccess = useEmployeeAccess();
  const { myStore, isLoading, updateStore } = useStoreManagement();
  const { products, createProduct, updateProduct, deleteProduct } = useProductManagement(myStore?.id);
  const { orders, updateOrderStatus, updateOrder } = useStoreOrders(myStore?.id);
  
  // Debug de produtos
  console.log('[Produtos Debug]', {
    products,
    productsLength: products?.length,
    storeId: myStore?.id
  });

  // Função helper para verificar permissões
  const hasPermission = (module: string, action: string): boolean => {
    // Se não é funcionário (é dono), tem todas as permissões
    if (!employeeAccess.isEmployee || !employeeAccess.permissions) return true;
    
    const modulePermissions = (employeeAccess.permissions as any)[module];
    if (!modulePermissions) return false;
    
    return modulePermissions[action] === true;
  };

  // Derivados para filtros de pedidos
  const canViewAllOrders = hasPermission('orders', 'view_all_orders');
  const canViewPendingOrders = hasPermission('orders', 'view_pending_orders');
  const canViewConfirmedOrders = hasPermission('orders', 'view_confirmed_orders');
  const canViewPreparingOrders = hasPermission('orders', 'view_preparing_orders');
  const canViewOutForDeliveryOrders = hasPermission('orders', 'view_out_for_delivery_orders');
  const canViewDeliveredOrders = hasPermission('orders', 'view_delivered_orders');
  const canViewCancelledOrders = hasPermission('orders', 'view_cancelled_orders');

  // Debug de permissões
  console.log('[Permissões de Pedidos]', {
    isEmployee: employeeAccess.isEmployee,
    canViewAllOrders,
    canViewPendingOrders,
    canViewConfirmedOrders,
    canViewPreparingOrders,
    canViewOutForDeliveryOrders,
    canViewDeliveredOrders,
    canViewCancelledOrders,
    permissions: employeeAccess.permissions
  });

  // Helpers para mudança de status conforme permissões
  const canChangeTo = (statusKey: string) => {
    if (hasPermission('orders', 'change_any_status')) return true;
    const map: Record<string, string> = {
      confirmed: 'change_status_confirmed',
      preparing: 'change_status_preparing',
      in_delivery: 'change_status_out_for_delivery',
      out_for_delivery: 'change_status_out_for_delivery',
      delivered: 'change_status_delivered',
      cancelled: 'change_status_cancelled',
      ready: 'change_status_preparing', // aproximação: pronto ~ preparar concluído
    };
    const perm = map[statusKey];
    return perm ? hasPermission('orders', perm) : false;
  };

  const { categories, addCategory, updateCategory, toggleCategoryStatus, deleteCategory } = useCategories(myStore?.id);
  
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
    category: myStore?.category || 'Outros',
    delivery_fee: myStore?.delivery_fee || 0,
    min_order_value: myStore?.min_order_value || 0,
    avg_delivery_time: myStore?.avg_delivery_time || 30,
    accepts_delivery: myStore?.accepts_delivery ?? true,
    accepts_pickup: myStore?.accepts_pickup ?? true,
    accepts_pix: myStore?.accepts_pix ?? true,
    accepts_card: myStore?.accepts_card ?? true,
    accepts_cash: myStore?.accepts_cash ?? true,
    address: myStore?.address || '',
    pickup_address: myStore?.pickup_address || '',
    phone: myStore?.phone || '',
  });

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [categoryStatusFilter, setCategoryStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());
  const [currentOrderPage, setCurrentOrderPage] = useState(1);
  const ordersPerPage = 10;
  const [currentHomeOrderPage, setCurrentHomeOrderPage] = useState(1);
  const homeOrdersPerPage = 10;
  const [activeTab, setActiveTab] = useState('home');
  const { 
    periodFilter: reportsPeriodFilter, 
    setPeriodFilter: setReportsPeriodFilter,
    customDateRange: reportsCustomDateRange,
    setCustomDateRange: setReportsCustomDateRange,
    dateRange: reportsDateRange 
  } = useDateRangeFilter();
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [statsStatusFilter, setStatsStatusFilter] = useState<string>("all");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isEditOrderDialogOpen, setIsEditOrderDialogOpen] = useState(false);
  const [editDialogInitialTab, setEditDialogInitialTab] = useState<string>("items");
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [isViewOrderDialogOpen, setIsViewOrderDialogOpen] = useState(false);

  // Ajustar filtro padrão baseado em permissões
  useEffect(() => {
    if (employeeAccess.isEmployee && employeeAccess.permissions) {
      console.log('[Ajustando Filtro]', {
        orderStatusFilter,
        canViewAllOrders,
        canViewPendingOrders
      });
      
      if (orderStatusFilter === 'all' && !canViewAllOrders) {
        // Se não pode ver "todos", definir para o primeiro status permitido
        if (canViewPendingOrders) {
          console.log('[Ajustando Filtro] Mudando para pending');
          setOrderStatusFilter('pending');
        } else if (canViewConfirmedOrders) {
          setOrderStatusFilter('confirmed');
        } else if (canViewPreparingOrders) {
          setOrderStatusFilter('preparing');
        } else if (canViewOutForDeliveryOrders && customStatuses.find(s => s.status_key === 'out_for_delivery')) {
          setOrderStatusFilter('out_for_delivery');
        } else if (canViewDeliveredOrders) {
          setOrderStatusFilter('delivered');
        } else if (canViewCancelledOrders) {
          setOrderStatusFilter('cancelled');
        } else if (customStatuses.length > 0) {
          console.log('[Ajustando Filtro] Mudando para primeiro status customizado');
          setOrderStatusFilter(customStatuses[0].status_key);
        }
      }
    }
  }, [employeeAccess.isEmployee, employeeAccess.permissions, canViewAllOrders, canViewPendingOrders, canViewConfirmedOrders, canViewPreparingOrders, canViewOutForDeliveryOrders, canViewDeliveredOrders, canViewCancelledOrders, customStatuses, orderStatusFilter]);

  useEffect(() => {
    if (myStore) {
      setStoreForm({
        name: myStore.name,
        logo_url: myStore.logo_url || '',
        banner_url: myStore.banner_url || '',
        description: myStore.description || '',
        category: myStore.category || 'Outros',
        delivery_fee: myStore.delivery_fee || 0,
        min_order_value: myStore.min_order_value || 0,
        avg_delivery_time: myStore.avg_delivery_time || 30,
        accepts_delivery: myStore.accepts_delivery ?? true,
        accepts_pickup: myStore.accepts_pickup ?? true,
        accepts_pix: myStore.accepts_pix ?? true,
        accepts_card: myStore.accepts_card ?? true,
        accepts_cash: myStore.accepts_cash ?? true,
        address: myStore.address || '',
        pickup_address: myStore.pickup_address || '',
        phone: myStore.phone || '',
      });
    }
  }, [myStore]);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentOrderPage(1);
  }, [orderStatusFilter, dateFilter, customDateRange, orderSearchTerm]);

  // Reset home page when period filter changes
  useEffect(() => {
    setCurrentHomeOrderPage(1);
  }, [periodFilter, customDateRange]);

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending_approval: { label: 'Aguardando Aprovação', color: 'bg-yellow-500' },
    active: { label: 'Ativa', color: 'bg-green-500' },
    inactive: { label: 'Inativa', color: 'bg-gray-500' },
  };

  const storeStatus = statusConfig[myStore?.status || 'pending_approval'] || statusConfig.pending_approval;

  const storeIsOpen = myStore ? isStoreOpen(myStore.operating_hours) : false;
  const storeStatusText = myStore ? getStoreStatusText(myStore.operating_hours) : '';

  // Filter orders based on period and status
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
        return orders.filter(order => 
          statsStatusFilter === "all" || order.status === statsStatusFilter
        );
    }

    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      const matchesDate = isWithinInterval(orderDate, { start: startDate, end: endDate });
      const matchesStatus = statsStatusFilter === "all" || order.status === statsStatusFilter;
      return matchesDate && matchesStatus;
    });
  }, [orders, periodFilter, customDateRange, statsStatusFilter]);

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

  // Filtrar pedidos para a tab de pedidos
  const filteredOrdersForTab = useMemo(() => {
    if (!orders) return [];
    
    return orders.filter(order => {
      // Validação de permissões de visualização
      if (employeeAccess.isEmployee) {
        // Se pode ver todos os pedidos, não precisa de verificação adicional
        if (!canViewAllOrders) {
          // Verificar permissão específica para o status do pedido
          const orderStatus = order.status;
          const hasSpecificPermission = 
            (orderStatus === 'pending' && canViewPendingOrders) ||
            (orderStatus === 'confirmed' && canViewConfirmedOrders) ||
            (orderStatus === 'preparing' && canViewPreparingOrders) ||
            (orderStatus === 'in_delivery' && canViewOutForDeliveryOrders) ||
            (orderStatus === 'delivered' && canViewDeliveredOrders) ||
            (orderStatus === 'cancelled' && canViewCancelledOrders);
          
          if (!hasSpecificPermission) {
            // Não tem permissão para ver este pedido
            return false;
          }
        }
      }
      
      // Filtro de pesquisa por nome do cliente ou número do pedido
      if (orderSearchTerm.trim() !== '') {
        const searchLower = orderSearchTerm.toLowerCase().trim();
        const matchesCustomerName = order.customer_name?.toLowerCase().includes(searchLower);
        const matchesOrderNumber = order.order_number?.toLowerCase().includes(searchLower);
        
        if (!matchesCustomerName && !matchesOrderNumber) {
          return false;
        }
      }
      
      // Filtro de status
      if (orderStatusFilter !== 'all' && order.status !== orderStatusFilter) {
        return false;
      }
      
      // Filtro de data
      if (dateFilter === 'all') {
        return true; // Mostrar todos os pedidos
      }
      
      const orderDate = new Date(order.created_at);
      
      if (dateFilter === 'daily') {
        return isToday(orderDate);
      } else if (dateFilter === 'weekly') {
        return isThisWeek(orderDate, { locale: ptBR });
      } else if (dateFilter === 'monthly') {
        return isThisMonth(orderDate);
      } else if (dateFilter === 'custom' && customDateRange.from && customDateRange.to) {
        return isWithinInterval(orderDate, {
          start: startOfDay(customDateRange.from),
          end: endOfDay(customDateRange.to),
        });
      }
      
      return true;
    });
  }, [orders, orderStatusFilter, dateFilter, customDateRange, orderSearchTerm]);

  // Paginação dos pedidos
  const paginatedOrdersData = useMemo(() => {
    const totalPages = Math.ceil(filteredOrdersForTab.length / ordersPerPage);
    const startIndex = (currentOrderPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const paginatedOrders = filteredOrdersForTab.slice(startIndex, endIndex);
    
    return {
      orders: paginatedOrders,
      totalPages,
      startIndex,
      endIndex,
      totalOrders: filteredOrdersForTab.length
    };
  }, [filteredOrdersForTab, currentOrderPage, ordersPerPage]);

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
      category: storeForm.category,
      logo_url: storeForm.logo_url,
      banner_url: storeForm.banner_url,
      description: storeForm.description,
      delivery_fee: storeForm.delivery_fee,
      min_order_value: storeForm.min_order_value,
      avg_delivery_time: storeForm.avg_delivery_time,
      accepts_delivery: storeForm.accepts_delivery,
      accepts_pickup: storeForm.accepts_pickup,
      accepts_pix: storeForm.accepts_pix,
      accepts_card: storeForm.accepts_card,
      accepts_cash: storeForm.accepts_cash,
      address: storeForm.address,
      pickup_address: storeForm.pickup_address,
      phone: storeForm.phone,
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

  // Função para imprimir pedido
  const handlePrintOrder = (order: any) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const orderItems = order.order_items || [];
    const itemsHtml = orderItems.map((item: any) => {
      const addons = item.order_item_addons?.map((addon: any) => 
        `<div style="margin-left: 20px; font-size: 12px;">+ ${addon.addon_name} - R$ ${addon.addon_price.toFixed(2)}</div>`
      ).join('') || '';
      
      const flavors = item.order_item_flavors?.map((flavor: any) => 
        `<div style="margin-left: 20px; font-size: 12px;">• ${flavor.flavor_name}</div>`
      ).join('') || '';

      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity}x ${item.product_name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${item.subtotal.toFixed(2)}</td>
        </tr>
        ${addons ? `<tr><td colspan="2" style="padding: 4px 8px;">${addons}</td></tr>` : ''}
        ${flavors ? `<tr><td colspan="2" style="padding: 4px 8px;">${flavors}</td></tr>` : ''}
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido #${order.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info { margin-bottom: 20px; }
            .info-row { margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background-color: #f0f0f0; padding: 10px; text-align: left; }
            .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${myStore?.name}</h1>
            <p>Pedido #${order.order_number}</p>
            <p>${format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
          
          <div class="info">
            <div class="info-row"><strong>Cliente:</strong> ${order.customer_name}</div>
            <div class="info-row"><strong>Telefone:</strong> ${order.customer_phone}</div>
            <div class="info-row"><strong>Tipo:</strong> ${order.delivery_type === 'delivery' ? 'Entrega' : 'Retirada'}</div>
            <div class="info-row"><strong>Pagamento:</strong> ${order.payment_method}</div>
            <div class="info-row"><strong>Status:</strong> ${customStatuses.find((s: any) => s.status_key === order.status)?.status_label || order.status}</div>
            ${order.delivery_type === 'delivery' ? `
              <div class="info-row">
                <strong>Endereço:</strong> ${order.delivery_street}, ${order.delivery_number}
                ${order.delivery_complement ? ` - ${order.delivery_complement}` : ''}
                - ${order.delivery_neighborhood}
              </div>
            ` : ''}
            ${order.notes ? `<div class="info-row"><strong>Observações:</strong> ${order.notes}</div>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr>
                <td style="padding: 8px;"><strong>Subtotal</strong></td>
                <td style="padding: 8px; text-align: right;"><strong>R$ ${order.subtotal.toFixed(2)}</strong></td>
              </tr>
              ${order.delivery_fee > 0 ? `
                <tr>
                  <td style="padding: 8px;">Taxa de Entrega</td>
                  <td style="padding: 8px; text-align: right;">R$ ${order.delivery_fee.toFixed(2)}</td>
                </tr>
              ` : ''}
              ${order.coupon_discount > 0 ? `
                <tr>
                  <td style="padding: 8px;">Desconto (${order.coupon_code})</td>
                  <td style="padding: 8px; text-align: right;">- R$ ${order.coupon_discount.toFixed(2)}</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
          
          <div class="total">
            Total: R$ ${order.total.toFixed(2)}
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex min-h-screen bg-background w-full">
        {/* Mobile Sidebar (Drawer) */}
        <DashboardMobileSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          storeLogo={myStore?.logo_url}
          storeName={myStore?.name}
          isEmployee={employeeAccess.isEmployee}
          employeePermissions={employeeAccess.permissions}
        />
        
        {/* Desktop Sidebar */}
        <DashboardSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          storeLogo={myStore?.logo_url}
          storeName={myStore?.name}
          isEmployee={employeeAccess.isEmployee}
          employeePermissions={employeeAccess.permissions}
        />
      
      
      <div className="flex-1">
        {activeTab === 'home' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 md:p-8 space-y-6"
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
                          {myStore?.name}
                        </motion.h2>
                        
                        {employeeAccess.isEmployee && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                            <User className="w-3 h-3 mr-1" />
                            Funcionário
                          </Badge>
                        )}
                        
                        {isStoreOwner && !employeeAccess.isEmployee && (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                            <Store className="w-3 h-3 mr-1" />
                            Proprietário
                          </Badge>
                        )}
                        
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
                        <WhatsAppStatusIndicator storeId={myStore.id} />
                      </div>
                      <motion.p
                        className="text-muted-foreground text-lg"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        {myStore?.category}
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

            {/* Store URL Card */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    URL da Loja
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Input
                      value={`https://appofertas.lovable.app/loja-${myStore?.slug || ''}`}
                      readOnly
                      className="flex-1 bg-muted/50"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(`https://appofertas.lovable.app/loja-${myStore?.slug || ''}`);
                          toast({
                            title: "URL copiada!",
                            description: "A URL da sua loja foi copiada para a área de transferência.",
                          });
                        } catch (error) {
                          toast({
                            title: "Erro ao copiar",
                            description: "Não foi possível copiar a URL.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Period Filter */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <h2 className="text-xl md:text-2xl font-bold gradient-text">Estatísticas da Loja</h2>
                <p className="text-sm md:text-base text-muted-foreground">Acompanhe o desempenho do seu negócio</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Select value={periodFilter} onValueChange={(value) => {
                  if (value === "custom") {
                    setShowCustomDatePicker(true);
                  } else {
                    setPeriodFilter(value);
                  }
                }}>
                  <SelectTrigger className="w-full sm:w-[200px]">
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

                <Select value={statsStatusFilter} onValueChange={setStatsStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    {customStatuses.length > 0 ? (
                      customStatuses.map((status) => (
                        <SelectItem key={status.id} value={status.status_key}>
                          {status.status_label}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="confirmed">Confirmado</SelectItem>
                        <SelectItem value="preparing">Preparando</SelectItem>
                        <SelectItem value="ready">Pronto</SelectItem>
                        <SelectItem value="out_for_delivery">Saiu para Entrega</SelectItem>
                        <SelectItem value="delivered">Entregue</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </>
                    )}
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

            {/* Recent Orders Section */}
            {filteredOrders && filteredOrders.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-orange-500/5 to-transparent">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-orange-500" />
                        Pedidos Recentes
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('pedidos')}
                        className="text-primary hover:text-primary"
                      >
                        Ver Todos
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {filteredOrders.slice(0, 5).map((order) => (
                        <div key={order.id} className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <p className="font-semibold">#{order.order_number}</p>
                                <Badge variant="outline" className="capitalize">
                                  {customStatuses.find(s => s.status_key === order.status)?.status_label || order.status}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>{order.customer_name}</p>
                                <p>{format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                {(order as any).coupon_code && (
                                  <Badge variant="outline" className="gap-1 text-xs">
                                    <Tag className="h-3 w-3" />
                                    {(order as any).coupon_code}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg text-green-500">R$ {order.total.toFixed(2)}</p>
                              <p className="text-sm text-muted-foreground capitalize">{order.payment_method}</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mt-3 pt-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setViewingOrder(order);
                                setIsViewOrderDialogOpen(true);
                              }}
                              className="flex items-center gap-2"
                            >
                              <Eye className="w-3 h-3" />
                              Visualizar
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintOrder(order)}
                              className="flex items-center gap-2"
                            >
                              <Printer className="w-3 h-3" />
                              Imprimir
                            </Button>
                            
                            {hasPermission('orders', 'edit_order_details') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingOrder(order);
                                  setIsEditOrderDialogOpen(true);
                                  setEditDialogInitialTab('notes');
                                }}
                                className="flex items-center gap-2"
                              >
                                <MessageSquare className="w-3 h-3" />
                                Notas
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
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

        {activeTab === 'pedidos' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8 space-y-6"
          >
            <div className="mb-6">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold gradient-text">Pedidos</h2>
                  <p className="text-muted-foreground">Gerencie os pedidos da sua loja</p>
                </div>
                {myStore?.id && (
                  <WhatsAppStatusIndicator storeId={myStore.id} />
                )}
              </div>

              {/* Filtros de Data */}
              <div className="space-y-3 mb-4">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                  <Label className="text-sm font-medium">Filtrar por período:</Label>
                  <Select
                    value={dateFilter}
                    onValueChange={(value: 'all' | 'daily' | 'weekly' | 'monthly' | 'custom') => setDateFilter(value)}
                  >
                    <SelectTrigger className="w-full sm:w-[200px] bg-background z-50">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="all">🌐 Todos os períodos</SelectItem>
                      <SelectItem value="daily">📅 Diário</SelectItem>
                      <SelectItem value="weekly">📆 Semanal</SelectItem>
                      <SelectItem value="monthly">🗓️ Mensal</SelectItem>
                      <SelectItem value="custom">⚙️ Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {dateFilter === 'custom' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <CalendarIcon className="w-4 h-4" />
                          {customDateRange.from && customDateRange.to
                            ? `${format(customDateRange.from, "dd/MM/yyyy")} - ${format(customDateRange.to, "dd/MM/yyyy")}`
                            : 'Selecionar datas'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                        <div className="p-4 space-y-2">
                          <Label>Selecione o período</Label>
                          <Calendar
                            mode="range"
                            selected={{
                              from: customDateRange.from,
                              to: customDateRange.to,
                            }}
                            onSelect={(range) => {
                              setCustomDateRange({
                                from: range?.from,
                                to: range?.to,
                              });
                            }}
                            numberOfMonths={2}
                            locale={ptBR}
                            className="pointer-events-auto"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  
                  {dateFilter !== 'all' && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDateFilter('all');
                        setCustomDateRange({ from: undefined, to: undefined });
                      }}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Limpar
                    </Button>
                  )}
                </div>
              </div>

              {/* Botões de Status */}
              <div className="flex flex-wrap gap-2">
                {canViewAllOrders && (
                  <Button
                    variant={orderStatusFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setOrderStatusFilter('all')}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                    size="sm"
                  >
                    <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Todos</span>
                    <Badge variant="secondary" className="ml-1">
                      {orders?.length || 0}
                    </Badge>
                  </Button>
                )}
                
                {customStatuses.map((status) => {
                  const statusCount = orders?.filter(o => o.status === status.status_key).length || 0;
                  const isActive = orderStatusFilter === status.status_key;
                  
                  // Verificar se tem permissão para visualizar este status
                  const canViewThisStatus = canViewAllOrders || 
                    (status.status_key === 'pending' && canViewPendingOrders) ||
                    (status.status_key === 'confirmed' && canViewConfirmedOrders) ||
                    (status.status_key === 'preparing' && canViewPreparingOrders) ||
                    (status.status_key === 'out_for_delivery' && canViewOutForDeliveryOrders) ||
                    (status.status_key === 'in_delivery' && canViewOutForDeliveryOrders) || // compatibilidade
                    (status.status_key === 'delivered' && canViewDeliveredOrders) ||
                    (status.status_key === 'cancelled' && canViewCancelledOrders);
                  
                  console.log(`[Botão ${status.status_key}]`, {
                    canViewAllOrders,
                    canViewThisStatus,
                    statusKey: status.status_key
                  });
                  
                  if (!canViewThisStatus) return null;
                  
                  return (
                    <Button
                      key={status.id}
                      variant={isActive ? 'default' : 'outline'}
                      onClick={() => setOrderStatusFilter(status.status_key)}
                      className={cn(
                        "flex items-center gap-1 sm:gap-2 transition-all text-xs sm:text-sm px-2 sm:px-4",
                        isActive && "shadow-md"
                      )}
                      size="sm"
                      style={{
                        backgroundColor: isActive ? status.status_color : undefined,
                        borderColor: status.status_color,
                        color: isActive ? '#ffffff' : undefined,
                      }}
                    >
                      <Badge
                        className="w-2 h-2 sm:w-3 sm:h-3 p-0 rounded-full"
                        style={{ backgroundColor: status.status_color }}
                      />
                      <span className="truncate">{status.status_label}</span>
                      <Badge 
                        variant="secondary" 
                        className="ml-1"
                        style={{
                          backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                          color: isActive ? '#ffffff' : 'inherit',
                        }}
                      >
                        {statusCount}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
              
              {customStatuses.length === 0 && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma etapa de pedido ativa. Configure as etapas em{' '}
                    <Button
                      variant="link"
                      className="p-0 h-auto text-primary"
                      onClick={() => setActiveTab('configuracoes')}
                    >
                      Configurações → Etapas do Pedido
                    </Button>
                  </p>
                </div>
              )}

              {/* Campo de Pesquisa */}
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por nome do cliente ou número do pedido..."
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {orderSearchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOrderSearchTerm('')}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de Pedidos */}
            {paginatedOrdersData.totalOrders > 0 ? (
              <div className="space-y-4 md:space-y-6">
                {paginatedOrdersData.orders.map((order, index) => (
                  <div key={order.id}>
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                          <div>
                            <h3 className="font-semibold text-base md:text-lg">Pedido #{order.order_number}</h3>
                            <p className="text-xs md:text-sm text-muted-foreground">
                              {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <Badge variant="outline" className="capitalize text-xs self-start">
                            {customStatuses.find(s => s.status_key === order.status)?.status_label || order.status}
                          </Badge>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cliente:</span>
                            <span className="font-medium">{order.customer_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Telefone:</span>
                            <span className="font-medium">{order.customer_phone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tipo:</span>
                            <span className="font-medium capitalize">{order.delivery_type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pagamento:</span>
                            <span className="font-medium capitalize">{order.payment_method}</span>
                          </div>
                          {(order as any).coupon_code && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Cupom:</span>
                              <Badge variant="outline" className="gap-1">
                                <Tag className="h-3 w-3" />
                                {(order as any).coupon_code}
                                {(order as any).coupon_discount > 0 && (
                                  <span className="text-green-600 ml-1">
                                    (-R$ {(order as any).coupon_discount.toFixed(2)})
                                  </span>
                                )}
                              </Badge>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total:</span>
                            <span className="text-primary">R$ {order.total.toFixed(2)}</span>
                          </div>
                        </div>

                        {order.delivery_type === 'delivery' && (
                          <>
                            <Separator className="my-4" />
                            <div className="space-y-1 text-sm">
                              <p className="font-medium">Endereço de Entrega:</p>
                              <p className="text-muted-foreground">
                                {order.delivery_street}, {order.delivery_number}
                                {order.delivery_complement && ` - ${order.delivery_complement}`}
                              </p>
                              <p className="text-muted-foreground">{order.delivery_neighborhood}</p>
                            </div>
                          </>
                        )}

                        {order.notes && (
                          <>
                            <Separator className="my-4" />
                            <div className="text-sm">
                              <p className="font-medium mb-1">Observações:</p>
                              <p className="text-muted-foreground">{order.notes}</p>
                            </div>
                          </>
                        )}

                        <Separator className="my-4" />

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setViewingOrder(order);
                              setIsViewOrderDialogOpen(true);
                            }}
                            className="flex items-center justify-center gap-2 w-full sm:w-auto"
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            Visualizar
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintOrder(order)}
                            className="flex items-center justify-center gap-2 w-full sm:w-auto"
                          >
                            <Printer className="w-3 h-3 sm:w-4 sm:h-4" />
                            Imprimir
                          </Button>
                          
                          {hasPermission('orders', 'edit_order_details') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingOrder(order);
                                setIsEditOrderDialogOpen(true);
                                setEditDialogInitialTab('notes');
                              }}
                              className="flex items-center justify-center gap-2 w-full sm:w-auto"
                            >
                              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                              Notas
                            </Button>
                          )}

                          {hasPermission('orders', 'edit_order_details') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingOrder(order);
                                setIsEditOrderDialogOpen(true);
                                setEditDialogInitialTab("items");
                              }}
                              className="flex items-center justify-center gap-2 w-full sm:w-auto"
                            >
                              <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              Editar Pedido
                            </Button>
                          )}
                          <Select
                            value={order.status}
                            onValueChange={(newStatus) => {
                              // Verificar permissão antes de permitir mudança
                              if (!canChangeTo(newStatus)) {
                                toast({
                                  title: "Sem permissão",
                                  description: "Você não tem permissão para alterar para este status.",
                                  variant: "destructive"
                                });
                                return;
                              }
                              updateOrderStatus({ orderId: order.id, status: newStatus });
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Alterar status" />
                            </SelectTrigger>
                            <SelectContent>
                              {customStatuses.length > 0 ? (
                                customStatuses
                                  .filter(status => canChangeTo(status.status_key))
                                  .map((status) => (
                                    <SelectItem key={status.status_key} value={status.status_key}>
                                      {status.status_label}
                                    </SelectItem>
                                  ))
                              ) : (
                                <>
                                  {canChangeTo('pending') && <SelectItem value="pending">Pendente</SelectItem>}
                                  {canChangeTo('confirmed') && <SelectItem value="confirmed">Confirmado</SelectItem>}
                                  {canChangeTo('preparing') && <SelectItem value="preparing">Preparando</SelectItem>}
                                  {canChangeTo('ready') && <SelectItem value="ready">Pronto</SelectItem>}
                                  {canChangeTo('delivered') && <SelectItem value="delivered">Entregue</SelectItem>}
                                  {canChangeTo('cancelled') && <SelectItem value="cancelled">Cancelado</SelectItem>}
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Separador grosso entre pedidos */}
                    {index < paginatedOrdersData.orders.length - 1 && (
                      <div className="relative py-4">
                        <Separator className="h-[3px] bg-orange-500" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Informação de pedidos e Paginação */}
                <div className="mt-8 space-y-4">
                  {/* Sempre mostrar contador de pedidos */}
                  <div className="text-center text-sm text-muted-foreground font-medium">
                    {paginatedOrdersData.totalPages > 1 ? (
                      <>Mostrando {paginatedOrdersData.startIndex + 1} a {Math.min(paginatedOrdersData.endIndex, paginatedOrdersData.totalOrders)} de {paginatedOrdersData.totalOrders} pedidos</>
                    ) : (
                      <>Total: {paginatedOrdersData.totalOrders} {paginatedOrdersData.totalOrders === 1 ? 'pedido' : 'pedidos'}</>
                    )}
                  </div>

                  {/* Paginação - aparece quando tem mais de 1 página */}
                  {paginatedOrdersData.totalPages > 1 && (
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentOrderPage(prev => Math.max(prev - 1, 1))}
                            className={cn(
                              "cursor-pointer",
                              currentOrderPage === 1 && "pointer-events-none opacity-50"
                            )}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: paginatedOrdersData.totalPages }, (_, i) => i + 1).map((page) => {
                          const showPage = page === 1 || 
                                         page === paginatedOrdersData.totalPages || 
                                         (page >= currentOrderPage - 1 && page <= currentOrderPage + 1);
                          const showEllipsis = page === currentOrderPage - 2 || page === currentOrderPage + 2;
                          
                          if (showPage) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setCurrentOrderPage(page)}
                                  isActive={currentOrderPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          } else if (showEllipsis) {
                            return (
                              <PaginationItem key={`ellipsis-${page}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return null;
                        })}

                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentOrderPage(prev => Math.min(prev + 1, paginatedOrdersData.totalPages))}
                            className={cn(
                              "cursor-pointer",
                              currentOrderPage === paginatedOrdersData.totalPages && "pointer-events-none opacity-50"
                            )}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum pedido encontrado</h3>
                  <p className="text-muted-foreground">
                    {orders && orders.length > 0 
                      ? "Nenhum pedido corresponde aos filtros selecionados"
                      : "Quando você receber pedidos, eles aparecerão aqui"
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {activeTab === 'categorias' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8 space-y-6"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold gradient-text">Categorias</h2>
                <p className="text-muted-foreground">Organize os produtos da sua loja</p>
              </div>
              {hasPermission('categories', 'create') && (
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Categoria
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
                          placeholder="Ex: Hambúrgueres, Bebidas, Sobremesas..."
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
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Filtro de Status das Categorias */}
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <Select value={categoryStatusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setCategoryStatusFilter(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Categorias Ativas</SelectItem>
                  <SelectItem value="inactive">Categorias Inativas</SelectItem>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                </SelectContent>
              </Select>
              {categoryStatusFilter !== 'active' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCategoryStatusFilter('active')}
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Categories Grid */}
            {categories.filter(cat => {
              if (categoryStatusFilter === 'active') return cat.is_active;
              if (categoryStatusFilter === 'inactive') return !cat.is_active;
              return true;
            }).length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <FolderTree className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    {categoryStatusFilter === 'active' && 'Nenhuma categoria ativa'}
                    {categoryStatusFilter === 'inactive' && 'Nenhuma categoria inativa'}
                    {categoryStatusFilter === 'all' && 'Nenhuma categoria cadastrada'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {categoryStatusFilter === 'all' 
                      ? 'Comece criando categorias para organizar seus produtos'
                      : 'Não há categorias com este status'}
                  </p>
                  {categoryStatusFilter === 'all' && (
                    <Button onClick={() => setIsCategoryDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeira Categoria
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories
                  .filter(cat => {
                    if (categoryStatusFilter === 'active') return cat.is_active;
                    if (categoryStatusFilter === 'inactive') return !cat.is_active;
                    return true;
                  })
                  .map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={cn(
                      "hover-scale border-muted/50 hover:border-primary/30 transition-all hover:shadow-lg",
                      !category.is_active && "opacity-60 bg-muted/20"
                    )}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <FolderTree className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{category.name}</h3>
                                {!category.is_active && (
                                  <Badge variant="secondary" className="text-xs">
                                    Desativada
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {products?.filter(p => p.category === category.name).length || 0} produtos
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasPermission('categories', 'update') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingCategory(category);
                                  setEditCategoryName(category.name);
                                  setIsEditCategoryDialogOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {hasPermission('categories', 'delete') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:text-destructive hover:bg-destructive/10"
                                onClick={() => deleteCategory(category.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {hasPermission('categories', 'toggle_status') && (
                          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30 mb-4">
                            <div>
                              <p className="text-sm font-medium">
                                {category.is_active ? 'Categoria ativa' : 'Categoria desativada'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {category.is_active 
                                  ? 'Visível no cardápio' 
                                  : 'Produtos ocultos do cardápio'}
                              </p>
                            </div>
                            <Switch
                              checked={category.is_active}
                              onCheckedChange={(checked) => toggleCategoryStatus(category.id, checked)}
                            />
                          </div>
                        )}
                        
                        {products && products.filter(p => p.category === category.name).length > 0 && (
                          <div className="pt-4 border-t">
                            <p className="text-xs text-muted-foreground mb-2">Produtos nesta categoria:</p>
                            <div className="flex flex-wrap gap-2">
                              {products
                                .filter(p => p.category === category.name)
                                .slice(0, 3)
                                .map(product => (
                                  <Badge key={product.id} variant="secondary" className="text-xs">
                                    {product.name}
                                  </Badge>
                                ))}
                              {products.filter(p => p.category === category.name).length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{products.filter(p => p.category === category.name).length - 3} mais
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Dialog de edição de categoria */}
            <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Categoria</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome da Categoria</Label>
                    <Input
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      placeholder="Ex: Hambúrgueres, Bebidas, Sobremesas..."
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      if (editCategoryName.trim() && editingCategory) {
                        await updateCategory(editingCategory.id, editCategoryName.trim());
                        // Invalidar as queries de produtos para recarregar com os nomes atualizados
                        queryClient.invalidateQueries({ queryKey: ['my-products', myStore?.id] });
                        queryClient.invalidateQueries({ queryKey: ['products', myStore?.id] });
                        setIsEditCategoryDialogOpen(false);
                        setEditingCategory(null);
                        setEditCategoryName('');
                      }
                    }}
                    className="w-full"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>
        )}

        {activeTab === 'cupons' && myStore?.id && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8"
          >
            <CouponsManager storeId={myStore.id} />
          </motion.div>
        )}

        {activeTab === 'funcionarios' && myStore?.id && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8"
          >
            <EmployeesManager storeId={myStore.id} />
          </motion.div>
        )}

        {activeTab === 'whatsapp' && myStore?.id && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8"
          >
            <WhatsAppIntegration storeId={myStore.id} />
          </motion.div>
        )}

        {activeTab === 'produtos' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8 space-y-6"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold gradient-text">Meus Produtos</h2>
                <p className="text-muted-foreground">Gerencie o cardápio da sua loja</p>
              </div>
              {hasPermission('products', 'create') && (
                <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingProduct(null)} size="lg">
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
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="info">Informações</TabsTrigger>
                          <TabsTrigger value="addons" disabled={!editingProduct}>
                            Adicionais {!editingProduct && <span className="text-xs ml-1">(salve primeiro)</span>}
                          </TabsTrigger>
                          <TabsTrigger value="flavors" disabled={!editingProduct}>
                            Múltiplos Sabores {!editingProduct && <span className="text-xs ml-1">(salve primeiro)</span>}
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
                          
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={productForm.is_available}
                              onCheckedChange={(checked) => setProductForm({ ...productForm, is_available: checked })}
                            />
                            <Label>Disponível</Label>
                          </div>
                        </TabsContent>

                        <TabsContent value="addons" className="mt-4">
                          {editingProduct && (
                            <ProductAddonsManager productId={editingProduct.id} />
                          )}
                        </TabsContent>

                        <TabsContent value="flavors" className="mt-4">
                          {editingProduct && (
                            <>
                              <div className="space-y-4 p-4 border rounded-lg bg-muted/30 mb-4">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Pizza className="w-4 h-4" />
                                      <Label>Este produto permite múltiplos sabores</Label>
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
                              
                              <ProductFlavorsManager productId={editingProduct.id} />
                            </>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  </ScrollArea>
                  
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
              )}
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

            {/* Products Grid */}
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
                          {hasPermission('products', 'update') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditProduct(product)}
                              className="hover-scale"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {hasPermission('products', 'delete') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteProduct(product.id)}
                              className="hover-scale hover:border-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {(activeTab === 'relatorio-clientes' || 
          activeTab === 'relatorio-produtos-vendidos' || 
          activeTab === 'relatorio-produtos-cadastrados' || 
          activeTab === 'relatorio-pedidos') && myStore?.id && (
          <div className="p-8 space-y-6">
            <ReportsFilters
              periodFilter={reportsPeriodFilter}
              onPeriodFilterChange={setReportsPeriodFilter}
              customDateRange={reportsCustomDateRange}
              onCustomDateRangeChange={setReportsCustomDateRange}
            />
            
            {activeTab === 'relatorio-clientes' && (
              <CustomersReport storeId={myStore.id} storeName={myStore.name} dateRange={reportsDateRange} />
            )}

            {activeTab === 'relatorio-produtos-vendidos' && (
              <BestSellingProductsReport storeId={myStore.id} storeName={myStore.name} dateRange={reportsDateRange} />
            )}

            {activeTab === 'relatorio-produtos-cadastrados' && (
              <RegisteredProductsReport storeId={myStore.id} storeName={myStore.name} />
            )}

            {activeTab === 'relatorio-pedidos' && (
              <OrdersReport storeId={myStore.id} storeName={myStore.name} dateRange={reportsDateRange} />
            )}
          </div>
        )}

        {activeTab === 'result' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8 space-y-6"
          >
            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Tabs defaultValue="personal" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 bg-muted/50">
                  <TabsTrigger value="personal" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                    <User className="w-4 h-4 mr-2" />
                    Dados Pessoais
                  </TabsTrigger>
                  <TabsTrigger value="security" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                    <Lock className="w-4 h-4 mr-2" />
                    Segurança
                  </TabsTrigger>
                  <TabsTrigger value="status" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                    <Menu className="w-4 h-4 mr-2" />
                    Etapas do Pedido
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                    <Settings className="w-4 h-4 mr-2" />
                    Loja
                  </TabsTrigger>
                </TabsList>

        {/* Personal Data Tab */}
        <TabsContent value="personal">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <PersonalDataSettings />
          </motion.div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SecuritySettings />
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
                <Label>Telefone da Loja</Label>
                <PhoneInput
                  value={storeForm.phone}
                  onChange={(value) => setStoreForm({ ...storeForm, phone: value })}
                />
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Categoria</h3>
                
                <div>
                  <Label>Categoria da Loja *</Label>
                  <Select
                    value={storeForm.category}
                    onValueChange={(value) => setStoreForm({ ...storeForm, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Restaurante">Restaurante</SelectItem>
                      <SelectItem value="Lanchonete">Lanchonete</SelectItem>
                      <SelectItem value="Pizzaria">Pizzaria</SelectItem>
                      <SelectItem value="Hamburgueria">Hamburgueria</SelectItem>
                      <SelectItem value="Japonês">Japonês</SelectItem>
                      <SelectItem value="Italiano">Italiano</SelectItem>
                      <SelectItem value="Brasileira">Brasileira</SelectItem>
                      <SelectItem value="Mercado">Mercado</SelectItem>
                      <SelectItem value="Padaria">Padaria</SelectItem>
                      <SelectItem value="Açougue">Açougue</SelectItem>
                      <SelectItem value="Farmácia">Farmácia</SelectItem>
                      <SelectItem value="Pet Shop">Pet Shop</SelectItem>
                      <SelectItem value="Flores">Flores</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tipos de Entrega Aceitos</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="accepts_delivery">Entrega</Label>
                      <p className="text-sm text-muted-foreground">
                        Permite que os clientes recebam pedidos em casa
                      </p>
                    </div>
                    <Switch
                      id="accepts_delivery"
                      checked={storeForm.accepts_delivery}
                      onCheckedChange={(checked) => 
                        setStoreForm({ ...storeForm, accepts_delivery: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="accepts_pickup">Retirada</Label>
                      <p className="text-sm text-muted-foreground">
                        Permite que os clientes retirem pedidos na loja
                      </p>
                    </div>
                    <Switch
                      id="accepts_pickup"
                      checked={storeForm.accepts_pickup}
                      onCheckedChange={(checked) => 
                        setStoreForm({ ...storeForm, accepts_pickup: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Métodos de Pagamento Aceitos</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="accepts_pix">PIX</Label>
                      <p className="text-sm text-muted-foreground">
                        Aceita pagamento via PIX
                      </p>
                    </div>
                    <Switch
                      id="accepts_pix"
                      checked={storeForm.accepts_pix}
                      onCheckedChange={(checked) => 
                        setStoreForm({ ...storeForm, accepts_pix: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="accepts_card">Cartão</Label>
                      <p className="text-sm text-muted-foreground">
                        Aceita pagamento com cartão de crédito ou débito
                      </p>
                    </div>
                    <Switch
                      id="accepts_card"
                      checked={storeForm.accepts_card}
                      onCheckedChange={(checked) => 
                        setStoreForm({ ...storeForm, accepts_card: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="accepts_cash">Dinheiro</Label>
                      <p className="text-sm text-muted-foreground">
                        Aceita pagamento em dinheiro
                      </p>
                    </div>
                    <Switch
                      id="accepts_cash"
                      checked={storeForm.accepts_cash}
                      onCheckedChange={(checked) => 
                        setStoreForm({ ...storeForm, accepts_cash: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configurações de Entrega</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <Label>Pedido Mínimo (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={storeForm.min_order_value}
                      onChange={(e) => setStoreForm({ ...storeForm, min_order_value: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label>Tempo Médio de Entrega (min)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={storeForm.avg_delivery_time}
                      onChange={(e) => setStoreForm({ ...storeForm, avg_delivery_time: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

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

      {/* Edit Order Dialog */}
      <EditOrderDialog
        open={isEditOrderDialogOpen}
        onOpenChange={(open) => {
          setIsEditOrderDialogOpen(open);
          if (!open) setEditDialogInitialTab("items");
        }}
        order={editingOrder}
        initialTab={editDialogInitialTab}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['store-orders'] });
        }}
      />

      {/* View Order Dialog */}
      <Dialog open={isViewOrderDialogOpen} onOpenChange={setIsViewOrderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido #{viewingOrder?.order_number}</DialogTitle>
          </DialogHeader>
          
          {viewingOrder && (
            <div className="space-y-6">
              {/* Status e Data */}
              <div className="flex justify-between items-center">
                <div>
                  <Badge variant="outline" className="capitalize">
                    {customStatuses.find((s: any) => s.status_key === viewingOrder.status)?.status_label || viewingOrder.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(viewingOrder.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              <Separator />

              {/* Informações do Cliente */}
              <div>
                <h3 className="font-semibold mb-3">Informações do Cliente</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nome:</span>
                    <span className="font-medium">{viewingOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefone:</span>
                    <span className="font-medium">{viewingOrder.customer_phone}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Tipo de Entrega e Pagamento */}
              <div>
                <h3 className="font-semibold mb-3">Detalhes do Pedido</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium capitalize">
                      {viewingOrder.delivery_type === 'delivery' ? 'Entrega' : 'Retirada'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pagamento:</span>
                    <span className="font-medium capitalize">{viewingOrder.payment_method}</span>
                  </div>
                  {viewingOrder.change_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Troco para:</span>
                      <span className="font-medium">R$ {viewingOrder.change_amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Endereço de Entrega */}
              {viewingOrder.delivery_type === 'delivery' && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Endereço de Entrega</h3>
                    <div className="text-sm space-y-1">
                      <p>{viewingOrder.delivery_street}, {viewingOrder.delivery_number}</p>
                      {viewingOrder.delivery_complement && <p>{viewingOrder.delivery_complement}</p>}
                      <p>{viewingOrder.delivery_neighborhood}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Observações */}
              {viewingOrder.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Observações</h3>
                    <p className="text-sm text-muted-foreground">{viewingOrder.notes}</p>
                  </div>
                </>
              )}

              <Separator />

              {/* Itens do Pedido */}
              <div>
                <h3 className="font-semibold mb-3">Itens do Pedido</h3>
                <div className="space-y-3">
                  {viewingOrder.order_items?.map((item: any) => (
                    <div key={item.id} className="bg-muted/30 p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium">
                            {item.quantity}x {item.product_name}
                          </p>
                          {item.observation && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Obs: {item.observation}
                            </p>
                          )}
                        </div>
                        <span className="font-medium">R$ {item.subtotal.toFixed(2)}</span>
                      </div>
                      
                      {/* Sabores */}
                      {item.order_item_flavors?.length > 0 && (
                        <div className="mt-2 pl-4 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Sabores:</p>
                          {item.order_item_flavors.map((flavor: any) => (
                            <p key={flavor.id} className="text-sm text-muted-foreground">
                              • {flavor.flavor_name}
                              {flavor.flavor_price > 0 && ` (+R$ ${flavor.flavor_price.toFixed(2)})`}
                            </p>
                          ))}
                        </div>
                      )}
                      
                      {/* Adicionais */}
                      {item.order_item_addons?.length > 0 && (
                        <div className="mt-2 pl-4 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Adicionais:</p>
                          {item.order_item_addons.map((addon: any) => (
                            <p key={addon.id} className="text-sm text-muted-foreground">
                              + {addon.addon_name} (R$ {addon.addon_price.toFixed(2)})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Resumo de Valores */}
              <div>
                <h3 className="font-semibold mb-3">Resumo</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>R$ {viewingOrder.subtotal.toFixed(2)}</span>
                  </div>
                  {viewingOrder.delivery_fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxa de Entrega:</span>
                      <span>R$ {viewingOrder.delivery_fee.toFixed(2)}</span>
                    </div>
                  )}
                  {viewingOrder.coupon_discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto ({viewingOrder.coupon_code}):</span>
                      <span>- R$ {viewingOrder.coupon_discount.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">R$ {viewingOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => handlePrintOrder(viewingOrder)}
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </Button>
                {hasPermission('orders', 'edit_order_details') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsViewOrderDialogOpen(false);
                      setEditingOrder(viewingOrder);
                      setIsEditOrderDialogOpen(true);
                      setEditDialogInitialTab('notes');
                    }}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Notas
                  </Button>
                )}
                {hasPermission('orders', 'edit_order_details') && (
                  <Button
                    onClick={() => {
                      setIsViewOrderDialogOpen(false);
                      setEditingOrder(viewingOrder);
                      setIsEditOrderDialogOpen(true);
                      setEditDialogInitialTab("items");
                    }}
                    className="flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar Pedido
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
