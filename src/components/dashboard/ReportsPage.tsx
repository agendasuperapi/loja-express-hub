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
import { Search, Users, Package, DollarSign, Download, Calendar as CalendarIcon, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface ReportsPageProps {
  storeId: string;
}

interface Customer {
  customer_name: string;
  customer_phone: string;
  delivery_street: string;
  delivery_number: string;
  delivery_neighborhood: string;
  delivery_complement: string;
  total_orders: number;
  total_spent: number;
  last_order: string;
}

interface ProductReport {
  product_name: string;
  quantity_sold: number;
  revenue: number;
  orders_count: number;
}

interface RevenueData {
  total_revenue: number;
  total_orders: number;
  average_ticket: number;
}

export const ReportsPage = ({ storeId }: ReportsPageProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<ProductReport[]>([]);
  const [revenue, setRevenue] = useState<RevenueData>({
    total_revenue: 0,
    total_orders: 0,
    average_ticket: 0,
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [loading, setLoading] = useState(true);

  // Função para calcular o período de datas
  const getDateRange = () => {
    const now = new Date();
    
    switch (periodFilter) {
      case "today":
        return { from: new Date(now.setHours(0, 0, 0, 0)), to: new Date() };
      case "week":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { from: weekAgo, to: new Date() };
      case "month":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "last_month":
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case "year":
        return { from: startOfYear(now), to: endOfYear(now) };
      case "custom":
        return customDateRange;
      default:
        return { from: undefined, to: undefined };
    }
  };

  // Buscar dados de clientes
  const fetchCustomers = async () => {
    try {
      const dateRange = getDateRange();
      
      let query = supabase
        .from('orders')
        .select('customer_name, customer_phone, delivery_street, delivery_number, delivery_neighborhood, delivery_complement, total, created_at')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Agrupar por cliente
      const customerMap = new Map<string, Customer>();
      
      data?.forEach((order) => {
        const key = order.customer_phone;
        const existing = customerMap.get(key);
        
        if (existing) {
          existing.total_orders += 1;
          existing.total_spent += order.total || 0;
          if (new Date(order.created_at) > new Date(existing.last_order)) {
            existing.last_order = order.created_at;
          }
        } else {
          customerMap.set(key, {
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            delivery_street: order.delivery_street || '',
            delivery_number: order.delivery_number || '',
            delivery_neighborhood: order.delivery_neighborhood || '',
            delivery_complement: order.delivery_complement || '',
            total_orders: 1,
            total_spent: order.total || 0,
            last_order: order.created_at,
          });
        }
      });

      setCustomers(Array.from(customerMap.values()));
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de clientes",
        variant: "destructive",
      });
    }
  };

  // Buscar dados de produtos
  const fetchProducts = async () => {
    try {
      const dateRange = getDateRange();
      
      let query = supabase
        .from('order_items')
        .select(`
          product_name,
          quantity,
          subtotal,
          order_id,
          orders!inner(store_id, created_at)
        `)
        .eq('orders.store_id', storeId);

      if (dateRange.from) {
        query = query.gte('orders.created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('orders.created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Agrupar por produto
      const productMap = new Map<string, ProductReport>();
      
      data?.forEach((item: any) => {
        const existing = productMap.get(item.product_name);
        
        if (existing) {
          existing.quantity_sold += item.quantity;
          existing.revenue += item.subtotal || 0;
          existing.orders_count += 1;
        } else {
          productMap.set(item.product_name, {
            product_name: item.product_name,
            quantity_sold: item.quantity,
            revenue: item.subtotal || 0,
            orders_count: 1,
          });
        }
      });

      const sortedProducts = Array.from(productMap.values()).sort(
        (a, b) => b.quantity_sold - a.quantity_sold
      );

      setProducts(sortedProducts);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de produtos",
        variant: "destructive",
      });
    }
  };

  // Buscar dados de faturamento
  const fetchRevenue = async () => {
    try {
      const dateRange = getDateRange();
      
      let query = supabase
        .from('orders')
        .select('total')
        .eq('store_id', storeId);

      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const total = data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
      const count = data?.length || 0;
      const average = count > 0 ? total / count : 0;

      setRevenue({
        total_revenue: total,
        total_orders: count,
        average_ticket: average,
      });
    } catch (error) {
      console.error('Erro ao buscar faturamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de faturamento",
        variant: "destructive",
      });
    }
  };

  // Carregar todos os dados
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCustomers(), fetchProducts(), fetchRevenue()]);
      setLoading(false);
    };

    if (storeId) {
      loadData();
    }
  }, [storeId, periodFilter, customDateRange]);

  // Filtrar clientes pela busca
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    
    const term = searchTerm.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.customer_name.toLowerCase().includes(term) ||
        customer.customer_phone.includes(term) ||
        customer.delivery_neighborhood?.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground mt-2">
          Análise detalhada de clientes, produtos e faturamento
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Últimos 7 dias</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="last_month">Mês passado</SelectItem>
                  <SelectItem value="year">Este ano</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodFilter === "custom" && (
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !customDateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange.from ? (
                        format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        "Data inicial"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDateRange.from}
                      onSelect={(date) =>
                        setCustomDateRange({ ...customDateRange, from: date })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !customDateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange.to ? (
                        format(customDateRange.to, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        "Data final"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDateRange.to}
                      onSelect={(date) =>
                        setCustomDateRange({ ...customDateRange, to: date })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {revenue.total_revenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {revenue.total_orders} pedidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {revenue.average_ticket.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Por pedido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Clientes únicos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Relatório de Clientes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Relatório de Clientes
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Lista de todos os clientes que fizeram pedidos
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCSV(filteredCustomers, 'relatorio_clientes')}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Total Gasto</TableHead>
                  <TableHead>Último Pedido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente no período selecionado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{customer.customer_name}</TableCell>
                      <TableCell>{customer.customer_phone}</TableCell>
                      <TableCell>
                        {customer.delivery_street && customer.delivery_number ? (
                          <div className="text-sm">
                            <div>{customer.delivery_street}, {customer.delivery_number}</div>
                            {customer.delivery_complement && (
                              <div className="text-muted-foreground">{customer.delivery_complement}</div>
                            )}
                            <div className="text-muted-foreground">{customer.delivery_neighborhood}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{customer.total_orders}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {customer.total_spent.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(customer.last_order), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Relatório de Produtos Mais Vendidos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produtos Mais Vendidos
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Ranking dos produtos por quantidade vendida
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCSV(products, 'relatorio_produtos')}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posição</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade Vendida</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum produto vendido no período selecionado
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge
                          variant={index < 3 ? "default" : "secondary"}
                          className={cn(
                            index === 0 && "bg-yellow-500 hover:bg-yellow-600",
                            index === 1 && "bg-gray-400 hover:bg-gray-500",
                            index === 2 && "bg-orange-600 hover:bg-orange-700"
                          )}
                        >
                          #{index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{product.product_name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{product.quantity_sold} unidades</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {product.orders_count}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        R$ {product.revenue.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};
