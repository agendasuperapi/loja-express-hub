import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useOrders } from "@/hooks/useOrders";
import { useFavorites } from "@/hooks/useFavorites";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart, Store, TrendingUp, Eye, X, Sparkles, Calendar as CalendarIcon, DollarSign, Package, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const CustomerDashboard = () => {
  const { orders, isLoading: ordersLoading } = useOrders();
  const { favorites } = useFavorites();
  const { profile } = useProfile();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Extract first name from full name
  const firstName = profile?.full_name?.split(' ')[0] || 'Visitante';

  // Helper functions
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      ready: 'Pronto',
      in_delivery: 'Em entrega',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };
    return statusMap[status] || status;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methodMap: Record<string, string> = {
      pix: 'PIX',
      dinheiro: 'Dinheiro',
      cartao: 'Cartão',
    };
    return methodMap[method] || method;
  };

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

  // Calculate metrics
  const totalOrders = filteredOrders?.length || 0;
  const totalSpent = filteredOrders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
  const averageOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const recentOrders = filteredOrders?.slice(0, 3) || [];

  // Orders by status
  const ordersByStatus = useMemo(() => {
    const statusCount: Record<string, number> = {};
    filteredOrders?.forEach(order => {
      const status = getStatusLabel(order.status);
      statusCount[status] = (statusCount[status] || 0) + 1;
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

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (ordersLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5
      }
    })
  };

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold gradient-text">Minhas Estatísticas</h2>
          <p className="text-muted-foreground">Acompanhe seus pedidos e gastos</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
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

          {periodFilter === "custom" && customDateRange.from && customDateRange.to && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomDatePicker(true)}
              className="gap-2 w-full sm:w-auto justify-center"
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="text-xs sm:text-sm">
                {format(customDateRange.from, "dd/MM/yy")} - {format(customDateRange.to, "dd/MM/yy")}
              </span>
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
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <Card className="hover-scale overflow-hidden relative border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <ShoppingBag className="h-5 w-5 text-primary" />
              </motion.div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl sm:text-3xl font-bold gradient-text">{totalOrders}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Pedidos realizados
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <Card className="hover-scale overflow-hidden relative border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <TrendingUp className="h-5 w-5 text-green-500" />
              </motion.div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl sm:text-3xl font-bold text-green-500">
                R$ {totalSpent.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Em todos os pedidos
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <Card className="hover-scale overflow-hidden relative border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <DollarSign className="h-5 w-5 text-purple-500" />
              </motion.div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl sm:text-3xl font-bold text-purple-500">
                R$ {averageOrder.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Valor médio por pedido
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <Card className="hover-scale overflow-hidden relative border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-transparent">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full -mr-16 -mt-16" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Lojas Favoritas</CardTitle>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
              </motion.div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl sm:text-3xl font-bold text-pink-500">{favorites?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Lojas salvas
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      {totalOrders > 0 && (
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

          {/* Value Over Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-500/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Valor Gasto ao Longo do Tempo
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
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']}
                    />
                    <Bar 
                      dataKey="valor" 
                      fill="hsl(142 76% 36%)"
                      radius={[8, 8, 0, 0]}
                      name="Valor"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Orders by Status */}
          {ordersByStatus.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500/5 to-transparent">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-500" />
                    Pedidos por Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={ordersByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                      >
                        {ordersByStatus.map((entry, index) => (
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

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-500/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <Button asChild className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90">
                  <Link to="/">
                    <Store className="h-4 w-4 mr-2" />
                    Explorar Lojas
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/orders">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Ver Todos os Pedidos
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Card className="border-muted/50 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Pedidos Recentes
              </CardTitle>
              <Button asChild variant="outline" size="sm" className="hover-scale">
                <Link to="/orders">Ver Todos</Link>
              </Button>
            </div>
          </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Você ainda não fez nenhum pedido
              </p>
              <Button asChild>
                <Link to="/">Explorar Lojas</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 border border-orange-200/50 rounded-lg bg-orange-50/30 hover:bg-orange-100/50 transition-all hover:shadow-md hover-scale"
                >
                  <div className="flex-1">
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">R$ {Number(order.total).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {getStatusLabel(order.status)}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedOrder(order)}
                      className="hover-scale"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
        </Card>
      </motion.div>

      {/* Favorite Stores */}
      {favorites && favorites.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Suas Lojas Favoritas</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link to="/">Ver Todas</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {favorites.slice(0, 6).map((storeId) => (
                <Link
                  key={storeId}
                  to={`/${storeId}`}
                  className="block"
                >
                  <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors hover-scale">
                    <div className="flex items-center gap-3">
                      <Heart className="h-5 w-5 text-primary fill-primary" />
                      <div>
                        <p className="font-medium">Loja Favorita</p>
                        <p className="text-sm text-muted-foreground">
                          Clique para visitar
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes do Pedido {selectedOrder?.order_number}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                <span className="font-medium">Status:</span>
                <span className="text-lg font-bold capitalize">
                  {getStatusLabel(selectedOrder.status)}
                </span>
              </div>

              {/* Customer Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Dados do Cliente</h3>
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nome:</span>
                    <span className="font-medium">{selectedOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefone:</span>
                    <span className="font-medium">{selectedOrder.customer_phone}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Endereço de Entrega</h3>
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rua:</span>
                    <span className="font-medium">{selectedOrder.delivery_street}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Número:</span>
                    <span className="font-medium">{selectedOrder.delivery_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bairro:</span>
                    <span className="font-medium">{selectedOrder.delivery_neighborhood}</span>
                  </div>
                  {selectedOrder.delivery_complement && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Complemento:</span>
                      <span className="font-medium">{selectedOrder.delivery_complement}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Pagamento</h3>
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Método:</span>
                    <span className="font-medium">{getPaymentMethodLabel(selectedOrder.payment_method)}</span>
                  </div>
                  {selectedOrder.change_amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Troco para:</span>
                      <span className="font-medium">R$ {Number(selectedOrder.change_amount).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Itens do Pedido</h3>
                  <div className="space-y-2">
                    {selectedOrder.order_items.map((item: any) => (
                      <div key={item.id} className="flex justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantidade: {item.quantity} x R$ {Number(item.unit_price).toFixed(2)}
                          </p>
                        </div>
                        <span className="font-medium">
                          R$ {Number(item.subtotal).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Observações</h3>
                  <p className="text-muted-foreground">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Totals */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">R$ {Number(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa de Entrega:</span>
                  <span className="font-medium">R$ {Number(selectedOrder.delivery_fee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>R$ {Number(selectedOrder.total).toFixed(2)}</span>
                </div>
              </div>

              {/* Close Button */}
              <Button 
                onClick={() => setSelectedOrder(null)} 
                className="w-full"
                variant="outline"
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
