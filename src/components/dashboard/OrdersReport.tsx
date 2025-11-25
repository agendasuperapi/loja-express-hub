import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Search, ShoppingCart, Download, Tag, FileText, FileSpreadsheet, Clock, Truck, Wallet, DollarSign, Filter, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { generateOrdersReport } from "@/lib/pdfReports";
import { isStoreOpen } from "@/lib/storeUtils";
import * as XLSX from 'xlsx';
interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  observation: string | null;
  addons: Array<{
    addon_name: string;
    addon_price: number;
  }>;
  flavors: Array<{
    flavor_name: string;
    flavor_price: number;
  }>;
}

interface OrderReport {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  coupon_code: string | null;
  coupon_discount: number | null;
  payment_method: string;
  payment_received: boolean | null;
  delivery_type: string;
  delivery_street: string | null;
  delivery_number: string | null;
  delivery_neighborhood: string | null;
  delivery_complement: string | null;
  change_amount: number | null;
  notes: string | null;
  created_at: string;
  items?: OrderItem[];
}
interface OrdersReportProps {
  storeId: string;
  storeName?: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}
export const OrdersReport = ({
  storeId,
  storeName = "Minha Loja",
  dateRange
}: OrdersReportProps) => {
  const [orders, setOrders] = useState<OrderReport[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'received' | 'pending'>('all');
  const [scheduledFilter, setScheduledFilter] = useState<'all' | 'scheduled' | 'normal'>('all');
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<'all' | 'delivery' | 'pickup'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [valueRangeFilter, setValueRangeFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [couponFilter, setCouponFilter] = useState<string>('all');
  const [availableCoupons, setAvailableCoupons] = useState<Array<{code: string, id: string}>>([]);
  const [showOrderItems, setShowOrderItems] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [storeData, setStoreData] = useState<{
    operating_hours: any;
    allow_orders_when_closed: boolean;
  } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(`ordersReport-columns-${storeId}`);
    return saved ? JSON.parse(saved) : {
      order_number: true,
      date: true,
      customer_name: true,
      customer_phone: true,
      status: true,
      subtotal: true,
      delivery_fee: true,
      discount: true,
      total: true,
      payment_method: true,
      payment_status: true,
      delivery_type: true,
      scheduled: true,
      coupon: true
    };
  });

  // Carregar filtros salvos do localStorage
  useEffect(() => {
    const savedFilters = localStorage.getItem(`ordersReport-filters-${storeId}`);
    if (savedFilters) {
      const filters = JSON.parse(savedFilters);
      setSearchTerm(filters.searchTerm || "");
      setStatusFilter(filters.statusFilter || "all");
      setPaymentFilter(filters.paymentFilter || "all");
      setScheduledFilter(filters.scheduledFilter || "all");
      setDeliveryTypeFilter(filters.deliveryTypeFilter || "all");
      setPaymentMethodFilter(filters.paymentMethodFilter || "all");
      setValueRangeFilter(filters.valueRangeFilter || "all");
      setCouponFilter(filters.couponFilter || "all");
      setShowOrderItems(filters.showOrderItems || false);
    }
  }, [storeId]);

  // Salvar filtros no localStorage quando mudarem
  useEffect(() => {
    const filters = {
      searchTerm,
      statusFilter,
      paymentFilter,
      scheduledFilter,
      deliveryTypeFilter,
      paymentMethodFilter,
      valueRangeFilter,
      couponFilter,
      showOrderItems
    };
    localStorage.setItem(`ordersReport-filters-${storeId}`, JSON.stringify(filters));
  }, [searchTerm, statusFilter, paymentFilter, scheduledFilter, deliveryTypeFilter, paymentMethodFilter, valueRangeFilter, couponFilter, showOrderItems, storeId]);

  // Salvar colunas visíveis no localStorage quando mudarem
  useEffect(() => {
    localStorage.setItem(`ordersReport-columns-${storeId}`, JSON.stringify(visibleColumns));
  }, [visibleColumns, storeId]);

  // Mapeamento entre status do banco (enum) e status_key customizado
  const denormalizeStatusKey = (uiStatus: string): string => {
    const statusMap: Record<string, string> = {
      'out_for_delivery': 'in_delivery' // UI usa out_for_delivery, mas DB precisa in_delivery
    };
    return statusMap[uiStatus] || uiStatus;
  };
  const fetchOrders = async () => {
    try {
      // Buscar dados da loja
      const {
        data: store,
        error: storeError
      } = await supabase.from('stores').select('operating_hours, allow_orders_when_closed').eq('id', storeId).single();
      if (storeError) throw storeError;
      setStoreData(store);

      // Buscar cupons usados nos pedidos
      const { data: couponsData } = await supabase
        .from('orders')
        .select('coupon_code')
        .eq('store_id', storeId)
        .not('coupon_code', 'is', null);
      
      if (couponsData) {
        const uniqueCoupons = Array.from(new Set(couponsData.map(o => o.coupon_code).filter(Boolean)))
          .map((code, index) => ({ code: code as string, id: `coupon-${index}` }));
        setAvailableCoupons(uniqueCoupons);
      }
      let query = supabase.from('orders').select('*').eq('store_id', storeId).order('created_at', {
        ascending: false
      });
      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }
      const {
        data,
        error
      } = await query;
      if (error) throw error;

      // Buscar itens dos pedidos se o filtro estiver ativo
      let orderItemsMap: Record<string, OrderItem[]> = {};
      if (showOrderItems && data && data.length > 0) {
        const orderIds = data.map((o: any) => o.id);
        
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select(`
            id,
            order_id,
            product_name,
            quantity,
            unit_price,
            subtotal,
            observation,
            order_item_addons (
              addon_name,
              addon_price
            ),
            order_item_flavors (
              flavor_name,
              flavor_price
            )
          `)
          .in('order_id', orderIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

        if (itemsError) throw itemsError;

        // Organizar items por order_id
        if (itemsData) {
          itemsData.forEach((item: any) => {
            if (!orderItemsMap[item.order_id]) {
              orderItemsMap[item.order_id] = [];
            }
            orderItemsMap[item.order_id].push({
              id: item.id,
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
              observation: item.observation,
              addons: item.order_item_addons || [],
              flavors: item.order_item_flavors || []
            });
          });
        }
      }

      const mappedData: OrderReport[] = (data || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        status: order.status,
        total: order.total,
        subtotal: order.subtotal,
        delivery_fee: order.delivery_fee,
        coupon_code: order.coupon_code || null,
        coupon_discount: order.coupon_discount || null,
        payment_method: order.payment_method,
        payment_received: order.payment_received || false,
        delivery_type: order.delivery_type,
        delivery_street: order.delivery_street || null,
        delivery_number: order.delivery_number || null,
        delivery_neighborhood: order.delivery_neighborhood || null,
        delivery_complement: order.delivery_complement || null,
        change_amount: order.change_amount || null,
        notes: order.notes || null,
        created_at: order.created_at,
        items: orderItemsMap[order.id] || []
      }));
      setOrders(mappedData);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pedidos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (storeId) {
      fetchOrders();
    }
  }, [storeId, dateRange, showOrderItems]);

  // Função para verificar se um pedido é agendado
  const isOrderScheduled = (order: OrderReport): boolean => {
    if (!storeData?.allow_orders_when_closed) return false;
    const orderDate = new Date(order.created_at);
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][orderDate.getDay()];
    const orderTime = `${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`;
    const daySchedule = storeData.operating_hours?.[dayOfWeek];
    if (!daySchedule) return false;

    // Pedido agendado: feito quando loja estava fechada
    const wasOpen = !daySchedule.is_closed && orderTime >= daySchedule.open && orderTime <= daySchedule.close;
    return !wasOpen;
  };
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (statusFilter !== "all") {
      const normalizedFilter = denormalizeStatusKey(statusFilter);
      filtered = filtered.filter(o => o.status === normalizedFilter);
    }
    if (paymentFilter === 'received') {
      filtered = filtered.filter(o => o.payment_received === true);
    } else if (paymentFilter === 'pending') {
      filtered = filtered.filter(o => o.payment_received !== true);
    }
    if (scheduledFilter === 'scheduled') {
      filtered = filtered.filter(o => {
        if (!storeData?.allow_orders_when_closed) return false;
        const orderDate = new Date(o.created_at);
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][orderDate.getDay()];
        const orderTime = `${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`;
        const daySchedule = storeData.operating_hours?.[dayOfWeek];
        if (!daySchedule) return false;

        // Pedido agendado: feito quando loja estava fechada
        const wasOpen = !daySchedule.is_closed && orderTime >= daySchedule.open && orderTime <= daySchedule.close;
        return !wasOpen;
      });
    } else if (scheduledFilter === 'normal') {
      filtered = filtered.filter(o => {
        if (!storeData?.operating_hours) return true;
        const orderDate = new Date(o.created_at);
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][orderDate.getDay()];
        const orderTime = `${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`;
        const daySchedule = storeData.operating_hours?.[dayOfWeek];
        if (!daySchedule) return true;

        // Pedido normal: feito quando loja estava aberta
        const wasOpen = !daySchedule.is_closed && orderTime >= daySchedule.open && orderTime <= daySchedule.close;
        return wasOpen;
      });
    }

    // Filtro por tipo de entrega
    if (deliveryTypeFilter === 'delivery') {
      filtered = filtered.filter(o => o.delivery_type === 'delivery');
    } else if (deliveryTypeFilter === 'pickup') {
      filtered = filtered.filter(o => o.delivery_type === 'pickup');
    }

    // Filtro por método de pagamento
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(o => o.payment_method === paymentMethodFilter);
    }

    // Filtro por faixa de valor
    if (valueRangeFilter === 'low') {
      filtered = filtered.filter(o => o.total < 50);
    } else if (valueRangeFilter === 'medium') {
      filtered = filtered.filter(o => o.total >= 50 && o.total < 100);
    } else if (valueRangeFilter === 'high') {
      filtered = filtered.filter(o => o.total >= 100);
    }

    // Filtro por cupom específico
    if (couponFilter === 'no-coupon') {
      filtered = filtered.filter(o => !o.coupon_code);
    } else if (couponFilter !== 'all') {
      filtered = filtered.filter(o => o.coupon_code === couponFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => order.order_number.toLowerCase().includes(term) || order.customer_name.toLowerCase().includes(term) || order.customer_phone.includes(term) || order.coupon_code?.toLowerCase().includes(term));
    }
    return filtered;
  }, [orders, searchTerm, statusFilter, paymentFilter, scheduledFilter, deliveryTypeFilter, paymentMethodFilter, valueRangeFilter, couponFilter, storeData]);

  // Paginação
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, paymentFilter, scheduledFilter, deliveryTypeFilter, paymentMethodFilter, valueRangeFilter, couponFilter, dateRange]);
  const exportToCSV = () => {
    const headers = showOrderItems 
      ? ['Pedido', 'Data', 'Cliente', 'Telefone', 'Status', 'Subtotal', 'Taxa de Entrega', 'Desconto', 'Total', 'Pagamento', 'Status Pgto', 'Entrega', 'Cupom', 'Produto', 'Qtd', 'Preço Unit.', 'Subtotal Item', 'Adicionais', 'Sabores', 'Observação']
      : ['Pedido', 'Data', 'Cliente', 'Telefone', 'Status', 'Subtotal', 'Taxa de Entrega', 'Desconto', 'Total', 'Pagamento', 'Status Pgto', 'Entrega', 'Cupom'];
    
    const rows: string[][] = [];
    
    filteredOrders.forEach(order => {
      const orderData = [
        order.order_number, 
        format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }), 
        order.customer_name, 
        order.customer_phone, 
        order.status, 
        `R$ ${order.subtotal.toFixed(2)}`, 
        `R$ ${order.delivery_fee.toFixed(2)}`, 
        order.coupon_discount ? `R$ ${order.coupon_discount.toFixed(2)}` : '-', 
        `R$ ${order.total.toFixed(2)}`, 
        order.payment_method, 
        order.payment_received ? 'Pagamento recebido' : 'Pagamento pendente', 
        order.delivery_type === 'delivery' ? 'Entrega' : 'Retirada', 
        order.coupon_code || '-'
      ];

      if (showOrderItems && order.items && order.items.length > 0) {
        order.items.forEach((item, itemIndex) => {
          const addons = item.addons.map(a => `${a.addon_name} (+R$ ${a.addon_price.toFixed(2)})`).join(', ') || '-';
          const flavors = item.flavors.map(f => `${f.flavor_name} (+R$ ${f.flavor_price.toFixed(2)})`).join(', ') || '-';
          
          if (itemIndex === 0) {
            rows.push([
              ...orderData,
              item.product_name,
              item.quantity.toString(),
              `R$ ${item.unit_price.toFixed(2)}`,
              `R$ ${item.subtotal.toFixed(2)}`,
              addons,
              flavors,
              item.observation || '-'
            ]);
          } else {
            rows.push([
              '', '', '', '', '', '', '', '', '', '', '', '', '', // Empty order columns
              item.product_name,
              item.quantity.toString(),
              `R$ ${item.unit_price.toFixed(2)}`,
              `R$ ${item.subtotal.toFixed(2)}`,
              addons,
              flavors,
              item.observation || '-'
            ]);
          }
        });
      } else {
        rows.push(orderData);
      }
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_pedidos_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
  };
  const exportToPDF = () => {
    const periodLabel = dateRange.from && dateRange.to ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}` : "Todos os períodos";
    const ordersForReport = filteredOrders.map(order => ({
      id: order.id,
      created_at: order.created_at,
      customer_name: order.customer_name,
      total: order.total,
      status: order.status,
      payment_method: order.payment_method,
      items: showOrderItems ? order.items : undefined
    }));
    generateOrdersReport(ordersForReport, storeName, periodLabel, showOrderItems);
    toast({
      title: "PDF gerado!",
      description: "O relatório foi exportado com sucesso."
    });
  };
  const exportToExcel = () => {
    const headers = showOrderItems 
      ? ['Pedido', 'Data', 'Cliente', 'Telefone', 'Status', 'Subtotal', 'Taxa de Entrega', 'Desconto', 'Total', 'Pagamento', 'Status Pgto', 'Entrega', 'Cupom', 'Produto', 'Qtd', 'Preço Unit.', 'Subtotal Item', 'Adicionais', 'Sabores', 'Observação']
      : ['Pedido', 'Data', 'Cliente', 'Telefone', 'Status', 'Subtotal', 'Taxa de Entrega', 'Desconto', 'Total', 'Pagamento', 'Status Pgto', 'Entrega', 'Cupom'];
    
    const data: any[] = [];
    
    filteredOrders.forEach(order => {
      const orderData: any = {
        'Pedido': order.order_number,
        'Data': format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        'Cliente': order.customer_name,
        'Telefone': order.customer_phone,
        'Status': order.status,
        'Subtotal': order.subtotal,
        'Taxa de Entrega': order.delivery_fee,
        'Desconto': order.coupon_discount || 0,
        'Total': order.total,
        'Pagamento': order.payment_method,
        'Status Pgto': order.payment_received ? 'Pagamento recebido' : 'Pagamento pendente',
        'Entrega': order.delivery_type === 'delivery' ? 'Entrega' : 'Retirada',
        'Cupom': order.coupon_code || '-'
      };

      if (showOrderItems && order.items && order.items.length > 0) {
        order.items.forEach((item, itemIndex) => {
          const addons = item.addons.map(a => `${a.addon_name} (+R$ ${a.addon_price.toFixed(2)})`).join(', ') || '-';
          const flavors = item.flavors.map(f => `${f.flavor_name} (+R$ ${f.flavor_price.toFixed(2)})`).join(', ') || '-';
          
          if (itemIndex === 0) {
            data.push({
              ...orderData,
              'Produto': item.product_name,
              'Qtd': item.quantity,
              'Preço Unit.': item.unit_price,
              'Subtotal Item': item.subtotal,
              'Adicionais': addons,
              'Sabores': flavors,
              'Observação': item.observation || '-'
            });
          } else {
            data.push({
              'Pedido': '',
              'Data': '',
              'Cliente': '',
              'Telefone': '',
              'Status': '',
              'Subtotal': '',
              'Taxa de Entrega': '',
              'Desconto': '',
              'Total': '',
              'Pagamento': '',
              'Status Pgto': '',
              'Entrega': '',
              'Cupom': '',
              'Produto': item.product_name,
              'Qtd': item.quantity,
              'Preço Unit.': item.unit_price,
              'Subtotal Item': item.subtotal,
              'Adicionais': addons,
              'Sabores': flavors,
              'Observação': item.observation || '-'
            });
          }
        });
      } else {
        data.push(orderData);
      }
    });

    const ws = XLSX.utils.json_to_sheet(data);

    // Formatação de colunas
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!ws[address]) continue;
      ws[address].s = {
        font: {
          bold: true
        },
        fill: {
          fgColor: {
            rgb: "4F46E5"
          }
        }
      };
    }

    // Auto-width das colunas
    const colWidths = headers.map(h => ({
      wch: Math.max(h.length, 15)
    }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
    XLSX.writeFile(wb, `relatorio_pedidos_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast({
      title: "Excel gerado!",
      description: "O relatório foi exportado com sucesso."
    });
  };
  return <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold gradient-text">Relatório de Pedidos</h2>
        <p className="text-muted-foreground">Visualize e exporte todos os pedidos do período selecionado</p>
      </div>
      
      <Card>
      <CardHeader className="flex flex-col gap-4">
          <div className="flex gap-3">
            <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="default" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Filtros de Pedidos</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Buscar pedido por número, cliente ou cupom..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Status do Pedido</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="confirmed">Confirmado</SelectItem>
                        <SelectItem value="preparing">Preparando</SelectItem>
                        <SelectItem value="ready">Pronto</SelectItem>
                        <SelectItem value="out_for_delivery">Saiu para entrega</SelectItem>
                        <SelectItem value="delivered">Entregue</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status do Pagamento</Label>
                    <Select value={paymentFilter} onValueChange={(value: 'all' | 'received' | 'pending') => setPaymentFilter(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status Pgto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="received">Pagamento Recebido</SelectItem>
                        <SelectItem value="pending">Pagamento Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Pedido</Label>
                    <Select value={scheduledFilter} onValueChange={(value: 'all' | 'scheduled' | 'normal') => setScheduledFilter(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo de Pedido" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="scheduled">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Agendados
                          </div>
                        </SelectItem>
                        <SelectItem value="normal">Normais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Entrega</Label>
                    <Select value={deliveryTypeFilter} onValueChange={(value: 'all' | 'delivery' | 'pickup') => setDeliveryTypeFilter(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo Entrega" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="delivery">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Delivery
                          </div>
                        </SelectItem>
                        <SelectItem value="pickup">Retirada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Método de Pagamento</Label>
                    <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pgto Método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pix">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            PIX
                          </div>
                        </SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Faixa de Valor</Label>
                    <Select value={valueRangeFilter} onValueChange={(value: 'all' | 'low' | 'medium' | 'high') => setValueRangeFilter(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Valor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Até R$ 50
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">R$ 50 - R$ 100</SelectItem>
                        <SelectItem value="high">Acima de R$ 100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cupom Aplicado</Label>
                    <Select value={couponFilter} onValueChange={setCouponFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Cupom" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="no-coupon">Sem cupom</SelectItem>
                        {availableCoupons.map((coupon) => (
                          <SelectItem key={coupon.id} value={coupon.code}>
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4" />
                              {coupon.code}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                     </Select>
                   </div>

                   <div className="space-y-2">
                     <Label>Exibir Itens do Pedido</Label>
                     <div className="flex items-center space-x-2">
                       <Switch
                         id="show-items"
                         checked={showOrderItems}
                         onCheckedChange={setShowOrderItems}
                       />
                       <Label htmlFor="show-items" className="cursor-pointer text-sm text-muted-foreground">
                         Mostrar produtos de cada pedido na tabela
                       </Label>
                     </div>
                   </div>

                   <div className="flex gap-2 pt-4">
                     <Button variant="outline" className="flex-1" onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setPaymentFilter("all");
                    setScheduledFilter("all");
                    setDeliveryTypeFilter("all");
                     setPaymentMethodFilter("all");
                     setValueRangeFilter("all");
                     setCouponFilter("all");
                     setShowOrderItems(false);
                   }}>
                       Limpar Filtros
                     </Button>
                    <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
                      Aplicar Filtros
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="default" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Colunas
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Personalizar Colunas</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="col-order" checked={visibleColumns.order_number} onCheckedChange={checked => setVisibleColumns(prev => ({
                    ...prev,
                    order_number: checked as boolean
                  }))} />
                    <Label htmlFor="col-order" className="cursor-pointer">Pedido</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="col-date" checked={visibleColumns.date} onCheckedChange={checked => setVisibleColumns(prev => ({
                    ...prev,
                    date: checked as boolean
                  }))} />
                    <Label htmlFor="col-date" className="cursor-pointer">Data</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="col-customer" checked={visibleColumns.customer_name} onCheckedChange={checked => setVisibleColumns(prev => ({
                    ...prev,
                    customer_name: checked as boolean
                  }))} />
                    <Label htmlFor="col-customer" className="cursor-pointer">Cliente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="col-phone" checked={visibleColumns.customer_phone} onCheckedChange={checked => setVisibleColumns(prev => ({
                    ...prev,
                    customer_phone: checked as boolean
                  }))} />
                    <Label htmlFor="col-phone" className="cursor-pointer">Telefone</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="col-status" checked={visibleColumns.status} onCheckedChange={checked => setVisibleColumns(prev => ({
                    ...prev,
                    status: checked as boolean
                  }))} />
                    <Label htmlFor="col-status" className="cursor-pointer">Status</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="col-subtotal" checked={visibleColumns.subtotal} onCheckedChange={checked => setVisibleColumns(prev => ({
                    ...prev,
                    subtotal: checked as boolean
                  }))} />
                    <Label htmlFor="col-subtotal" className="cursor-pointer">Subtotal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="col-fee" checked={visibleColumns.delivery_fee} onCheckedChange={checked => setVisibleColumns(prev => ({
                    ...prev,
                    delivery_fee: checked as boolean
                  }))} />
                    <Label htmlFor="col-fee" className="cursor-pointer">Taxa</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="col-discount" checked={visibleColumns.discount} onCheckedChange={checked => setVisibleColumns(prev => ({
                    ...prev,
                    discount: checked as boolean
                  }))} />
                    <Label htmlFor="col-discount" className="cursor-pointer">Desconto</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="col-total" checked={visibleColumns.total} onCheckedChange={checked => setVisibleColumns(prev => ({
                    ...prev,
                    total: checked as boolean
                  }))} />
                    <Label htmlFor="col-total" className="cursor-pointer">Total</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="col-payment" checked={visibleColumns.payment_method} onCheckedChange={checked => setVisibleColumns(prev => ({
                    ...prev,
                    payment_method: checked as boolean
                  }))} />
                    <Label htmlFor="col-payment" className="cursor-pointer">Pagamento</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="col-payment-status" checked={visibleColumns.payment_status} onCheckedChange={checked => setVisibleColumns(prev => ({
                    ...prev,
                    payment_status: checked as boolean
                  }))} />
                    <Label htmlFor="col-payment-status" className="cursor-pointer">Status Pgto</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="col-delivery" checked={visibleColumns.delivery_type} onCheckedChange={checked => setVisibleColumns(prev => ({
                    ...prev,
                    delivery_type: checked as boolean
                  }))} />
                    <Label htmlFor="col-delivery" className="cursor-pointer">Entrega</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="col-scheduled" checked={visibleColumns.scheduled} onCheckedChange={checked => setVisibleColumns(prev => ({
                    ...prev,
                    scheduled: checked as boolean
                  }))} />
                    <Label htmlFor="col-scheduled" className="cursor-pointer">Agendado</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="col-coupon" checked={visibleColumns.coupon} onCheckedChange={checked => setVisibleColumns(prev => ({
                    ...prev,
                    coupon: checked as boolean
                  }))} />
                    <Label htmlFor="col-coupon" className="cursor-pointer">Cupom</Label>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredOrders.length === 0} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel} disabled={filteredOrders.length === 0} className="flex-1 sm:flex-none">
              <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF} disabled={filteredOrders.length === 0} className="flex-1 sm:flex-none">
              <FileText className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <ScrollableTable maxHeight="h-[400px] sm:h-[500px]">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  {visibleColumns.order_number && <TableHead>Pedido</TableHead>}
                  {visibleColumns.date && <TableHead>Data</TableHead>}
                  {visibleColumns.customer_name && <TableHead>Cliente</TableHead>}
                  {visibleColumns.customer_phone && <TableHead>Telefone</TableHead>}
                  {visibleColumns.status && <TableHead>Status</TableHead>}
                  {visibleColumns.subtotal && <TableHead className="text-right">Subtotal</TableHead>}
                  {visibleColumns.delivery_fee && <TableHead className="text-right">Taxa</TableHead>}
                  {visibleColumns.total && <TableHead className="text-right">Total</TableHead>}
                  {visibleColumns.payment_method && <TableHead>Forma Pag</TableHead>}
                  {visibleColumns.payment_status && <TableHead>Status Pgto</TableHead>}
                  {visibleColumns.delivery_type && <TableHead>Entrega</TableHead>}
                  {visibleColumns.scheduled && <TableHead>Agendado</TableHead>}
                  {visibleColumns.coupon && <TableHead>Cupom</TableHead>}
                  {visibleColumns.discount && <TableHead className="text-right">Desconto</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? <TableRow>
                    <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length} className="text-center text-muted-foreground">
                      {searchTerm || statusFilter !== "all" ? 'Nenhum pedido encontrado com os filtros selecionados' : 'Nenhum pedido no período selecionado'}
                    </TableCell>
                   </TableRow> : paginatedOrders.map(order => (
                    <>
                      <TableRow key={order.id}>
                        {visibleColumns.order_number && <TableCell className="font-mono font-medium">
                            #{order.order_number}
                          </TableCell>}
                        {visibleColumns.date && <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", {
                      locale: ptBR
                    })}
                          </TableCell>}
                        {visibleColumns.customer_name && <TableCell className="font-medium">{order.customer_name}</TableCell>}
                        {visibleColumns.customer_phone && <TableCell className="text-sm">{order.customer_phone}</TableCell>}
                        {visibleColumns.status && <TableCell>
                            <Badge variant={order.status === 'delivered' ? 'default' : order.status === 'cancelled' ? 'destructive' : order.status === 'pending' ? 'secondary' : 'outline'} className="capitalize">
                              {order.status === 'pending' && 'Pendente'}
                              {order.status === 'confirmed' && 'Confirmado'}
                              {order.status === 'preparing' && 'Preparando'}
                              {order.status === 'ready' && 'Pronto'}
                              {order.status === 'out_for_delivery' && 'Saiu p/ entrega'}
                              {order.status === 'delivered' && 'Entregue'}
                              {order.status === 'cancelled' && 'Cancelado'}
                            </Badge>
                          </TableCell>}
                        {visibleColumns.subtotal && <TableCell className="text-right">
                            R$ {order.subtotal.toFixed(2)}
                          </TableCell>}
                        {visibleColumns.delivery_fee && <TableCell className="text-right text-muted-foreground">
                            {order.delivery_fee > 0 ? `R$ ${order.delivery_fee.toFixed(2)}` : '-'}
                          </TableCell>}
                        {visibleColumns.total && <TableCell className="text-right font-bold">
                            R$ {order.total.toFixed(2)}
                          </TableCell>}
                        {visibleColumns.payment_method && <TableCell className="capitalize text-sm">
                            {order.payment_method === 'pix' && 'PIX'}
                            {order.payment_method === 'credit_card' && 'Cartão Crédito'}
                            {order.payment_method === 'debit_card' && 'Cartão Débito'}
                            {order.payment_method === 'cash' && 'Dinheiro'}
                            {order.payment_method === 'voucher' && 'Vale'}
                            {!['pix', 'credit_card', 'debit_card', 'cash', 'voucher'].includes(order.payment_method) && order.payment_method}
                            {order.change_amount && order.change_amount > 0 && <div className="text-xs text-muted-foreground">
                                Troco: R$ {order.change_amount.toFixed(2)}
                              </div>}
                          </TableCell>}
                        {visibleColumns.payment_status && <TableCell>
                            <Badge variant={order.payment_received ? 'default' : 'secondary'} className={order.payment_received ? 'bg-green-600' : 'bg-yellow-600'}>
                              {order.payment_received ? 'Pagamento recebido' : 'Pagamento pendente'}
                            </Badge>
                          </TableCell>}
                        {visibleColumns.delivery_type && <TableCell className="capitalize">
                            <Badge variant={order.delivery_type === 'delivery' ? 'default' : 'secondary'}>
                              {order.delivery_type === 'delivery' ? 'Entrega' : 'Retirada'}
                            </Badge>
                            {order.delivery_type === 'delivery' && order.delivery_neighborhood && <div className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate">
                                {order.delivery_neighborhood}
                              </div>}
                          </TableCell>}
                        {visibleColumns.scheduled && <TableCell className="text-center">
                            {isOrderScheduled(order) ? <Badge variant="outline" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Sim
                              </Badge> : <span className="text-muted-foreground">-</span>}
                          </TableCell>}
                        {visibleColumns.coupon && <TableCell>
                            {order.coupon_code ? <Badge variant="outline" className="gap-1">
                                <Tag className="h-3 w-3" />
                                {order.coupon_code}
                              </Badge> : <span className="text-muted-foreground">-</span>}
                          </TableCell>}
                        {visibleColumns.discount && <TableCell className="text-right">
                            {order.coupon_discount && order.coupon_discount > 0 ? <span className="text-green-600">-R$ {order.coupon_discount.toFixed(2)}</span> : <span className="text-muted-foreground">-</span>}
                          </TableCell>}
                      </TableRow>
                      
                      {/* Linha de itens do pedido */}
                      {showOrderItems && order.items && order.items.length > 0 && (
                        <TableRow key={`${order.id}-items`} className="bg-muted/30">
                          <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length}>
                            <div className="p-3 space-y-2">
                              <p className="text-sm font-semibold text-muted-foreground mb-2">Itens do Pedido:</p>
                              {order.items.map((item, idx) => (
                                <div key={item.id} className="border-l-2 border-primary pl-3 py-1">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">
                                        {item.quantity}x {item.product_name}
                                      </p>
                                      
                                      {item.flavors.length > 0 && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          <span className="font-semibold">Sabores:</span> {item.flavors.map(f => f.flavor_name).join(', ')}
                                        </div>
                                      )}
                                      
                                      {item.addons.length > 0 && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          <span className="font-semibold">Adicionais:</span> {item.addons.map(a => a.addon_name).join(', ')}
                                        </div>
                                      )}
                                      
                                      {item.observation && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          <span className="font-semibold">Obs:</span> {item.observation}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right ml-4">
                                      <p className="text-sm font-medium">R$ {item.subtotal.toFixed(2)}</p>
                                      <p className="text-xs text-muted-foreground">R$ {item.unit_price.toFixed(2)} un.</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
              </TableBody>
              </Table>
            </ScrollableTable>

          {filteredOrders.length > 0 && <>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                  <p className="text-xl font-bold">{filteredOrders.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-xl font-bold text-green-600">
                    R$ {filteredOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-xl font-bold">
                    R$ {(filteredOrders.reduce((sum, order) => sum + order.total, 0) / filteredOrders.length).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Descontos Aplicados</p>
                  <p className="text-xl font-bold text-orange-600">
                    R$ {filteredOrders.reduce((sum, order) => sum + (order.coupon_discount || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </>}

          {/* Paginação */}
          {totalPages > 1 && <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                  
                  {Array.from({
                length: totalPages
              }, (_, i) => i + 1).map(page => <PaginationItem key={page}>
                      <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">
                        {page}
                      </PaginationLink>
                    </PaginationItem>)}

                  <PaginationItem>
                    <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>}
        </CardContent>
      </Card>
    </div>;
};