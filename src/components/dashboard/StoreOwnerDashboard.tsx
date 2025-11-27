import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PhoneInput } from "@/components/ui/phone-input";
import { useStoreManagement, type StoreFormData } from "@/hooks/useStoreManagement";
import { useProductManagement } from "@/hooks/useProductManagement";
import { useStoreOrders } from "@/hooks/useStoreOrders";
import { useCategories } from "@/hooks/useCategories";
import { Store, Package, ShoppingBag, Plus, Edit, Trash2, Settings, Clock, Search, Tag, X, Copy, Check, Pizza, MessageSquare, Menu, TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, ArrowUp, ArrowDown, FolderTree, User, Lock, Edit2, Eye, Printer, AlertCircle, CheckCircle, Loader2, Bell, Shield, XCircle, Receipt, Truck, Save, Sparkles, LayoutGrid, Table as TableIcon, Star, LogOut } from "lucide-react";
import { validatePixKey, normalizePixKeyPhone, formatPixKey, detectPixKeyType } from "@/lib/pixValidation";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductAddonsManager from "./ProductAddonsManager";
import { ProductFlavorsManager } from "./ProductFlavorsManager";
import { ProductSizesManager } from "./ProductSizesManager";
import { ProductAddonsManagement, TemplatesTab, CategoriesTab, AddonsTab } from "./ProductAddonsManagement";
import { ProductFlavorsManagement } from "./ProductFlavorsManagement";
import { CombosManager } from "./CombosManager";
import { EditOrderDialog } from "./EditOrderDialog";
import { ReceiptDialog } from "./ReceiptDialog";
import { NotesDialog } from "./NotesDialog";
import { WhatsAppConfirmDialog } from "./WhatsAppConfirmDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
import { useNewOrderNotification } from "@/hooks/useNewOrderNotification";
import { useOrderStatuses } from "@/hooks/useOrderStatuses";
import { cn } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { MetricsComparison } from "./MetricsComparison";
import { useQueryClient } from '@tanstack/react-query';
import { PersonalDataSettings } from "@/components/settings/PersonalDataSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { OwnerDataSettings } from "@/components/settings/OwnerDataSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { LayoutSettings } from "@/components/settings/LayoutSettings";
import { StorePreview } from "./StorePreview";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { CouponsManager } from "./CouponsManager";
import { EmployeesManager } from "./EmployeesManager";
import { useEmployeeAccess } from "@/hooks/useEmployeeAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { CustomersReport } from "./CustomersReport";
import { BestSellingProductsReport } from "./BestSellingProductsReport";
import { RegisteredProductsReport } from "./RegisteredProductsReport";
import { OrdersReport } from "./OrdersReport";
import { ReportsFilters } from "./ReportsFilters";
import { useDateRangeFilter } from "@/hooks/useDateRangeFilter";
import { DeliveryZonesManager } from "./DeliveryZonesManager";
import { PickupLocationsManager } from "./PickupLocationsManager";
import { WhatsAppMessageConfig } from "./WhatsAppMessageConfig";
import { SortableProductCard } from "./SortableProductCard";
import { SortableCategoryCard } from "./SortableCategoryCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import { Checkbox } from "@/components/ui/checkbox";

interface StoreOwnerDashboardProps {
  onSignOut?: () => void;
}

export const StoreOwnerDashboard = ({ onSignOut }: StoreOwnerDashboardProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isStoreOwner } = useUserRole();
  const employeeAccess = useEmployeeAccess();
  const { myStore, isLoading, updateStore } = useStoreManagement();
  const { products, createProduct, updateProduct, toggleProductAvailability, toggleProductFeatured, reorderProducts, deleteProduct } = useProductManagement(myStore?.id);
  const { orders, updateOrderStatus, updateOrder, isUpdating } = useStoreOrders(myStore?.id);
  
  // Log de render
  const renderCountRef = useRef(0);
  const prevMyStoreRef = useRef<typeof myStore>(null);
  renderCountRef.current++;

  console.log('[StoreOwnerDashboard] 🔄 Render #' + renderCountRef.current, {
    myStoreId: myStore?.id,
    myStoreUpdatedAt: myStore?.updated_at,
    prevMyStoreId: prevMyStoreRef.current?.id,
    prevMyStoreUpdatedAt: prevMyStoreRef.current?.updated_at,
    isLoading,
    timestamp: Date.now()
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


  // Mapeamento dinâmico entre status do banco (enum) e status_key customizado
  const getStatusKeyFromEnum = (enumStatus: string): string => {
    if (!customStatuses || customStatuses.length === 0) {
      return enumStatus;
    }
    
    // Mapa de fallback de enums comuns para status_key
    const enumToKeyMap: Record<string, string[]> = {
      'pending': ['pendente', 'pending', 'aguardando', 'novo'],
      'confirmed': ['confirmado', 'confirmed', 'aceito'],
      'preparing': ['preparando', 'preparing', 'separação', 'separacao', 'em_preparacao'],
      'ready': ['pronto', 'ready', 'finalizado'],
      'in_delivery': ['a_caminho', 'out_for_delivery', 'em_entrega', 'saiu_para_entrega'],
      'delivered': ['entregue', 'delivered', 'concluido', 'concluído'],
      'cancelled': ['cancelado', 'cancelled', 'cancelada']
    };
    
    // Procura o status customizado que corresponde ao enum
    const matchingStatus = customStatuses.find(s => {
      const possibleKeys = enumToKeyMap[enumStatus] || [enumStatus];
      return possibleKeys.includes(s.status_key.toLowerCase());
    });
    
    return matchingStatus?.status_key || enumStatus;
  };
  
  const getEnumFromStatusKey = (statusKey: string): string => {
    if (!customStatuses || customStatuses.length === 0) {
      return statusKey;
    }
    
    // Mapa de fallback de status_key para enums
    const keyToEnumMap: Record<string, string> = {
      'pendente': 'pending',
      'pending': 'pending',
      'aguardando': 'pending',
      'novo': 'pending',
      'confirmado': 'confirmed',
      'aceito': 'confirmed',
      'confirmed': 'confirmed',
      'preparando': 'preparing',
      'preparing': 'preparing',
      'separação': 'preparing',
      'separacao': 'preparing',
      'em_preparacao': 'preparing',
      'pronto': 'ready',
      'ready': 'ready',
      'finalizado': 'ready',
      'a_caminho': 'in_delivery',
      'out_for_delivery': 'in_delivery',
      'em_entrega': 'in_delivery',
      'saiu_para_entrega': 'in_delivery',
      'entregue': 'delivered',
      'delivered': 'delivered',
      'concluido': 'delivered',
      'concluído': 'delivered',
      'cancelado': 'cancelled',
      'cancelled': 'cancelled',
      'cancelada': 'cancelled'
    };
    
    return keyToEnumMap[statusKey.toLowerCase()] || statusKey;
  };

  // Funções de compatibilidade
  const normalizeStatusKey = getStatusKeyFromEnum;
  const denormalizeStatusKey = getEnumFromStatusKey;

  // Helpers para mudança de status conforme permissões
  const canChangeTo = (statusKey: string) => {
    if (hasPermission('orders', 'change_any_status')) return true;
    
    // Converter status customizado para enum primeiro
    const enumStatus = getEnumFromStatusKey(statusKey);
    
    const map: Record<string, string> = {
      'pending': 'change_status_pending',
      'confirmed': 'change_status_confirmed',
      'preparing': 'change_status_preparing',
      'ready': 'change_status_ready',
      'in_delivery': 'change_status_out_for_delivery',
      'out_for_delivery': 'change_status_out_for_delivery',
      'delivered': 'change_status_delivered',
      'cancelled': 'change_status_cancelled',
    };
    
    const perm = map[enumStatus];
    return perm ? hasPermission('orders', perm) : true; // Se não encontrar, permite (owner)
  };

  const { categories, loading: loadingCategories, addCategory, updateCategory, toggleCategoryStatus, deleteCategory, reorderCategories } = useCategories(myStore?.id);
  
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
    external_code: '',
    is_featured: false,
  });

  const [activeProductTab, setActiveProductTab] = useState("info");

  const [storeForm, setStoreForm] = useState<StoreFormData>({
    name: myStore?.name || '',
    slug: myStore?.slug || '',
    logo_url: myStore?.logo_url || '',
    banner_url: myStore?.banner_url || '',
    description: myStore?.description || '',
    category: myStore?.category || 'Outros',
    delivery_fee: myStore?.delivery_fee || 0,
    min_order_value: myStore?.min_order_value || 0,
    avg_delivery_time: myStore?.avg_delivery_time || 30,
    show_avg_delivery_time: (myStore as any)?.show_avg_delivery_time ?? true,
    accepts_delivery: myStore?.accepts_delivery ?? true,
    accepts_pickup: myStore?.accepts_pickup ?? true,
    accepts_pix: myStore?.accepts_pix ?? true,
    accepts_card: myStore?.accepts_card ?? true,
    accepts_cash: myStore?.accepts_cash ?? true,
    address: myStore?.address || '',
    pickup_address: myStore?.pickup_address || '',
    store_cep: (myStore as any)?.store_cep || '',
    store_city: (myStore as any)?.store_city || '',
    store_street: (myStore as any)?.store_street || '',
    store_street_number: (myStore as any)?.store_street_number || '',
    store_neighborhood: (myStore as any)?.store_neighborhood || '',
    store_complement: (myStore as any)?.store_complement || '',
    phone: myStore?.phone || '',
    whatsapp: (myStore as any)?.whatsapp || '',
    menu_label: myStore?.menu_label || 'Cardápio',
    pix_key: (myStore as any)?.pix_key || '',
    show_pix_key_to_customer: (myStore as any)?.show_pix_key_to_customer ?? true,
    pix_message_enabled: (myStore as any)?.pix_message_enabled ?? false,
    pix_message_title: (myStore as any)?.pix_message_title || '',
    pix_message_description: (myStore as any)?.pix_message_description || '',
    pix_message_footer: (myStore as any)?.pix_message_footer || '',
    pix_message_button_text: (myStore as any)?.pix_message_button_text || '',
    pix_copiacola_message_enabled: (myStore as any)?.pix_copiacola_message_enabled ?? false,
    pix_copiacola_message_title: (myStore as any)?.pix_copiacola_message_title || '',
    pix_copiacola_message_description: (myStore as any)?.pix_copiacola_message_description || '',
    pix_copiacola_message_footer: (myStore as any)?.pix_copiacola_message_footer || '',
    pix_copiacola_message_button_text: (myStore as any)?.pix_copiacola_message_button_text || '',
    pix_copiacola_button_text: (myStore as any)?.pix_copiacola_button_text || '',
    allow_orders_when_closed: (myStore as any)?.allow_orders_when_closed ?? false,
    require_delivery_zone: (myStore as any)?.require_delivery_zone ?? false,
    product_layout_template: (myStore as any)?.product_layout_template || 'template-4',
    product_layout_template_desktop: (myStore as any)?.product_layout_template_desktop || 'template-4',
    product_layout_template_mobile: (myStore as any)?.product_layout_template_mobile || 'template-2',
    show_address_on_store_page: (myStore as any)?.show_address_on_store_page ?? true,
    show_phone_on_store_page: (myStore as any)?.show_phone_on_store_page ?? true,
    show_whatsapp_on_store_page: (myStore as any)?.show_whatsapp_on_store_page ?? true,
  });

  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Não foi possível encontrar o endereço para este CEP.",
          variant: "destructive",
        });
        return;
      }

      setStoreForm(prev => ({
        ...prev,
        store_street: data.logradouro || "",
        store_neighborhood: data.bairro || "",
        store_city: data.localidade || "",
      }));
      
      toast({
        title: "Endereço preenchido",
        description: "Os dados do endereço foram preenchidos automaticamente.",
      });
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Ocorreu um erro ao buscar o endereço. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    // Remove tudo que não é número
    const cleanCep = value.replace(/\D/g, "");
    
    // Aplica a máscara 00000-000
    let maskedCep = cleanCep;
    if (cleanCep.length > 5) {
      maskedCep = cleanCep.slice(0, 5) + "-" + cleanCep.slice(5, 8);
    }
    
    // Atualiza o formulário com o valor formatado
    setStoreForm(prev => ({ ...prev, store_cep: maskedCep }));
    
    // Busca o endereço quando tiver 8 dígitos
    if (cleanCep.length === 8) {
      fetchAddressByCep(cleanCep);
    }
  };

  const [pixValidation, setPixValidation] = useState<{ isValid: boolean; type: string; message: string }>({
    isValid: true,
    type: 'empty',
    message: ''
  });

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [productToDuplicate, setProductToDuplicate] = useState<any>(null);
  const [duplicatingFromProductId, setDuplicatingFromProductId] = useState<string | null>(null);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [categoryStatusFilter, setCategoryStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [slugAvailability, setSlugAvailability] = useState<{
    isChecking: boolean;
    isAvailable: boolean | null;
    message: string;
  }>({ isChecking: false, isAvailable: null, message: '' });
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'received' | 'pending'>('all');
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<'all' | 'delivery' | 'pickup'>('all');
  const [scheduledFilter, setScheduledFilter] = useState<'all' | 'scheduled' | 'normal'>('all');
  const [orderSortBy, setOrderSortBy] = useState<'newest' | 'oldest'>('newest');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [productViewMode, setProductViewMode] = useState<'grid' | 'table'>('grid');
  const [localProducts, setLocalProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);
  const [bulkCategoryChange, setBulkCategoryChange] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'category' | 'price' | 'promotional_price' | 'external_code' | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc',
  });
  const [isReorderCategoriesMode, setIsReorderCategoriesMode] = useState(false);
  const [categoryViewMode, setCategoryViewMode] = useState<'grid' | 'table'>('grid');
  const [localCategories, setLocalCategories] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());
  const [currentOrderPage, setCurrentOrderPage] = useState(1);
  const ordersPerPage = 10;
  const [currentHomeOrderPage, setCurrentHomeOrderPage] = useState(1);
  const homeOrdersPerPage = 10;
  
  // Rastrear se algum modal está aberto para pausar invalidações
  const isAnyModalOpen = useMemo(() => {
    return isProductDialogOpen || 
           isCategoryDialogOpen || 
           isEditCategoryDialogOpen || 
           isHoursDialogOpen ||
           isDuplicateDialogOpen;
  }, [isProductDialogOpen, isCategoryDialogOpen, isEditCategoryDialogOpen, isHoursDialogOpen, isDuplicateDialogOpen]);

  // Enable automatic WhatsApp notifications (pausar quando modais estão abertos)
  useOrderStatusNotification(myStore?.id, { pauseInvalidations: isAnyModalOpen });
  
  // Enable real-time new order notifications with sound (pausar quando modais estão abertos)
  useNewOrderNotification(myStore?.id, { pauseInvalidations: isAnyModalOpen });
  
  // Gerenciar aba ativa via URL para persistir ao recarregar
  const tabFromUrl = searchParams.get('tab') || 'home';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  
  // Sincronizar estado quando a URL mudar (ex: ao recarregar a página)
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  
  // Atualizar URL quando a aba mudar pelo usuário
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (activeTab !== currentTab) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('tab', activeTab);
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // Sync local products with fetched products
  useEffect(() => {
    if (products) {
      setLocalProducts(products);
    }
  }, [products]);

  // Sync local categories with fetched categories
  useEffect(() => {
    if (categories) {
      setLocalCategories(categories);
    }
  }, [categories]);

  // Sync store form with myStore data (único ponto de sincronização)
  useEffect(() => {
    if (myStore) {
      console.log('[StoreOwnerDashboard] 📊 useEffect[myStore] disparado:', {
        storeId: myStore.id,
        storeUpdatedAt: myStore.updated_at,
        prevStoreId: prevMyStoreRef.current?.id,
        prevUpdatedAt: prevMyStoreRef.current?.updated_at,
        willUpdate: !(prevMyStoreRef.current?.id === myStore.id && prevMyStoreRef.current?.updated_at === myStore.updated_at),
        timestamp: Date.now()
      });
      
      // Comparar IDs e timestamps para evitar updates desnecessários
      const isSameStore = prevMyStoreRef.current?.id === myStore.id && 
                          prevMyStoreRef.current?.updated_at === myStore.updated_at;
      
      if (isSameStore) {
        console.log('[StoreOwnerDashboard] ⏭️ Store não mudou, pulando sincronização');
        return;
      }

      console.log('[StoreOwnerDashboard] 🏪 Carregando dados da loja no formulário:', {
        store_id: myStore.id,
        store_name: myStore.name,
        address_fields: {
          store_cep: (myStore as any)?.store_cep,
          store_city: (myStore as any)?.store_city,
          store_street: (myStore as any)?.store_street,
          store_street_number: (myStore as any)?.store_street_number,
          store_neighborhood: (myStore as any)?.store_neighborhood,
          store_complement: (myStore as any)?.store_complement,
        }
      });
      
      const newFormData: StoreFormData = {
        name: myStore.name || '',
        slug: myStore.slug || '',
        logo_url: myStore.logo_url || '',
        banner_url: myStore.banner_url || '',
        description: myStore.description || '',
        category: myStore.category || 'Outros',
        delivery_fee: myStore.delivery_fee || 0,
        min_order_value: myStore.min_order_value || 0,
        avg_delivery_time: myStore.avg_delivery_time || 30,
        show_avg_delivery_time: (myStore as any)?.show_avg_delivery_time ?? true,
        accepts_delivery: myStore.accepts_delivery ?? true,
        accepts_pickup: myStore.accepts_pickup ?? true,
        accepts_pix: myStore.accepts_pix ?? true,
        accepts_card: myStore.accepts_card ?? true,
        accepts_cash: myStore.accepts_cash ?? true,
        address: myStore.address || '',
        pickup_address: myStore.pickup_address || '',
        store_cep: (myStore as any)?.store_cep || '',
        store_city: (myStore as any)?.store_city || '',
        store_street: (myStore as any)?.store_street || '',
        store_street_number: (myStore as any)?.store_street_number || '',
        store_neighborhood: (myStore as any)?.store_neighborhood || '',
        store_complement: (myStore as any)?.store_complement || '',
        phone: myStore.phone || '',
        whatsapp: (myStore as any)?.whatsapp || '',
        menu_label: myStore.menu_label || 'Cardápio',
        pix_key: (myStore as any)?.pix_key || '',
        show_pix_key_to_customer: (myStore as any)?.show_pix_key_to_customer ?? true,
        pix_message_enabled: (myStore as any)?.pix_message_enabled ?? false,
        pix_message_title: (myStore as any)?.pix_message_title || '',
        pix_message_description: (myStore as any)?.pix_message_description || '',
        pix_message_footer: (myStore as any)?.pix_message_footer || '',
        pix_message_button_text: (myStore as any)?.pix_message_button_text || '',
        pix_copiacola_message_enabled: (myStore as any)?.pix_copiacola_message_enabled ?? false,
        pix_copiacola_message_title: (myStore as any)?.pix_copiacola_message_title || '',
        pix_copiacola_message_description: (myStore as any)?.pix_copiacola_message_description || '',
        pix_copiacola_message_footer: (myStore as any)?.pix_copiacola_message_footer || '',
        pix_copiacola_message_button_text: (myStore as any)?.pix_copiacola_message_button_text || '',
        pix_copiacola_button_text: (myStore as any)?.pix_copiacola_button_text || '',
        allow_orders_when_closed: (myStore as any)?.allow_orders_when_closed ?? false,
        require_delivery_zone: (myStore as any)?.require_delivery_zone ?? false,
        product_layout_template: (myStore as any)?.product_layout_template || 'template-4',
        product_layout_template_desktop: (myStore as any)?.product_layout_template_desktop || 'template-4',
        product_layout_template_mobile: (myStore as any)?.product_layout_template_mobile || 'template-2',
        show_address_on_store_page: (myStore as any)?.show_address_on_store_page ?? true,
        show_phone_on_store_page: (myStore as any)?.show_phone_on_store_page ?? true,
        show_whatsapp_on_store_page: (myStore as any)?.show_whatsapp_on_store_page ?? true,
      };
      
      console.log('📝 [StoreOwnerDashboard] Formulário atualizado:', {
        address_fields: {
          store_cep: newFormData.store_cep,
          store_city: newFormData.store_city,
          store_street: newFormData.store_street,
          store_street_number: newFormData.store_street_number,
          store_neighborhood: newFormData.store_neighborhood,
          store_complement: newFormData.store_complement,
        }
      });
      
      setStoreForm(newFormData);
      prevMyStoreRef.current = myStore;

      // Validar chave PIX inicial quando existir
      if ((myStore as any)?.pix_key) {
        const validation = validatePixKey((myStore as any).pix_key);
        setPixValidation(validation);
      }
    }
  }, [myStore]);

  // Memoize filtered products for bulk operations
  const filteredProducts = useMemo(() => {
    const displayProducts = isReorderMode ? localProducts : products;
    let filtered = displayProducts
      ?.filter(product => categoryFilter === 'all' || product.category === categoryFilter)
      .filter(product => {
        if (productStatusFilter === 'active') return product.is_available;
        if (productStatusFilter === 'inactive') return !product.is_available;
        return true;
      })
      .filter(product => {
        if (!productSearchTerm) return true;
        const searchLower = productSearchTerm.toLowerCase();
        return product.name.toLowerCase().includes(searchLower) ||
               product.description?.toLowerCase().includes(searchLower) ||
               product.external_code?.toLowerCase().includes(searchLower);
      }) || [];

    // Apply sorting
    if (sortConfig.key && productViewMode === 'table') {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (sortConfig.key === 'price' || sortConfig.key === 'promotional_price') {
          const numA = Number(aValue) || 0;
          const numB = Number(bValue) || 0;
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }
        
        const strA = String(aValue).toLowerCase();
        const strB = String(bValue).toLowerCase();
        
        if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [isReorderMode, localProducts, products, categoryFilter, productStatusFilter, productSearchTerm, sortConfig, productViewMode]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedProducts([]);
  }, [categoryFilter, productStatusFilter, productSearchTerm, productViewMode]);

  // Clear sort when changing view mode
  useEffect(() => {
    if (productViewMode === 'grid') {
      setSortConfig({ key: null, direction: 'asc' });
    }
  }, [productViewMode]);

  // Handle column sort
  const handleSort = (key: 'name' | 'category' | 'price' | 'promotional_price' | 'external_code') => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    } as const));
  };

  // Sort indicator component
  const SortIndicator = ({ column }: { column: 'name' | 'category' | 'price' | 'promotional_price' | 'external_code' }) => {
    const isActive = sortConfig.key === column;
    
    if (!isActive) {
      return <ArrowUp className="w-3 h-3 text-muted-foreground/30" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-primary" />
      : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for product reordering by category
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalProducts((items) => {
        const activeProduct = items.find((item) => item.id === active.id);
        const overProduct = items.find((item) => item.id === over.id);
        
        // Only allow reordering within the same category
        if (!activeProduct || !overProduct || activeProduct.category !== overProduct.category) {
          return items;
        }
        
        // Get all products from the same category
        const categoryProducts = items.filter(p => p.category === activeProduct.category);
        const otherProducts = items.filter(p => p.category !== activeProduct.category);
        
        // Find indices within the category
        const oldIndex = categoryProducts.findIndex((item) => item.id === active.id);
        const newIndex = categoryProducts.findIndex((item) => item.id === over.id);
        
        // Reorder within category
        const reorderedCategoryProducts = arrayMove(categoryProducts, oldIndex, newIndex);
        
        // Update display_order for reordered category products
        const updates = reorderedCategoryProducts.map((product, index) => ({
          id: product.id,
          display_order: index + 1,
        }));
        
        // Save to backend
        reorderProducts(updates);
        
        // Merge back with other products, maintaining category grouping
        const newOrder = [...otherProducts, ...reorderedCategoryProducts].sort((a, b) => {
          // First sort by category
          if (a.category < b.category) return -1;
          if (a.category > b.category) return 1;
          // Then by display_order within category
          return (a.display_order || 0) - (b.display_order || 0);
        });
        
        return newOrder;
      });
    }
  };

  // Handle drag end for category reordering
  const handleDragEndCategories = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const reorderedCategories = arrayMove(items, oldIndex, newIndex);
        
        // Save to backend
        reorderCategories(reorderedCategories);
        
        return reorderedCategories;
      });
    }
  };
  
  const { 
    periodFilter: reportsPeriodFilter, 
    setPeriodFilter: setReportsPeriodFilter,
    customDateRange: reportsCustomDateRange,
    setCustomDateRange: setReportsCustomDateRange,
    dateRange: reportsDateRange 
  } = useDateRangeFilter();
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [statsStatusFilter, setStatsStatusFilter] = useState<string>("all");
  const [statsPaymentFilter, setStatsPaymentFilter] = useState<'all' | 'received' | 'pending'>('all');
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
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [notesOrder, setNotesOrder] = useState<any>(null);
  const [isWhatsAppConfirmOpen, setIsWhatsAppConfirmOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    newStatus: string;
  } | null>(null);

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
  }, [employeeAccess.isEmployee, employeeAccess.permissions, canViewAllOrders, canViewPendingOrders, canViewConfirmedOrders, canViewPreparingOrders, canViewOutForDeliveryOrders, canViewDeliveredOrders, canViewCancelledOrders, customStatuses]);

  // (removido) havia um segundo useEffect sincronizando storeForm com myStore,
  // o que sobrescrevia os campos de endereço personalizados. Agora toda a
  // sincronização acontece apenas no useEffect acima.


  // Reset current page when filters change
  useEffect(() => {
    setCurrentOrderPage(1);
  }, [orderStatusFilter, dateFilter, customDateRange, orderSearchTerm]);

  // Reset home page when period filter changes
  useEffect(() => {
    setCurrentHomeOrderPage(1);
  }, [periodFilter, customDateRange]);

  // Sanitize slug in real-time
  const sanitizeSlug = (value: string) => {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9-]/g, '') // Only letters, numbers, hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  };

  // Check slug availability
  useEffect(() => {
    if (!storeForm.slug || storeForm.slug === myStore?.slug) {
      setSlugAvailability({ isChecking: false, isAvailable: null, message: '' });
      return;
    }

    const timer = setTimeout(async () => {
      setSlugAvailability({ isChecking: true, isAvailable: null, message: '' });

      const { data, error } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', storeForm.slug)
        .maybeSingle();

      if (error) {
        console.error('Error checking slug:', error);
        setSlugAvailability({ isChecking: false, isAvailable: null, message: 'Erro ao verificar disponibilidade' });
        return;
      }

      if (data) {
        setSlugAvailability({ isChecking: false, isAvailable: false, message: 'Esta URL já está em uso' });
      } else {
        setSlugAvailability({ isChecking: false, isAvailable: true, message: 'URL disponível' });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [storeForm.slug, myStore?.slug]);

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
    return orders.filter(order => {
      const normalizedFilterStatus = getEnumFromStatusKey(statsStatusFilter);
      const matchesStatus = statsStatusFilter === "all" || order.status === normalizedFilterStatus;
      const matchesPayment = statsPaymentFilter === 'all' || 
        (statsPaymentFilter === 'received' && order.payment_received === true) ||
        (statsPaymentFilter === 'pending' && order.payment_received !== true);
      return matchesStatus && matchesPayment;
    });
    }

    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      const matchesDate = isWithinInterval(orderDate, { start: startDate, end: endDate });
      const normalizedFilterStatus = getEnumFromStatusKey(statsStatusFilter);
      const matchesStatus = statsStatusFilter === "all" || order.status === normalizedFilterStatus;
      const matchesPayment = statsPaymentFilter === 'all' || 
        (statsPaymentFilter === 'received' && order.payment_received === true) ||
        (statsPaymentFilter === 'pending' && order.payment_received !== true);
      return matchesDate && matchesStatus && matchesPayment;
    });
  }, [orders, periodFilter, customDateRange, statsStatusFilter, statsPaymentFilter]);

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
      const matchesDate = isWithinInterval(orderDate, { start: previousStartDate, end: previousEndDate });
      const normalizedFilterStatus = getEnumFromStatusKey(statsStatusFilter);
      const matchesStatus = statsStatusFilter === "all" || order.status === normalizedFilterStatus;
      const matchesPayment = statsPaymentFilter === 'all' || 
        (statsPaymentFilter === 'received' && order.payment_received === true) ||
        (statsPaymentFilter === 'pending' && order.payment_received !== true);
      return matchesDate && matchesStatus && matchesPayment;
    });
  }, [orders, periodFilter, customDateRange, statsStatusFilter, statsPaymentFilter]);

  // Calculate metrics
  const totalOrders = filteredOrders?.length || 0;
  const totalRevenue = filteredOrders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const completedOrders = filteredOrders?.filter(o => o.status === 'delivered').length || 0;
  const pendingOrders = filteredOrders?.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length || 0;
  
  // Calculate payment metrics
  const receivedPaymentsCount = filteredOrders?.filter(o => o.payment_received === true).length || 0;
  const pendingPaymentsCount = filteredOrders?.filter(o => o.payment_received !== true).length || 0;
  const receivedPaymentsValue = filteredOrders?.filter(o => o.payment_received === true).reduce((sum, order) => sum + Number(order.total), 0) || 0;
  const pendingPaymentsValue = filteredOrders?.filter(o => o.payment_received !== true).reduce((sum, order) => sum + Number(order.total), 0) || 0;

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
      
      // Filtro de status - normalizar ambos os lados da comparação
      if (orderStatusFilter !== 'all') {
        const normalizedFilterStatus = getEnumFromStatusKey(orderStatusFilter);
        if (order.status !== normalizedFilterStatus) {
          return false;
        }
      }

      // Filtro de status de pagamento
      if (paymentStatusFilter === 'received' && !order.payment_received) {
        return false;
      }
      if (paymentStatusFilter === 'pending' && order.payment_received) {
        return false;
      }

      // Filtro de tipo de entrega
      if (deliveryTypeFilter === 'delivery' && order.delivery_type !== 'delivery') {
        return false;
      }
      if (deliveryTypeFilter === 'pickup' && order.delivery_type !== 'pickup') {
        return false;
      }

      // Filtro de pedidos agendados
      if (scheduledFilter !== 'all' && myStore?.operating_hours) {
        const orderDate = new Date(order.created_at);
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][orderDate.getDay()];
        const orderTime = `${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`;
        
        const daySchedule = myStore.operating_hours?.[dayOfWeek];
        if (daySchedule) {
          const wasOpen = !daySchedule.is_closed && orderTime >= daySchedule.open && orderTime <= daySchedule.close;
          const isScheduled = !wasOpen && myStore.allow_orders_when_closed;
          
          if (scheduledFilter === 'scheduled' && !isScheduled) {
            return false;
          }
          if (scheduledFilter === 'normal' && isScheduled) {
            return false;
          }
        }
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
    }).sort((a, b) => {
      // Ordenação por data
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return orderSortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [orders, orderStatusFilter, paymentStatusFilter, deliveryTypeFilter, scheduledFilter, orderSortBy, dateFilter, customDateRange, orderSearchTerm, myStore]);

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

  // Filter categories based on status
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    
    if (categoryStatusFilter === 'all') return categories;
    if (categoryStatusFilter === 'active') return categories.filter(c => c.is_active);
    if (categoryStatusFilter === 'inactive') return categories.filter(c => !c.is_active);
    
    return categories;
  }, [categories, categoryStatusFilter]);

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

  const storeUrl = myStore ? `https://ofertas.app/${myStore.slug}` : '';

  const handleCopyUrl = async () => {
    if (storeUrl) {
      await navigator.clipboard.writeText(storeUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleCreateProduct = async () => {
    if (!myStore) return;
    
    if (!productForm.category.trim()) {
      toast({
        title: 'Categoria obrigatória',
        description: 'Por favor, selecione uma categoria para o produto.',
        variant: 'destructive',
      });
      return;
    }

    if (!productForm.price || productForm.price <= 0) {
      toast({
        title: 'Preço inválido',
        description: 'O preço do produto deve ser maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    if (productForm.promotional_price) {
      if (productForm.promotional_price > productForm.price) {
        toast({
          title: 'Preço promocional inválido',
          description: 'O preço promocional não pode ser maior que o preço normal.',
          variant: 'destructive',
        });
        return;
      }
      
      if (productForm.promotional_price <= 0) {
        toast({
          title: 'Preço promocional inválido',
          description: 'O preço promocional deve ser maior que zero ou deixe vazio.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validar código externo único dentro da loja
    if (productForm.external_code && productForm.external_code.trim()) {
      try {
        const { data, error } = await (supabase
          .from('products')
          .select('id') as any)
          .eq('store_id', myStore.id)
          .eq('external_code', productForm.external_code.trim())
          .limit(1)
          .single();

        if (data && !error) {
          toast({
            title: 'Código externo já existe',
            description: 'Este código já está cadastrado nesta loja',
            variant: 'destructive',
          });
          return;
        }
      } catch (err) {
        // Código externo não encontrado, ok para criar
      }
    }
    
    createProduct({
      ...productForm,
      store_id: myStore.id,
      promotional_price: productForm.promotional_price && productForm.promotional_price > 0 ? productForm.promotional_price : null,
      image_url: productForm.image_url || undefined,
      external_code: productForm.external_code?.trim() || undefined,
    }, {
      onSuccess: async (newProduct) => {
        // If duplicating, copy addons and flavors
        if (isDuplicating && duplicatingFromProductId) {
          try {
            // Fetch addons from original product
            const { data: addons } = await supabase
              .from('product_addons')
              .select('*')
              .eq('product_id', duplicatingFromProductId);

            // Fetch flavors from original product
            const { data: flavors } = await supabase
              .from('product_flavors')
              .select('*')
              .eq('product_id', duplicatingFromProductId);

            // Copy addons
            if (addons && addons.length > 0) {
              const addonsToInsert = addons.map(addon => ({
                product_id: newProduct.id,
                name: addon.name,
                price: addon.price,
                category_id: addon.category_id,
                is_available: addon.is_available,
                allow_quantity: addon.allow_quantity,
                display_order: addon.display_order,
              }));

              await supabase.from('product_addons').insert(addonsToInsert);
            }

            // Copy flavors
            if (flavors && flavors.length > 0) {
              const flavorsToInsert = flavors.map(flavor => ({
                product_id: newProduct.id,
                name: flavor.name,
                description: flavor.description,
                price: flavor.price,
                is_available: flavor.is_available,
                display_order: flavor.display_order,
              }));

              await supabase.from('product_flavors').insert(flavorsToInsert);
            }

            toast({
              title: 'Produto duplicado com sucesso!',
              description: `${addons?.length || 0} complementos e ${flavors?.length || 0} sabores foram copiados.`,
            });
          } catch (error) {
            console.error('Error copying addons/flavors:', error);
            toast({
              title: 'Produto criado',
              description: 'Produto criado, mas houve erro ao copiar complementos/sabores.',
              variant: 'destructive',
            });
          }
        }

        setIsProductDialogOpen(false);
        setActiveProductTab("info");
        setIsDuplicating(false);
        setDuplicatingFromProductId(null);
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
          external_code: '',
          is_featured: false,
        });
      },
    });
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setActiveProductTab("info");
    setProductForm({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price,
      promotional_price: product.promotional_price || null,
      is_available: product.is_available,
      image_url: product.image_url || '',
      is_pizza: product.is_pizza || false,
      max_flavors: product.max_flavors || 2,
      external_code: product.external_code || '',
      is_featured: product.is_featured || false,
    });
    setIsProductDialogOpen(true);
  };

  const openDuplicateDialog = (product: any) => {
    setProductToDuplicate(product);
    setIsDuplicateDialogOpen(true);
  };

  const handleDuplicateProduct = (product: any) => {
    // Set flags for duplication
    setIsDuplicating(true);
    setDuplicatingFromProductId(product.id);
    setEditingProduct(null);
    setActiveProductTab("info");
    
    // Fill form with copied data
    setProductForm({
      name: `${product.name} (Cópia)`,
      description: product.description || '',
      category: product.category,
      price: product.price,
      promotional_price: product.promotional_price || null,
      is_available: product.is_available,
      image_url: product.image_url || '',
      is_pizza: product.is_pizza || false,
      max_flavors: product.max_flavors || 2,
      external_code: '', // Leave empty to avoid unique constraint violation
      is_featured: false,
    });
    
    // Open the product dialog
    setIsProductDialogOpen(true);
    
    toast({
      title: 'Produto copiado',
      description: 'Edite os dados e clique em salvar. Os complementos e sabores também serão copiados.',
    });
  };

  const confirmDuplicate = () => {
    if (productToDuplicate) {
      handleDuplicateProduct(productToDuplicate);
      setIsDuplicateDialogOpen(false);
      setProductToDuplicate(null);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    if (!productForm.category.trim()) {
      toast({
        title: 'Categoria obrigatória',
        description: 'Por favor, selecione uma categoria para o produto.',
        variant: 'destructive',
      });
      return;
    }

    if (!productForm.price || productForm.price <= 0) {
      toast({
        title: 'Preço inválido',
        description: 'O preço do produto deve ser maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    if (productForm.promotional_price) {
      if (productForm.promotional_price > productForm.price) {
        toast({
          title: 'Preço promocional inválido',
          description: 'O preço promocional não pode ser maior que o preço normal.',
          variant: 'destructive',
        });
        return;
      }
      
      if (productForm.promotional_price <= 0) {
        toast({
          title: 'Preço promocional inválido',
          description: 'O preço promocional deve ser maior que zero ou deixe vazio.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validar código externo único dentro da loja
    if (productForm.external_code && productForm.external_code.trim()) {
      try {
        const { data, error } = await (supabase
          .from('products')
          .select('id') as any)
          .eq('store_id', myStore!.id)
          .eq('external_code', productForm.external_code.trim())
          .neq('id', editingProduct.id)
          .limit(1)
          .single();

        if (data && !error) {
          toast({
            title: 'Código externo já existe',
            description: 'Este código já está cadastrado nesta loja',
            variant: 'destructive',
          });
          return;
        }
      } catch (err) {
        // Código externo não encontrado, ok para atualizar
      }
    }

    updateProduct({
      ...productForm,
      id: editingProduct.id,
      promotional_price: productForm.promotional_price && productForm.promotional_price > 0 ? productForm.promotional_price : null,
      image_url: productForm.image_url || undefined,
      external_code: productForm.external_code?.trim() || undefined,
    }, {
      onSuccess: () => {
        setIsProductDialogOpen(false);
        setEditingProduct(null);
        setActiveProductTab("info");
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
          external_code: '',
          is_featured: false,
        });
      },
    });
  };

  // Bulk actions handlers
  const handleToggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleToggleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkToggleAvailability = async (isAvailable: boolean) => {
    try {
      await Promise.all(
        selectedProducts.map(productId => 
          toggleProductAvailability({ id: productId, is_available: isAvailable })
        )
      );
      toast({
        title: 'Sucesso!',
        description: `${selectedProducts.length} produto(s) ${isAvailable ? 'ativados' : 'desativados'}!`,
      });
      setSelectedProducts([]);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar produtos',
        variant: 'destructive',
      });
    }
  };

  const handleBulkChangeCategory = async () => {
    if (!bulkCategoryChange) {
      toast({
        title: 'Categoria não selecionada',
        description: 'Por favor, selecione uma categoria',
        variant: 'destructive',
      });
      return;
    }

    try {
      await Promise.all(
        selectedProducts.map(productId => {
          const product = products?.find(p => p.id === productId);
          if (!product) return Promise.resolve();
          return updateProduct({
            ...product,
            category: bulkCategoryChange,
          });
        })
      );
      toast({
        title: 'Sucesso!',
        description: `${selectedProducts.length} produto(s) movidos para "${bulkCategoryChange}"!`,
      });
      setSelectedProducts([]);
      setBulkCategoryChange('');
      setIsBulkActionDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao alterar categoria dos produtos',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStore = async () => {
    if (!myStore) return;
    
    console.log('🔄 [handleUpdateStore] Iniciando atualização da loja');
    console.log('📝 [handleUpdateStore] Dados do formulário:', {
      address_data: {
        store_cep: storeForm.store_cep,
        store_city: storeForm.store_city,
        store_street: storeForm.store_street,
        store_street_number: storeForm.store_street_number,
        store_neighborhood: storeForm.store_neighborhood,
        store_complement: storeForm.store_complement,
      }
    });
    
    // Validação: impedir salvar se slug estiver em uso
    if (storeForm.slug !== myStore.slug && slugAvailability.isAvailable === false) {
      toast({
        title: "URL já está em uso",
        description: "Por favor, escolha outra URL para sua loja.",
        variant: "destructive",
      });
      return;
    }

    // Validação: impedir salvar se slug estiver vazio
    if (!storeForm.slug || storeForm.slug.trim() === '') {
      toast({
        title: "URL é obrigatória",
        description: "Por favor, preencha a URL da loja.",
        variant: "destructive",
      });
      return;
    }

    // Validação: verificar se ainda está checando disponibilidade
    if (slugAvailability.isChecking) {
      toast({
        title: "Aguarde",
        description: "Verificando disponibilidade da URL...",
      });
      return;
    }

    // Validação: verificar formato da chave PIX se preenchida
    if (storeForm.pix_key && storeForm.pix_key.trim() !== '') {
      const validation = validatePixKey(storeForm.pix_key);
      if (!validation.isValid) {
        toast({
          title: "Chave PIX inválida",
          description: "Por favor, verifique o formato da chave PIX. Use CPF, CNPJ, E-mail, Telefone ou Chave Aleatória.",
          variant: "destructive",
        });
        return;
      }
    }

    const oldSlug = myStore.slug;
    const newSlug = storeForm.slug;
    const isSlugChanging = oldSlug !== newSlug;

    // Se o slug está mudando, mostrar alerta de confirmação
    if (isSlugChanging) {
      const confirmed = window.confirm(
        `⚠️ ATENÇÃO: Você está mudando a URL da sua loja!\n\n` +
        `URL antiga: ofertas.app/${oldSlug}\n` +
        `URL nova: ofertas.app/${newSlug}\n\n` +
        `IMPORTANTE:\n` +
        `• Links antigos compartilhados não funcionarão mais\n` +
        `• WhatsApp NÃO será afetado (usa ID da loja, não a URL)\n` +
        `• Produtos e pedidos continuam normalmente\n\n` +
        `Deseja realmente continuar?`
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      await updateStore({
        id: myStore.id,
        name: storeForm.name,
        slug: storeForm.slug,
        category: storeForm.category,
        logo_url: storeForm.logo_url,
        banner_url: storeForm.banner_url,
        description: storeForm.description,
        delivery_fee: storeForm.delivery_fee,
        min_order_value: storeForm.min_order_value,
        avg_delivery_time: storeForm.avg_delivery_time,
        show_avg_delivery_time: storeForm.show_avg_delivery_time,
        accepts_delivery: storeForm.accepts_delivery,
        accepts_pickup: storeForm.accepts_pickup,
        accepts_pix: storeForm.accepts_pix,
        accepts_card: storeForm.accepts_card,
        accepts_cash: storeForm.accepts_cash,
        address: storeForm.address,
        pickup_address: storeForm.pickup_address,
        store_cep: storeForm.store_cep,
        store_city: storeForm.store_city,
        store_street: storeForm.store_street,
        store_street_number: storeForm.store_street_number,
        store_neighborhood: storeForm.store_neighborhood,
        store_complement: storeForm.store_complement,
        phone: storeForm.phone,
        whatsapp: (storeForm as any).whatsapp,
        menu_label: storeForm.menu_label,
        show_pix_key_to_customer: storeForm.show_pix_key_to_customer,
        pix_key: storeForm.pix_key,
        allow_orders_when_closed: storeForm.allow_orders_when_closed,
      } as any);

      // Se o slug foi alterado, limpar caches e localStorage
      if (isSlugChanging) {
        console.log(`🔄 Slug alterado de "${oldSlug}" para "${newSlug}"`);
        
        // Limpar localStorage que possa ter o slug antigo
        const lastVisited = localStorage.getItem('lastVisitedStore');
        if (lastVisited) {
          try {
            const parsed = JSON.parse(lastVisited);
            if (parsed.slug === oldSlug) {
              localStorage.removeItem('lastVisitedStore');
              console.log('🧹 localStorage limpo');
            }
          } catch (e) {
            console.error('Erro ao limpar localStorage:', e);
          }
        }

        // Invalidar todas as queries relacionadas à loja
        queryClient.invalidateQueries({ queryKey: ['store', oldSlug] });
        queryClient.invalidateQueries({ queryKey: ['store', newSlug] });
        queryClient.invalidateQueries({ queryKey: ['stores'] });
        queryClient.invalidateQueries({ queryKey: ['my-store'] });
        
        console.log('✅ WhatsApp mantido - usa store_id, não slug');
        
        toast({
          title: "✅ URL atualizada com sucesso!",
          description: `Nova URL: ofertas.app/${newSlug}\n\n✓ WhatsApp mantido (usa ID da loja)`,
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar loja:', error);
    }
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

  const handleUpdateDeliveryOption = async (field: string, value: boolean) => {
    if (!myStore?.id) return;
    
    try {
      await updateStore({
        id: myStore.id,
        name: myStore.name,
        slug: myStore.slug,
        category: myStore.category,
        [field]: value,
      });
      
      setStoreForm({ ...storeForm, [field]: value });
      
      toast({
        title: "Configuração atualizada",
        description: "A alteração foi salva com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar a alteração.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/20">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-lg font-medium text-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
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

    // Função para escapar HTML
    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const orderItems = order.order_items || [];
    console.log('[Print] Order items:', orderItems);
    const itemsHtml = orderItems.map((item: any) => {
      console.log('[Print] Item structure:', item);
      console.log('[Print] Item products:', item.products);
      
      const addons = item.order_item_addons?.map((addon: any) => 
        `<div style="margin-left: 20px; font-size: 12px;">+ ${escapeHtml(addon.addon_name)} - R$ ${addon.addon_price.toFixed(2)}</div>`
      ).join('') || '';
      
      const flavors = item.order_item_flavors?.map((flavor: any) => 
        `<div style="margin-left: 20px; font-size: 12px;">• ${escapeHtml(flavor.flavor_name)}</div>`
      ).join('') || '';

      // Tenta pegar o external_code de diferentes formas
      let externalCode = '';
      if (item.products?.external_code) {
        externalCode = ` (Cód: ${escapeHtml(item.products.external_code)})`;
      } else if (Array.isArray(item.products) && item.products[0]?.external_code) {
        externalCode = ` (Cód: ${escapeHtml(item.products[0].external_code)})`;
      }
      
      console.log('[Print] External code for', item.product_name, ':', externalCode);

      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity}x ${escapeHtml(item.product_name)}${externalCode}</td>
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
            <div class="info-row"><strong>Status Pgto:</strong> ${order.payment_received ? 'Pagamento recebido' : 'Pagamento pendente'}</div>
            ${order.delivery_type === 'delivery' ? `
              <div class="info-row">
                <strong>Endereço:</strong> ${order.delivery_street}, ${order.delivery_number}
                ${order.delivery_complement ? ` - ${order.delivery_complement}` : ''}
                - ${order.delivery_neighborhood}${(order as any).delivery_city ? ` - ${(order as any).delivery_city}` : ''}
              </div>
            ` : ''}
            ${order.notes ? `<div class="info-row"><strong>Observações do Cliente:</strong> ${escapeHtml(order.notes)}</div>` : ''}
            ${order.customer_notes ? `<div class="info-row" style="padding: 8px; margin-top: 8px;"><strong>Observações Externas:</strong><br/>${escapeHtml(order.customer_notes).replace(/\n/g, '<br/>')}</div>` : ''}
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
    <div className="flex h-full bg-background w-full overflow-hidden justify-center">
      <div className="flex w-full max-w-[1800px]">
        {/* Mobile Sidebar (Drawer) */}
        <DashboardMobileSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          storeLogo={myStore?.logo_url}
          storeName={myStore?.name}
          isEmployee={employeeAccess.isEmployee}
          employeePermissions={employeeAccess.permissions}
          onSignOut={onSignOut}
        />
        
        {/* Desktop Sidebar */}
        <DashboardSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          storeLogo={myStore?.logo_url}
          storeName={myStore?.name}
          isEmployee={employeeAccess.isEmployee}
          employeePermissions={employeeAccess.permissions}
          onSignOut={onSignOut}
        />
      
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="w-full">
        {/* Home Tab */}
        <div className={cn("p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 w-full", activeTab !== 'home' && 'hidden')}>

            {/* Store Header */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-gray-200/50 dark:border-gray-700/50 shadow-lg overflow-hidden relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-100/30 via-purple-100/20 to-pink-100/10 dark:from-blue-900/20 dark:via-purple-900/10 dark:to-pink-900/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
                        {/* Logo em Mobile / Nome em Desktop */}
                        <div className="flex items-center gap-3">
                          {myStore?.logo_url && (
                            <motion.img
                              src={myStore.logo_url}
                              alt={myStore.name}
                              className="h-10 w-10 object-contain rounded-lg md:hidden"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.3 }}
                            />
                          )}
                          
                          <motion.h2 
                            className="text-3xl font-bold gradient-text hidden md:block"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            {myStore?.name}
                          </motion.h2>
                        </div>
                        
                        {/* Badges de Papel */}
                        <div className="flex items-center gap-2 flex-wrap">
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
                        </div>
                        
                        {/* Status da Loja e WhatsApp */}
                        <div className="flex items-center gap-2 flex-wrap">
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
                      className="flex flex-col items-end gap-2"
                    >
                      {onSignOut && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10"
                          onClick={onSignOut}
                        >
                          <LogOut className="w-3.5 h-3.5 mr-1.5" />
                          Sair
                        </Button>
                      )}
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
                      value={`https://ofertas.app/${myStore?.slug || ''}`}
                      readOnly
                      className="flex-1 bg-muted/50"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(`https://ofertas.app/${myStore?.slug || ''}`);
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
                      customStatuses
                        .filter(status => status.is_active && status.status_key && status.status_key.trim() !== '')
                        .map((status) => (
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

                <Select value={statsPaymentFilter} onValueChange={(value: 'all' | 'received' | 'pending') => setStatsPaymentFilter(value)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Status Pgto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">💳 Todos</SelectItem>
                    <SelectItem value="received">✅ Pgto Recebido</SelectItem>
                    <SelectItem value="pending">⏳ Pgto Pendente</SelectItem>
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
                <Card className="hover-scale overflow-hidden relative border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/50 to-purple-100/30 dark:from-blue-900/20 dark:to-purple-900/10 rounded-full -mr-16 -mt-16" />
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
                <Card className="hover-scale overflow-hidden relative border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100/50 to-emerald-100/30 dark:from-green-900/20 dark:to-emerald-900/10 rounded-full -mr-16 -mt-16" />
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
                <Card className="hover-scale overflow-hidden relative border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100/50 to-pink-100/30 dark:from-purple-900/20 dark:to-pink-900/10 rounded-full -mr-16 -mt-16" />
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
                <Card className="hover-scale overflow-hidden relative border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/50 to-cyan-100/30 dark:from-blue-900/20 dark:to-cyan-900/10 rounded-full -mr-16 -mt-16" />
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

            {/* Payment Status Card */}
            <div className="grid gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="hover-scale overflow-hidden relative border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100/50 to-yellow-100/30 dark:from-amber-900/20 dark:to-yellow-900/10 rounded-full -mr-16 -mt-16" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium">Status de Pagamento</CardTitle>
                    <DollarSign className="h-5 w-5 text-amber-500" />
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-xs text-muted-foreground">Pgto Recebido</span>
                        </div>
                        <div className="text-2xl font-bold text-green-500">
                          R$ {receivedPaymentsValue.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {receivedPaymentsCount} {receivedPaymentsCount === 1 ? 'pedido' : 'pedidos'}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                          <span className="text-xs text-muted-foreground">Pgto Pendente</span>
                        </div>
                        <div className="text-2xl font-bold text-amber-500">
                          R$ {pendingPaymentsValue.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {pendingPaymentsCount} {pendingPaymentsCount === 1 ? 'pedido' : 'pedidos'}
                        </p>
                      </div>
                    </div>
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
                    <Card className="shadow-lg border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                      <CardHeader className="bg-gradient-to-r from-blue-100/30 to-transparent dark:from-blue-900/20">
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
                    <Card className="shadow-lg border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                      <CardHeader className="bg-gradient-to-r from-green-100/30 to-transparent dark:from-green-900/20">
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
                      <Card className="shadow-lg border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                        <CardHeader className="bg-gradient-to-r from-blue-100/30 to-transparent dark:from-blue-900/20">
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
                      <Card className="shadow-lg border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                        <CardHeader className="bg-gradient-to-r from-purple-100/30 to-transparent dark:from-purple-900/20">
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
        </div>
        
        {/* Metricas Tab */}
        <div className={cn("p-3 sm:p-4 md:p-6 lg:p-8", activeTab !== 'metricas' && 'hidden')}>
          <MetricsComparison orders={orders} products={products} />
        </div>

        {/* Pedidos Tab */}
        <div className={cn("p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6", activeTab !== 'pedidos' && 'hidden')}>
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
                  
                  <Select
                    value={paymentStatusFilter}
                    onValueChange={(value: 'all' | 'received' | 'pending') => setPaymentStatusFilter(value)}
                  >
                    <SelectTrigger className="w-full sm:w-[200px] bg-background z-50">
                      <SelectValue placeholder="Status Pgto" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="all">💳 Todos</SelectItem>
                      <SelectItem value="received">✅ Pgto Recebido</SelectItem>
                      <SelectItem value="pending">⏳ Pgto Pendente</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={deliveryTypeFilter}
                    onValueChange={(value: 'all' | 'delivery' | 'pickup') => setDeliveryTypeFilter(value)}
                  >
                    <SelectTrigger className="w-full sm:w-[200px] bg-background z-50">
                      <SelectValue placeholder="Tipo Entrega" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="all">🚚 Todos</SelectItem>
                      <SelectItem value="delivery">🚚 Entrega</SelectItem>
                      <SelectItem value="pickup">🏪 Retirada</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select 
                    value={scheduledFilter} 
                    onValueChange={(value: 'all' | 'scheduled' | 'normal') => setScheduledFilter(value)}
                  >
                    <SelectTrigger className="w-full sm:w-[200px] bg-background z-50">
                      <SelectValue placeholder="Tipo de Pedido" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="all">🕐 Todos os pedidos</SelectItem>
                      <SelectItem value="scheduled">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Agendados
                        </div>
                      </SelectItem>
                      <SelectItem value="normal">📦 Normais</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select 
                    value={orderSortBy} 
                    onValueChange={(value: 'newest' | 'oldest') => setOrderSortBy(value)}
                  >
                    <SelectTrigger className="w-full sm:w-[200px] bg-background z-50">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="newest">⬇️ Mais recente</SelectItem>
                      <SelectItem value="oldest">⬆️ Mais antigo</SelectItem>
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
                
                {customStatuses.filter(status => status.is_active).map((status) => {
                  // Normalizar tanto o status do banco quanto o status_key para comparação
                  const normalizedStatusKey = getEnumFromStatusKey(status.status_key);
                  const statusCount = orders?.filter(o => o.status === normalizedStatusKey).length || 0;
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
                      onClick={() => setActiveTab('result')}
                    >
                      Configurações → Status dos Pedidos
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
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-base md:text-lg">Pedido #{order.order_number}</h3>
                              {(() => {
                                // Verifica se o pedido foi feito fora do horário de funcionamento
                                if (myStore?.operating_hours) {
                                  const orderDate = new Date(order.created_at);
                                  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][orderDate.getDay()];
                                  const orderTime = `${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`;
                                  
                                  const daySchedule = myStore.operating_hours?.[dayOfWeek];
                                  if (daySchedule) {
                                    const wasOpen = !daySchedule.is_closed && orderTime >= daySchedule.open && orderTime <= daySchedule.close;
                                    const isScheduled = !wasOpen && myStore.allow_orders_when_closed;
                                    
                                    if (isScheduled) {
                                      return (
                                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300 flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          Agendado
                                        </Badge>
                                      );
                                    }
                                  }
                                }
                                return null;
                              })()}
                            </div>
                            <p className="text-xs md:text-sm text-muted-foreground">
                              {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <Badge variant="outline" className="capitalize text-xs self-start">
                            {customStatuses.find(s => getEnumFromStatusKey(s.status_key) === order.status)?.status_label || 
                             customStatuses.find(s => s.status_key === normalizeStatusKey(order.status))?.status_label ||
                             order.status}
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
                            <span className="font-medium capitalize">
                              {order.delivery_type === 'pickup' ? 'Retirada' : order.delivery_type === 'delivery' ? 'Entrega' : order.delivery_type}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pagamento:</span>
                            <span className="font-medium capitalize">{order.payment_method}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status Pgto:</span>
                            <Badge 
                              className={
                                (order as any).payment_received 
                                  ? "bg-green-600 text-white hover:bg-green-700" 
                                  : "bg-yellow-600 text-white hover:bg-yellow-700"
                              }
                            >
                              {(order as any).payment_received ? "Pagamento recebido" : "Pagamento pendente"}
                            </Badge>
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
                              <p className="text-muted-foreground">
                                {order.delivery_neighborhood}
                                {(order as any).delivery_city && ` - ${(order as any).delivery_city}`}
                              </p>
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
                              setReceiptOrder(order);
                              setIsReceiptDialogOpen(true);
                            }}
                            className="flex items-center justify-center gap-2 w-full sm:w-auto"
                          >
                            <Receipt className={`w-4 h-4 sm:w-5 sm:h-5 ${(order as any).payment_received ? 'text-green-600' : 'text-red-600'}`} />
                            Pagamento
                          </Button>
                          
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
                                setNotesOrder(order);
                                setIsNotesDialogOpen(true);
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
                            value={getStatusKeyFromEnum(order.status)}
                            disabled={isUpdating}
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
                              
                              // Abrir diálogo de confirmação de WhatsApp
                              setPendingStatusChange({
                                orderId: order.id,
                                orderNumber: order.order_number,
                                customerName: order.customer_name,
                                customerPhone: order.customer_phone,
                                newStatus: newStatus,
                              });
                              setIsWhatsAppConfirmOpen(true);
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              {isUpdating ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                                  <span>Atualizando...</span>
                                </div>
                              ) : (
                                <SelectValue placeholder="Alterar status" />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {customStatuses.length > 0 ? (
                                customStatuses
                                  .filter(status => status.is_active && status.status_key && status.status_key.trim() !== '')
                                  .sort((a, b) => a.display_order - b.display_order)
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
        </div>
        
        {/* Cupons Tab */}
        {myStore?.id && (
          <div className={cn("p-3 sm:p-4 md:p-6 lg:p-8", activeTab !== 'cupons' && 'hidden')}>
            <CouponsManager storeId={myStore.id} />
          </div>
        )}

        {/* Funcionarios Tab */}
        {myStore?.id && (
          <div className={cn("p-3 sm:p-4 md:p-6 lg:p-8", activeTab !== 'funcionarios' && 'hidden')}>
            <EmployeesManager storeId={myStore.id} />
          </div>
        )}

        {/* WhatsApp Tab */}
        {myStore?.id && (
          <div className={cn("p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6", activeTab !== 'whatsapp' && 'hidden')}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <WhatsAppIntegration 
                storeId={myStore.id} 
                store={myStore}
                onStoreUpdate={async (data) => {
                  await updateStore({
                    id: myStore.id,
                    name: myStore.name,
                    slug: myStore.slug,
                    category: myStore.category,
                    ...data,
                  });
                }}
              />
            </motion.div>
          </div>
        )}

        {/* Produtos Tab */}
        {myStore?.id && (
          <div className={cn("p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6", activeTab !== 'produtos' && 'hidden')}>
            <Tabs defaultValue="lista" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="lista" className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Lista de Produtos
                </TabsTrigger>
                <TabsTrigger value="categorias" className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4" />
                  Categorias de Produtos
                </TabsTrigger>
                <TabsTrigger value="combos" className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Combos
                </TabsTrigger>
                <TabsTrigger value="edit" className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Adicionais & Sabores
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lista" className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
                      Meus Produtos
                      {products && (
                        <Badge variant="secondary" className="text-sm">
                          {products.filter(p => {
                            const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
                            const matchesStatus = productStatusFilter === 'all' 
                              ? true 
                              : productStatusFilter === 'active' 
                                ? p.is_available 
                                : !p.is_available;
                            const matchesSearch = !productSearchTerm || 
                              p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                              p.description?.toLowerCase().includes(productSearchTerm.toLowerCase());
                            return matchesCategory && matchesStatus && matchesSearch;
                          }).length}
                        </Badge>
                      )}
                    </h2>
                    <p className="text-muted-foreground">Gerencie o cardápio da sua loja</p>
                  </div>
                  {hasPermission('products', 'create') && (
                <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingProduct(null);
                      setActiveProductTab("info");
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
                        external_code: '',
                        is_featured: false,
                      });
                    }} size="lg">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Produto
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-[50vw] max-h-[95vh] overflow-hidden flex flex-col bg-background z-50">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>
                      {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <div className="pr-4 space-y-4 pb-4">
                      <Tabs value={activeProductTab} onValueChange={setActiveProductTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="info">Informações</TabsTrigger>
                          <TabsTrigger value="sizes" disabled={!editingProduct}>
                            Tamanhos {!editingProduct && <span className="text-xs ml-1">(salve primeiro)</span>}
                          </TabsTrigger>
                          <TabsTrigger value="addons" disabled={!editingProduct}>
                            Adicionais {!editingProduct && <span className="text-xs ml-1">(salve primeiro)</span>}
                          </TabsTrigger>
                          <TabsTrigger value="flavors" disabled={!editingProduct}>
                            Múltiplos Sabores {!editingProduct && <span className="text-xs ml-1">(salve primeiro)</span>}
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="info" className="space-y-4 mt-4 min-h-[800px]">
                      
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
                                  {categories
                                    .filter(cat => cat.is_active && cat.name && cat.name.trim() !== '')
                                    .map((cat) => (
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
                            <Label>Código Externo</Label>
                            <Input
                              value={productForm.external_code}
                              onChange={(e) => setProductForm({ ...productForm, external_code: e.target.value.trim() })}
                              placeholder="Código único do produto (opcional)"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Código personalizado para controle interno da sua loja.
                            </p>
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
                                min="0.01"
                                value={productForm.price}
                                onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) })}
                                placeholder="Ex: 10.00"
                              />
                            </div>
                            <div>
                              <Label>Preço Promocional</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={productForm.promotional_price}
                                onChange={(e) => setProductForm({ ...productForm, promotional_price: parseFloat(e.target.value) })}
                                placeholder="Ex: 8.00"
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
                          
                          <div className="flex items-center gap-2">
                            <Switch
                              id="is_featured"
                              checked={productForm.is_featured || false}
                              onCheckedChange={(checked) => 
                                setProductForm({ ...productForm, is_featured: checked })
                              }
                              className="data-[state=checked]:bg-yellow-500"
                            />
                            <Label htmlFor="is_featured" className="flex items-center gap-2 cursor-pointer">
                              <Star className={productForm.is_featured ? "h-4 w-4 fill-yellow-500 text-yellow-500" : "h-4 w-4 text-gray-400"} />
                              Produto em Destaque
                            </Label>
                          </div>
                        </TabsContent>

                        <TabsContent value="sizes" className="mt-4 pr-2 min-h-[800px]">
                          {editingProduct && (
                            <ProductSizesManager productId={editingProduct.id} />
                          )}
                        </TabsContent>

                        <TabsContent value="addons" className="mt-4 pr-2 min-h-[800px]">
                          {editingProduct && myStore && (
                            <ProductAddonsManager 
                              productId={editingProduct.id}
                              storeId={myStore.id}
                            />
                          )}
                        </TabsContent>

                        <TabsContent value="flavors" className="mt-4 pr-2 min-h-[800px]">
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
                               
                              <ProductFlavorsManager productId={editingProduct.id} storeId={editingProduct.store_id} />
                            </>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                  
                  {activeProductTab !== "addons" && (
                    <div className="flex-shrink-0 pt-4 border-t mt-4">
                      <Button
                        onClick={editingProduct ? handleUpdateProduct : handleCreateProduct}
                        className="w-full"
                      >
                        {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
                      </Button>
                    </div>
                  )}
                </DialogContent>
                </Dialog>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[250px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome do produto..."
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {productSearchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setProductSearchTerm('')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
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
                        {categories
                          .filter(cat => cat.is_active && cat.name && cat.name.trim() !== '')
                          .map((cat) => (
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

                  {/* Status Filter */}
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    <Select value={productStatusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setProductStatusFilter(value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Produtos</SelectItem>
                        <SelectItem value="active">Apenas Ativos</SelectItem>
                        <SelectItem value="inactive">Apenas Inativos</SelectItem>
                      </SelectContent>
                    </Select>
                    {productStatusFilter !== 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProductStatusFilter('active')}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Limpar
                      </Button>
                    )}
                  </div>

                  {/* Clear All Filters */}
                  {(productSearchTerm || categoryFilter !== 'all' || productStatusFilter !== 'all') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setProductSearchTerm('');
                        setCategoryFilter('all');
                        setProductStatusFilter('all');
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Limpar Todos
                    </Button>
                  )}

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant={productViewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setProductViewMode('grid')}
                    >
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      Grid
                    </Button>
                    <Button
                      variant={productViewMode === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setProductViewMode('table')}
                    >
                      <TableIcon className="w-4 h-4 mr-2" />
                      Tabela
                    </Button>
                  </div>

                  {/* Reorder Mode Toggle */}
                  {hasPermission('products', 'update') && productViewMode === 'grid' && (
                    <Button
                      variant={isReorderMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        if (isReorderMode) {
                          // Exit reorder mode
                          setIsReorderMode(false);
                        } else {
                          // Enter reorder mode - disable filters
                          setProductSearchTerm('');
                          setCategoryFilter('all');
                          setProductStatusFilter('all');
                          setIsReorderMode(true);
                        }
                      }}
                      disabled={!products || products.length === 0}
                    >
                      <GripVertical className="w-4 h-4 mr-2" />
                      {isReorderMode ? 'Concluir' : 'Reordenar'}
                    </Button>
                  )}
                </div>

                  {/* Products Grid/Table */}
                  {(() => {
                    if (!filteredProducts || filteredProducts.length === 0) {
                      return (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                          <Package className="w-16 h-16 text-muted-foreground/50 mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
                          <p className="text-muted-foreground mb-4">
                            {productSearchTerm
                              ? `Nenhum produto encontrado com "${productSearchTerm}"`
                              : productStatusFilter !== 'all' 
                                ? `Não há produtos ${productStatusFilter === 'active' ? 'ativos' : 'inativos'} ${categoryFilter !== 'all' ? `na categoria "${categoryFilter}"` : ''}`
                                : categoryFilter !== 'all' 
                                  ? `Não há produtos na categoria "${categoryFilter}"`
                                  : 'Adicione seu primeiro produto ao cardápio'}
                          </p>
                          {(productSearchTerm || productStatusFilter !== 'all' || categoryFilter !== 'all') && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setProductSearchTerm('');
                                setProductStatusFilter('all');
                                setCategoryFilter('all');
                              }}
                            >
                              Limpar Filtros
                            </Button>
                          )}
                        </div>
                      );
                    }

                  // Table View
                  if (productViewMode === 'table') {
                    return (
                      <div className="space-y-4">
                        {/* Bulk Actions Bar */}
                        {selectedProducts.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-primary" />
                              <span className="font-medium">
                                {selectedProducts.length} produto(s) selecionados
                              </span>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                              {hasPermission('products', 'update') && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleBulkToggleAvailability(true)}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Ativar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleBulkToggleAvailability(false)}
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Desativar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsBulkActionDialogOpen(true)}
                                  >
                                    <Tag className="w-4 h-4 mr-2" />
                                    Alterar Categoria
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedProducts([])}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        <ScrollableTable maxHeight="calc(100vh - 400px)">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]">
                                  <Checkbox
                                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                                    onCheckedChange={handleToggleSelectAll}
                                  />
                                </TableHead>
                                <TableHead className="w-[80px]">Imagem</TableHead>
                                <TableHead 
                                  className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                                  onClick={() => handleSort('name')}
                                >
                                  <div className="flex items-center gap-2">
                                    Nome
                                    <SortIndicator column="name" />
                                  </div>
                                </TableHead>
                                <TableHead 
                                  className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                                  onClick={() => handleSort('external_code')}
                                >
                                  <div className="flex items-center gap-2">
                                    Código Externo
                                    <SortIndicator column="external_code" />
                                  </div>
                                </TableHead>
                                <TableHead 
                                  className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                                  onClick={() => handleSort('category')}
                                >
                                  <div className="flex items-center gap-2">
                                    Categoria
                                    <SortIndicator column="category" />
                                  </div>
                                </TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead 
                                  className="text-right cursor-pointer select-none hover:bg-muted/50 transition-colors"
                                  onClick={() => handleSort('price')}
                                >
                                  <div className="flex items-center justify-end gap-2">
                                    Preço
                                    <SortIndicator column="price" />
                                  </div>
                                </TableHead>
                                <TableHead 
                                  className="text-right cursor-pointer select-none hover:bg-muted/50 transition-colors"
                                  onClick={() => handleSort('promotional_price')}
                                >
                                  <div className="flex items-center justify-end gap-2">
                                    Preço Promo
                                    <SortIndicator column="promotional_price" />
                                  </div>
                                </TableHead>
                                <TableHead className="text-center">Destaque</TableHead>
                                <TableHead className="text-center w-[120px]">Ativo / Inativo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredProducts.map((product) => (
                                <TableRow key={product.id} className={!product.is_available ? 'opacity-60' : ''}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedProducts.includes(product.id)}
                                      onCheckedChange={() => handleToggleSelectProduct(product.id)}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                      {product.image_url ? (
                                        <img 
                                          src={product.image_url} 
                                          alt={product.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <Package className="w-6 h-6 text-muted-foreground" />
                                      )}
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {product.external_code || '-'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{product.category}</Badge>
                                </TableCell>
                                <TableCell className="max-w-xs truncate text-muted-foreground">
                                  {product.description || '-'}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  R$ {product.price.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {product.promotional_price ? (
                                    <span className="text-green-600 font-semibold">
                                      R$ {product.promotional_price.toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {hasPermission('products', 'update') ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <Switch
                                        checked={product.is_featured || false}
                                        onCheckedChange={(checked) => 
                                          toggleProductFeatured({ id: product.id, is_featured: checked })
                                        }
                                        className="data-[state=checked]:bg-yellow-500"
                                      />
                                      {product.is_featured && (
                                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                      )}
                                    </div>
                                  ) : (
                                    product.is_featured ? (
                                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 mx-auto" />
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {hasPermission('products', 'update') ? (
                                    <Switch
                                      checked={product.is_available}
                                      onCheckedChange={(checked) => 
                                        toggleProductAvailability({ id: product.id, is_available: checked })
                                      }
                                    />
                                  ) : (
                                    <Badge variant={product.is_available ? 'default' : 'secondary'}>
                                      {product.is_available ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-2">
                                    {hasPermission('products', 'update') && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => openDuplicateDialog(product)}
                                          title="Duplicar produto"
                                        >
                                          <Copy className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleEditProduct(product)}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollableTable>
                      </div>
                    );
                  }

                  // Grid View with Reorder Mode
                  if (isReorderMode) {
                    // Group products by category
                    const productsByCategory = filteredProducts.reduce((acc, product) => {
                      if (!acc[product.category]) {
                        acc[product.category] = [];
                      }
                      acc[product.category].push(product);
                      return acc;
                    }, {} as Record<string, any[]>);

                    // Get ordered categories with products
                    const orderedCategories = categories
                      .filter(cat => cat.is_active && productsByCategory[cat.name])
                      .map(cat => cat.name);

                    return (
                      <div className="col-span-full space-y-8">
                        {orderedCategories.map((category) => {
                          const categoryProducts = productsByCategory[category];
                          return (
                            <div key={category} className="space-y-4">
                              <div className="flex items-center gap-3 px-2">
                                <div className="flex items-center gap-2">
                                  <FolderTree className="w-5 h-5 text-primary" />
                                  <h3 className="text-xl font-bold">{category}</h3>
                                </div>
                                <Badge variant="secondary" className="text-sm">
                                  {categoryProducts.length} {categoryProducts.length === 1 ? 'produto' : 'produtos'}
                                </Badge>
                              </div>
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                              >
                                <SortableContext
                                  items={categoryProducts.map(p => p.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                                    {categoryProducts.map((product, index) => (
                                      <SortableProductCard
                                        key={product.id}
                                        product={product}
                                        index={index}
                                        isReorderMode={isReorderMode}
                                        hasPermission={hasPermission}
                                        onEdit={handleEditProduct}
                                        onToggleAvailability={(id, isAvailable) => 
                                          toggleProductAvailability({ id, is_available: isAvailable })
                                        }
                                        onToggleFeatured={(id, isFeatured) => 
                                          toggleProductFeatured({ id, is_featured: isFeatured })
                                        }
                                        onDuplicate={openDuplicateDialog}
                                      />
                                    ))}
                                  </div>
                                </SortableContext>
                              </DndContext>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  // Group products by category for normal view
                  const productsByCategory = filteredProducts.reduce((acc, product) => {
                    if (!acc[product.category]) {
                      acc[product.category] = [];
                    }
                    acc[product.category].push(product);
                    return acc;
                  }, {} as Record<string, any[]>);

                  // Get ordered categories with products
                  const orderedCategories = categories
                    .filter(cat => cat.is_active && productsByCategory[cat.name])
                    .map(cat => cat.name);

                  return (
                    <div className="col-span-full space-y-8">
                      {orderedCategories.map((category) => {
                        const categoryProducts = productsByCategory[category];
                        return (
                          <div key={category} className="space-y-4">
                            <div className="flex items-center gap-3 px-2">
                              <div className="flex items-center gap-2">
                                <FolderTree className="w-5 h-5 text-primary" />
                                <h3 className="text-xl font-bold">{category}</h3>
                              </div>
                              <Badge variant="secondary" className="text-sm">
                                {categoryProducts.length} {categoryProducts.length === 1 ? 'produto' : 'produtos'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                              {categoryProducts.map((product, index) => (
                                <SortableProductCard
                                  key={product.id}
                                  product={product}
                                  index={index}
                                  isReorderMode={false}
                                  hasPermission={hasPermission}
                                  onEdit={handleEditProduct}
                                  onToggleAvailability={(id, isAvailable) => 
                                    toggleProductAvailability({ id, is_available: isAvailable })
                                  }
                                  onToggleFeatured={(id, isFeatured) => 
                                    toggleProductFeatured({ id, is_featured: isFeatured })
                                  }
                                  onDuplicate={openDuplicateDialog}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="categorias" className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold gradient-text">Categorias de Produtos</h2>
                    <p className="text-muted-foreground">Organize os produtos da sua loja</p>
                  </div>
                  <div className="flex gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant={categoryViewMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCategoryViewMode('grid')}
                      >
                        <LayoutGrid className="w-4 h-4 mr-2" />
                        Grid
                      </Button>
                      <Button
                        variant={categoryViewMode === 'table' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCategoryViewMode('table')}
                      >
                        <TableIcon className="w-4 h-4 mr-2" />
                        Tabela
                      </Button>
                    </div>
                    
                    {hasPermission('categories', 'update') && filteredCategories && filteredCategories.length > 1 && categoryViewMode === 'grid' && (
                      <Button
                        variant={isReorderCategoriesMode ? "default" : "outline"}
                        onClick={() => setIsReorderCategoriesMode(!isReorderCategoriesMode)}
                        size="lg"
                      >
                        <GripVertical className="w-4 h-4 mr-2" />
                        {isReorderCategoriesMode ? "Concluir" : "Reordenar"}
                      </Button>
                    )}
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

                {loadingCategories ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin">⏳</div>
                  </div>
                ) : filteredCategories && filteredCategories.length > 0 ? (
                  categoryViewMode === 'table' ? (
                    // Table View
                    <ScrollableTable maxHeight="calc(100vh - 400px)">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead className="text-center">Produtos</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-center w-[200px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCategories.map((category) => {
                            const categoryProducts = products?.filter(p => p.category === category.name) || [];
                            return (
                              <TableRow key={category.id} className={!category.is_active ? 'opacity-60' : ''}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                      <FolderTree className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                      <div className="font-semibold">{category.name}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="secondary">
                                    {categoryProducts.length} produtos
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {hasPermission('categories', 'update') ? (
                                    <Switch
                                      checked={category.is_active}
                                      onCheckedChange={(checked) => toggleCategoryStatus(category.id, checked)}
                                    />
                                  ) : (
                                    <Badge variant={category.is_active ? 'default' : 'secondary'}>
                                      {category.is_active ? 'Ativa' : 'Inativa'}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-2">
                                    {hasPermission('categories', 'update') && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingCategory(category);
                                          setEditCategoryName(category.name);
                                          setIsEditCategoryDialogOpen(true);
                                        }}
                                      >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Editar
                                      </Button>
                                    )}
                                    {hasPermission('categories', 'delete') && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deleteCategory(category.id)}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollableTable>
                  ) : isReorderCategoriesMode ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEndCategories}
                    >
                      <SortableContext
                        items={localCategories.filter(cat => 
                          categoryStatusFilter === 'all' || 
                          (categoryStatusFilter === 'active' && cat.is_active) || 
                          (categoryStatusFilter === 'inactive' && !cat.is_active)
                        )}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                          {localCategories
                            .filter(cat => 
                              categoryStatusFilter === 'all' || 
                              (categoryStatusFilter === 'active' && cat.is_active) || 
                              (categoryStatusFilter === 'inactive' && !cat.is_active)
                            )
                            .map((category, index) => (
                              <SortableCategoryCard
                                key={category.id}
                                category={category}
                                index={index}
                                isReorderMode={true}
                                hasPermission={hasPermission}
                                products={products}
                                onEdit={(cat) => {
                                  setEditingCategory(cat);
                                  setEditCategoryName(cat.name);
                                  setIsEditCategoryDialogOpen(true);
                                }}
                                onDelete={deleteCategory}
                                onToggleStatus={toggleCategoryStatus}
                              />
                            ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                      {filteredCategories.map((category, index) => (
                        <SortableCategoryCard
                          key={category.id}
                          category={category}
                          index={index}
                          isReorderMode={false}
                          hasPermission={hasPermission}
                          products={products}
                          onEdit={(cat) => {
                            setEditingCategory(cat);
                            setEditCategoryName(cat.name);
                            setIsEditCategoryDialogOpen(true);
                          }}
                          onDelete={deleteCategory}
                          onToggleStatus={toggleCategoryStatus}
                        />
                      ))}
                    </div>
                  )
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <FolderTree className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Nenhuma categoria encontrada</h3>
                      <p className="text-muted-foreground mb-4">
                        {categoryStatusFilter !== 'all' 
                          ? "Nenhuma categoria corresponde ao filtro selecionado"
                          : "Comece criando sua primeira categoria de produtos"
                        }
                      </p>
                      {hasPermission('categories', 'create') && categoryStatusFilter === 'all' && (
                        <Button onClick={() => setIsCategoryDialogOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Criar Primeira Categoria
                        </Button>
                      )}
                    </CardContent>
                  </Card>
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
              </TabsContent>

              <TabsContent value="combos">
                <CombosManager storeId={myStore.id} products={products || []} />
              </TabsContent>

              <TabsContent value="edit">
                <div className="space-y-6">
                  <Tabs defaultValue="adicionais" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="adicionais" className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Adicionais
                      </TabsTrigger>
                      <TabsTrigger value="sabores" className="flex items-center gap-2">
                        <Pizza className="w-4 h-4" />
                        Sabores
                      </TabsTrigger>
                      <TabsTrigger value="templates" className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Templates
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="adicionais">
                      <div className="space-y-6">
                        <Tabs defaultValue="globais" className="w-full">
                          <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="globais" className="flex items-center gap-2">
                              <Plus className="w-4 h-4" />
                              Adicionais Globais
                            </TabsTrigger>
                            <TabsTrigger value="categorias" className="flex items-center gap-2">
                              <FolderTree className="w-4 h-4" />
                              Categorias Adicionais
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="globais">
                            <AddonsTab storeId={myStore.id} />
                          </TabsContent>

                          <TabsContent value="categorias">
                            <CategoriesTab storeId={myStore.id} />
                          </TabsContent>
                        </Tabs>
                      </div>
                    </TabsContent>

                    <TabsContent value="sabores">
                      <ProductFlavorsManagement storeId={myStore.id} />
                    </TabsContent>

                    <TabsContent value="templates">
                      <TemplatesTab storeId={myStore.id} />
                    </TabsContent>
                  </Tabs>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Relatorios Tab Group */}
        {myStore?.id && (
          <div className={cn("p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6", 
            !['relatorio-clientes', 'relatorio-produtos-vendidos', 'relatorio-produtos-cadastrados', 'relatorio-pedidos'].includes(activeTab) && 'hidden'
          )}>

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

        {/* Result Tab */}
        <div className={cn("p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6", activeTab !== 'result' && 'hidden')}>
          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Tabs defaultValue="personal" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-8 gap-2 bg-muted/50 h-auto p-2">
                  <TabsTrigger value="personal" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap">
                    <User className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Dados Pessoais</span>
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap">
                    <Settings className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Loja</span>
                  </TabsTrigger>
                  <TabsTrigger value="entregas" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap">
                    <Truck className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Entregas</span>
                  </TabsTrigger>
                  <TabsTrigger value="pix" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap">
                    <DollarSign className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">PIX</span>
                  </TabsTrigger>
                  <TabsTrigger value="order-status" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap">
                    <Menu className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Status dos Pedidos</span>
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap">
                    <Shield className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Permissões</span>
                  </TabsTrigger>
                  <TabsTrigger value="layout" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap">
                    <LayoutGrid className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Layout</span>
                  </TabsTrigger>
                  <TabsTrigger value="security" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap">
                    <Lock className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Segurança</span>
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

        {/* Permissions Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-primary" />
                Permissões e Configurações de Acesso
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure as permissões de acesso, notificações, tipos de entrega e métodos de pagamento aceitos pela sua loja. 
                Estas configurações controlam como sua loja opera e como você recebe atualizações sobre novos pedidos.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <NotificationSettings />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Métodos de Pagamento Aceitos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      handleUpdateDeliveryOption('accepts_pix', checked)
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
                      handleUpdateDeliveryOption('accepts_card', checked)
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
                      handleUpdateDeliveryOption('accepts_cash', checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configurações de Exibição</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_avg_delivery_time">Exibir Tempo de Entrega</Label>
                    <p className="text-sm text-muted-foreground">
                      Mostrar o tempo médio de entrega na página da loja
                    </p>
                  </div>
                  <Switch
                    id="show_avg_delivery_time"
                    checked={storeForm.show_avg_delivery_time ?? true}
                    onCheckedChange={(checked) => 
                      handleUpdateDeliveryOption('show_avg_delivery_time', checked)
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_address_on_store_page">Exibir Endereço na Loja</Label>
                    <p className="text-sm text-muted-foreground">
                      Mostrar o endereço completo no cabeçalho da página da loja
                    </p>
                  </div>
                  <Switch
                    id="show_address_on_store_page"
                    checked={storeForm.show_address_on_store_page !== false}
                    onCheckedChange={(checked) => 
                      handleUpdateDeliveryOption('show_address_on_store_page', checked)
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_phone_on_store_page">Exibir Telefone na Loja</Label>
                    <p className="text-sm text-muted-foreground">
                      Mostrar o telefone de contato no cabeçalho da página da loja
                    </p>
                  </div>
                  <Switch
                    id="show_phone_on_store_page"
                    checked={storeForm.show_phone_on_store_page !== false}
                    onCheckedChange={(checked) => 
                      handleUpdateDeliveryOption('show_phone_on_store_page', checked)
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_whatsapp_on_store_page">Exibir WhatsApp na Loja</Label>
                    <p className="text-sm text-muted-foreground">
                      Mostrar o WhatsApp de contato no cabeçalho da página da loja
                    </p>
                  </div>
                  <Switch
                    id="show_whatsapp_on_store_page"
                    checked={(storeForm as any).show_whatsapp_on_store_page !== false}
                    onCheckedChange={(checked) => 
                      handleUpdateDeliveryOption('show_whatsapp_on_store_page', checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Pedidos Agendados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow_orders_when_closed">Aceitar Pedidos Agendados</Label>
                    <p className="text-sm text-muted-foreground">
                      Permite que clientes façam pedidos mesmo quando a loja está fechada. 
                      Os pedidos serão processados quando você abrir a loja.
                    </p>
                  </div>
                  <Switch
                    id="allow_orders_when_closed"
                    checked={storeForm.allow_orders_when_closed}
                    onCheckedChange={(checked) => 
                      handleUpdateDeliveryOption('allow_orders_when_closed', checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

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

              <div className="space-y-2">
                <Label>URL da Loja *</Label>
                <div className="relative">
                  <Input
                    value={storeForm.slug}
                    onChange={(e) => {
                      const sanitized = sanitizeSlug(e.target.value);
                      setStoreForm({ ...storeForm, slug: sanitized });
                    }}
                    placeholder="minha-loja"
                    className="font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Apenas letras minúsculas, números e hífens. Espaços serão convertidos em hífens.
                </p>

                {/* URL Preview */}
                {storeForm.slug && (
                  <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <Store className="h-4 w-4 text-primary flex-shrink-0" />
                    <code className="text-sm text-primary font-semibold">
                      ofertas.app/{storeForm.slug}
                    </code>
                  </div>
                )}

                {/* Availability Check */}
                {storeForm.slug && storeForm.slug !== myStore?.slug && (
                  <div className="flex items-center gap-2">
                    {slugAvailability.isChecking && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Verificando disponibilidade...</span>
                      </>
                    )}
                    {!slugAvailability.isChecking && slugAvailability.isAvailable === true && (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-500">{slugAvailability.message}</span>
                      </>
                    )}
                    {!slugAvailability.isChecking && slugAvailability.isAvailable === false && (
                      <>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive">{slugAvailability.message}</span>
                      </>
                    )}
                  </div>
                )}
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

              <div>
                <Label>WhatsApp da Loja</Label>
                <PhoneInput
                  value={storeForm.whatsapp}
                  onChange={(value) => setStoreForm({ ...storeForm, whatsapp: value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Número do WhatsApp para contato direto com a loja
                </p>
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

                <div>
                  <Label>Tipo de Exibição de Produtos</Label>
                  <Select
                    value={storeForm.menu_label}
                    onValueChange={(value) => setStoreForm({ ...storeForm, menu_label: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione como deseja exibir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cardápio">Cardápio</SelectItem>
                      <SelectItem value="Produtos">Produtos</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Define como seus produtos serão chamados na loja (Ex: "Ver Cardápio" ou "Ver Produtos")
                  </p>
                </div>
              </div>


              <Separator className="my-6" />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configurações de Entrega</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="hidden">
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

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Endereço da Loja</h3>
                
                <div>
                  <Label>CEP</Label>
                  <div className="relative">
                    <Input
                      value={storeForm.store_cep}
                      onChange={(e) => {
                        console.log('✏️ [Input CEP] Novo valor:', e.target.value);
                        handleCepChange(e.target.value);
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                      disabled={isLoadingCep}
                    />
                    {isLoadingCep && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Digite o CEP para preencher automaticamente o endereço
                  </p>
                </div>

                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={storeForm.store_city}
                    onChange={(e) => {
                      console.log('✏️ [Input Cidade] Novo valor:', e.target.value);
                      setStoreForm({ ...storeForm, store_city: e.target.value });
                    }}
                    placeholder="Nome da cidade"
                  />
                </div>

                <div>
                  <Label>Rua</Label>
                  <Input
                    value={storeForm.store_street}
                    onChange={(e) => {
                      console.log('✏️ [Input Rua] Novo valor:', e.target.value);
                      setStoreForm({ ...storeForm, store_street: e.target.value });
                    }}
                    placeholder="Nome da rua"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Número</Label>
                    <Input
                      value={storeForm.store_street_number}
                      onChange={(e) => {
                        console.log('✏️ [Input Número] Novo valor:', e.target.value);
                        setStoreForm({ ...storeForm, store_street_number: e.target.value });
                      }}
                      placeholder="123"
                    />
                  </div>

                  <div>
                    <Label>Bairro</Label>
                    <Input
                      value={storeForm.store_neighborhood}
                      onChange={(e) => {
                        console.log('✏️ [Input Bairro] Novo valor:', e.target.value);
                        setStoreForm({ ...storeForm, store_neighborhood: e.target.value });
                      }}
                      placeholder="Nome do bairro"
                    />
                  </div>
                </div>

                <div>
                  <Label>Complemento</Label>
                  <Input
                    value={storeForm.store_complement}
                    onChange={(e) => {
                      console.log('✏️ [Input Complemento] Novo valor:', e.target.value);
                      setStoreForm({ ...storeForm, store_complement: e.target.value });
                    }}
                    placeholder="Apto, sala, etc. (opcional)"
                  />
                </div>
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

        {/* Order Status Tab */}
        <TabsContent value="order-status">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {myStore?.id && <OrderStatusManager storeId={myStore.id} />}
          </motion.div>
        </TabsContent>

        {/* Entregas Tab */}
        <TabsContent value="entregas">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-2xl font-semibold mb-6">Configurações de entrega</h2>
            </div>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-primary">
                  <Truck className="h-4 w-4" />
                  Tipos de Entrega Aceitos
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure quais tipos de entrega sua loja aceita
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                  <div className="space-y-0.5">
                    <Label htmlFor="accepts_delivery" className="text-sm font-medium">Entrega</Label>
                    <p className="text-xs text-muted-foreground">
                      Permite que os clientes recebam pedidos em casa
                    </p>
                  </div>
                  <Switch
                    id="accepts_delivery"
                    checked={storeForm.accepts_delivery}
                    onCheckedChange={(checked) => 
                      handleUpdateDeliveryOption('accepts_delivery', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                  <div className="space-y-0.5">
                    <Label htmlFor="accepts_pickup" className="text-sm font-medium">Retirada</Label>
                    <p className="text-xs text-muted-foreground">
                      Permite que os clientes retirem pedidos na loja
                    </p>
                  </div>
                  <Switch
                    id="accepts_pickup"
                    checked={storeForm.accepts_pickup}
                    onCheckedChange={(checked) => 
                      handleUpdateDeliveryOption('accepts_pickup', checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <PickupLocationsManager storeId={myStore.id} />
            <DeliveryZonesManager storeId={myStore.id} />
          </motion.div>
        </TabsContent>

        {/* PIX Configuration Tab */}
        <TabsContent value="pix">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Configurações de PIX</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pix_key">Chave PIX</Label>
                  <div className="relative">
                    <Input
                      id="pix_key"
                      type="text"
                      placeholder="Digite a chave PIX (CPF, CNPJ, E-mail, Telefone ou Chave Aleatória)"
                      value={(() => {
                        const key = storeForm.pix_key || '';
                        // Remove +55 prefix from display if it's a phone number
                        const digitsOnly = key.replace(/\D/g, '');
                        if (digitsOnly.startsWith('55') && (digitsOnly.length === 12 || digitsOnly.length === 13)) {
                          // It's a phone with +55, remove the prefix for display
                          const phoneWithoutPrefix = digitsOnly.substring(2);
                          return formatPixKey(phoneWithoutPrefix);
                        }
                        return key;
                      })()}
                      onChange={(e) => {
                        let value = e.target.value;
                        const digitsOnly = value.replace(/\D/g, '');
                        
                        // Format CPF as user types (###.###.###-##)
                        if (digitsOnly.length > 0 && digitsOnly.length <= 11 && /^\d*$/.test(digitsOnly) && !value.includes('@')) {
                          if (digitsOnly.length <= 3) {
                            value = digitsOnly;
                          } else if (digitsOnly.length <= 6) {
                            value = `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3)}`;
                          } else if (digitsOnly.length <= 9) {
                            value = `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3, 6)}.${digitsOnly.slice(6)}`;
                          } else if (digitsOnly.length === 10) {
                            // Verifica se é celular (8 dígitos começando com 6, 7, 8 ou 9)
                            const firstDigitAfterDDD = digitsOnly.charAt(2);
                            if (['6', '7', '8', '9'].includes(firstDigitAfterDDD)) {
                              // É celular com 8 dígitos, adiciona o 9 após o DDD
                              const withNine = digitsOnly.slice(0, 2) + '9' + digitsOnly.slice(2);
                              value = `(${withNine.slice(0, 2)}) ${withNine.slice(2, 7)}-${withNine.slice(7, 11)}`;
                            } else {
                              // É telefone fixo: (##) ####-####
                              value = `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, 6)}-${digitsOnly.slice(6, 10)}`;
                            }
                          } else if (digitsOnly.length === 11) {
                            // Pode ser CPF ou telefone celular
                            // Verifica se começa com DDD válido (10-99) para ser telefone
                            const ddd = parseInt(digitsOnly.slice(0, 2));
                            if (ddd >= 11 && ddd <= 99) {
                              // Formato de celular: (##) #####-####
                              value = `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, 7)}-${digitsOnly.slice(7, 11)}`;
                            } else {
                              // Formato de CPF: ###.###.###-##
                              value = `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3, 6)}.${digitsOnly.slice(6, 9)}-${digitsOnly.slice(9, 11)}`;
                            }
                          }
                        }
                        // Format CNPJ as user types (##.###.###/####-##)
                        else if (digitsOnly.length > 11 && digitsOnly.length <= 14) {
                          if (digitsOnly.length <= 2) {
                            value = digitsOnly;
                          } else if (digitsOnly.length <= 5) {
                            value = `${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2)}`;
                          } else if (digitsOnly.length <= 8) {
                            value = `${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2, 5)}.${digitsOnly.slice(5)}`;
                          } else if (digitsOnly.length <= 12) {
                            value = `${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2, 5)}.${digitsOnly.slice(5, 8)}/${digitsOnly.slice(8)}`;
                          } else {
                            value = `${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2, 5)}.${digitsOnly.slice(5, 8)}/${digitsOnly.slice(8, 12)}-${digitsOnly.slice(12, 14)}`;
                          }
                        }
                        // Keep as is for email or random keys
                        else {
                          value = value.trim();
                        }
                        
                        setStoreForm({ ...storeForm, pix_key: value });
                        
                        // Validate in real-time
                        const validation = validatePixKey(value);
                        setPixValidation(validation);
                      }}
                      className={cn(
                        "pr-10",
                        storeForm.pix_key && !pixValidation.isValid && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {storeForm.pix_key && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {pixValidation.isValid ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                    )}
                  </div>
                  {storeForm.pix_key && pixValidation.message && (
                    <p className={cn(
                      "text-xs mt-1",
                      pixValidation.isValid ? "text-green-600" : "text-destructive"
                    )}>
                      {pixValidation.message}
                    </p>
                  )}
                  {!storeForm.pix_key && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Chave PIX para recebimento de pagamentos dos clientes
                    </p>
                  )}
                </div>

                <Button
                  onClick={async () => {
                    if (!myStore?.id) return;
                    
                    if (storeForm.pix_key && !pixValidation.isValid) {
                      toast({
                        title: "Chave PIX inválida",
                        description: pixValidation.message,
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    try {
                      // Only add +55 for phone type PIX keys
                      let pixKeyToSave = storeForm.pix_key;
                      if (pixKeyToSave) {
                        const pixType = detectPixKeyType(pixKeyToSave);
                        if (pixType === 'phone') {
                          pixKeyToSave = normalizePixKeyPhone(pixKeyToSave);
                        } else {
                          // For CPF, CNPJ, email, random - just remove formatting
                          pixKeyToSave = pixKeyToSave.replace(/[^\w@.-]/g, '');
                        }
                      }
                      
                      await updateStore({
                        id: myStore.id,
                        name: myStore.name,
                        slug: myStore.slug,
                        category: myStore.category,
                        pix_key: pixKeyToSave || null,
                      });
                      
                      toast({
                        title: "Chave PIX salva!",
                        description: "Sua chave PIX foi atualizada com sucesso.",
                      });
                    } catch (error) {
                      toast({
                        title: "Erro ao salvar",
                        description: "Não foi possível salvar a chave PIX. Tente novamente.",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={storeForm.pix_key ? !pixValidation.isValid : false}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Chave PIX
                </Button>

                {storeForm.pix_key && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">PIX Copia e Cola</Label>
                        <p className="text-sm text-muted-foreground">
                          Gerar código PIX dinâmico (Copia e Cola) automaticamente
                        </p>
                      </div>
                      <Switch
                        checked={storeForm.pix_copiacola_message_enabled ?? false}
                        onCheckedChange={async (checked) => {
                          // Se ativar PIX Copia e Cola, desativar Chave PIX Fixa
                          const updates = {
                            pix_copiacola_message_enabled: checked,
                            ...(checked && { pix_message_enabled: false })
                          };
                          setStoreForm({ ...storeForm, ...updates });
                          if (myStore?.id) {
                            await updateStore({
                              id: myStore.id,
                              name: myStore.name,
                              slug: myStore.slug,
                              category: myStore.category,
                              ...updates,
                            });
                            toast({
                              title: checked ? "PIX Copia e Cola ativado" : "PIX Copia e Cola desativado",
                              description: checked 
                                ? "O código PIX Copia e Cola será gerado automaticamente. Chave PIX Fixa foi desativada." 
                                : "O código PIX Copia e Cola não será mais gerado",
                            });
                          }
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">Chave PIX Fixa</Label>
                        <p className="text-sm text-muted-foreground">
                          Mostrar chave PIX estática para o cliente copiar manualmente
                        </p>
                      </div>
                      <Switch
                        checked={storeForm.pix_message_enabled ?? false}
                        onCheckedChange={async (checked) => {
                          // Se ativar Chave PIX Fixa, desativar PIX Copia e Cola
                          const updates = {
                            pix_message_enabled: checked,
                            ...(checked && { pix_copiacola_message_enabled: false })
                          };
                          setStoreForm({ ...storeForm, ...updates });
                          if (myStore?.id) {
                            await updateStore({
                              id: myStore.id,
                              name: myStore.name,
                              slug: myStore.slug,
                              category: myStore.category,
                              ...updates,
                            });
                            toast({
                              title: checked ? "Chave PIX Fixa ativada" : "Chave PIX Fixa desativada",
                              description: checked 
                                ? "A chave PIX estática será exibida aos clientes. PIX Copia e Cola foi desativado." 
                                : "A chave PIX estática não será mais exibida",
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <WhatsAppMessageConfig
              store={myStore} 
              onUpdate={async (data) => {
                await updateStore({
                  id: myStore.id,
                  name: myStore.name,
                  slug: myStore.slug,
                  category: myStore.category,
                  ...data,
                });
              }}
            />
          </motion.div>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <LayoutSettings
              currentTemplateDesktop={(myStore as any)?.product_layout_template_desktop || 'template-4'}
              currentTemplateMobile={(myStore as any)?.product_layout_template_mobile || 'template-2'}
              onUpdate={async (desktopTemplate: string, mobileTemplate: string) => {
                await updateStore({
                  id: myStore.id,
                  name: myStore.name,
                  slug: myStore.slug,
                  category: myStore.category,
                  product_layout_template_desktop: desktopTemplate,
                  product_layout_template_mobile: mobileTemplate,
                });
              }}
              isUpdating={false}
            />
          </motion.div>
        </TabsContent>
      </Tabs>
      </motion.div>
    </div>
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
                    {customStatuses.find((s: any) => getEnumFromStatusKey(s.status_key) === viewingOrder.status)?.status_label || 
                     customStatuses.find((s: any) => s.status_key === getStatusKeyFromEnum(viewingOrder.status))?.status_label ||
                     viewingOrder.status}
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status Pgto:</span>
                    <Badge 
                      className={
                        viewingOrder.payment_received 
                          ? "bg-green-600 text-white hover:bg-green-700" 
                          : "bg-yellow-600 text-white hover:bg-yellow-700"
                      }
                    >
                      {viewingOrder.payment_received ? "Pagamento recebido" : "Pagamento pendente"}
                    </Badge>
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
                      <p>
                        {viewingOrder.delivery_neighborhood}
                        {(viewingOrder as any).delivery_city && ` - ${(viewingOrder as any).delivery_city}`}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Observações */}
              {viewingOrder.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Observações do Cliente</h3>
                    <p className="text-sm text-muted-foreground">{viewingOrder.notes}</p>
                  </div>
                </>
              )}

              {/* Observações Externas (Cliente vê) */}
              {(viewingOrder as any).customer_notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Observações Externas</h3>
                    <p className="text-sm text-muted-foreground">
                      {(viewingOrder as any).customer_notes}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ℹ️ O cliente também vê estas observações
                    </p>
                  </div>
                </>
              )}

              {/* Observações Internas (Privadas) */}
              {(viewingOrder as any).store_notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Observações Internas</h3>
                    <p className="text-sm text-muted-foreground">{(viewingOrder as any).store_notes}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      🔒 Apenas você vê estas observações
                    </p>
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
                          {item.products?.external_code && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Código: {item.products.external_code}
                            </p>
                          )}
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
                      setNotesOrder(viewingOrder);
                      setIsNotesDialogOpen(true);
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

      {/* Receipt Dialog */}
      <ReceiptDialog
        open={isReceiptDialogOpen}
        onOpenChange={setIsReceiptDialogOpen}
        order={receiptOrder}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['store-orders'] });
        }}
      />

      {/* Notes Dialog */}
      <NotesDialog
        open={isNotesDialogOpen}
        onOpenChange={setIsNotesDialogOpen}
        order={notesOrder}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['store-orders'] });
        }}
      />

      {/* WhatsApp Confirm Dialog */}
      {pendingStatusChange && (
        <WhatsAppConfirmDialog
          open={isWhatsAppConfirmOpen}
          onOpenChange={(open) => {
            setIsWhatsAppConfirmOpen(open);
            if (!open) {
              setPendingStatusChange(null);
            }
          }}
          orderId={pendingStatusChange.orderId}
          orderNumber={pendingStatusChange.orderNumber}
          customerName={pendingStatusChange.customerName}
          customerPhone={pendingStatusChange.customerPhone}
          currentStatus={normalizeStatusKey(
            orders?.find(o => o.id === pendingStatusChange.orderId)?.status || ''
          )}
          newStatus={pendingStatusChange.newStatus}
          onConfirm={() => {
            const enumStatus = getEnumFromStatusKey(pendingStatusChange.newStatus);
            updateOrderStatus({ 
              orderId: pendingStatusChange.orderId, 
              status: enumStatus
            });
          }}
          onSkip={async () => {
            // Chama a mutation com skipNotification=true
            const enumStatus = getEnumFromStatusKey(pendingStatusChange.newStatus);
            updateOrderStatus({ 
              orderId: pendingStatusChange.orderId, 
              status: enumStatus,
              skipNotification: true
            });
            setPendingStatusChange(null);
          }}
        />
      )}

      {/* Delete Product Confirmation */}
      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto Permanentemente?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Tem certeza que deseja <strong>excluir permanentemente</strong> o produto "{productToDelete?.name}"?
              </p>
              <p className="text-amber-600 dark:text-amber-500 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Recomendação:</strong> Ao invés de excluir, você pode desativar o produto usando o switch. 
                  Assim o histórico de pedidos é mantido e você pode reativá-lo no futuro.
                </span>
              </p>
              <p className="text-destructive text-sm">
                A exclusão é irreversível e pode afetar o histórico de pedidos.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (productToDelete) {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Change Category Dialog */}
      <Dialog open={isBulkActionDialogOpen} onOpenChange={setIsBulkActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Categoria em Massa</DialogTitle>
            <DialogDescription>
              Selecione a nova categoria para os {selectedProducts.length} produto(s) selecionado(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-category">Nova Categoria</Label>
              <Select
                value={bulkCategoryChange}
                onValueChange={setBulkCategoryChange}
              >
                <SelectTrigger id="bulk-category">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    ?.filter(cat => cat.is_active && cat.name && cat.name.trim() !== '')
                    .map(category => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsBulkActionDialogOpen(false);
                setBulkCategoryChange('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleBulkChangeCategory}>
              Alterar Categoria
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação para duplicar produto */}
      <AlertDialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicar produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja duplicar o produto "{productToDuplicate?.name}"? Uma cópia será criada com todos os complementos e sabores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDuplicateDialogOpen(false);
              setProductToDuplicate(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDuplicate}>
              Duplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
    </div>
  );
};
