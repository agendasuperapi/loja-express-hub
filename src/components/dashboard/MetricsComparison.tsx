import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isWithinInterval, startOfDay, endOfDay, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users, CreditCard, Clock, ArrowRight, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface MetricsComparisonProps {
  orders: any[];
  products: any[];
}

const COLORS = ['#FF6B35', '#F7931E', '#FDC830', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA15E', '#BC6C25'];

export const MetricsComparison = ({ orders, products }: MetricsComparisonProps) => {
  const [period1, setPeriod1] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(new Date().setDate(new Date().getDate() - 16)),
  });

  const [period2, setPeriod2] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: new Date(new Date().setDate(new Date().getDate() - 15)),
    to: new Date(),
  });

  const filterOrdersByPeriod = (period: { from: Date | undefined; to: Date | undefined }) => {
    if (!period.from || !period.to || !orders || !Array.isArray(orders)) return [];
    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return isWithinInterval(orderDate, {
        start: startOfDay(period.from!),
        end: endOfDay(period.to!),
      });
    });
  };

  const period1Orders = useMemo(() => filterOrdersByPeriod(period1), [orders, period1]);
  const period2Orders = useMemo(() => filterOrdersByPeriod(period2), [orders, period2]);

  const calculateMetrics = (ordersData: any[]) => {
    const completedOrders = ordersData.filter(o => o.status === 'completed' || o.status === 'delivered');
    const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const totalOrders = ordersData.length;
    const completedCount = completedOrders.length;
    const avgOrderValue = completedCount > 0 ? totalRevenue / completedCount : 0;
    const conversionRate = totalOrders > 0 ? (completedCount / totalOrders) * 100 : 0;

    // Top selling products
    const productSales: { [key: string]: { name: string; count: number; revenue: number } } = {};
    completedOrders.forEach(order => {
      if (order.items) {
        order.items.forEach((item: any) => {
          if (!productSales[item.product_id]) {
            productSales[item.product_id] = { name: item.product_name, count: 0, revenue: 0 };
          }
          productSales[item.product_id].count += item.quantity;
          productSales[item.product_id].revenue += item.quantity * item.price;
        });
      }
    });

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Payment methods
    const paymentMethods: { [key: string]: number } = {};
    completedOrders.forEach(order => {
      const method = order.payment_method || 'Não especificado';
      paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    });

    // Orders by day
    const ordersByDay: { [key: string]: number } = {};
    ordersData.forEach(order => {
      const day = format(new Date(order.created_at), 'dd/MM');
      ordersByDay[day] = (ordersByDay[day] || 0) + 1;
    });

    // Orders by hour
    const ordersByHour: { [key: number]: number } = {};
    ordersData.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      ordersByHour[hour] = (ordersByHour[hour] || 0) + 1;
    });

    // Payment status metrics
    const receivedPayments = ordersData.filter(o => o.payment_received === true);
    const pendingPayments = ordersData.filter(o => o.payment_received !== true);
    const receivedPaymentsCount = receivedPayments.length;
    const pendingPaymentsCount = pendingPayments.length;
    const receivedPaymentsValue = receivedPayments.reduce((sum, order) => sum + (order.total || 0), 0);
    const pendingPaymentsValue = pendingPayments.reduce((sum, order) => sum + (order.total || 0), 0);

    return {
      totalRevenue,
      totalOrders,
      completedCount,
      avgOrderValue,
      conversionRate,
      topProducts,
      paymentMethods,
      ordersByDay,
      ordersByHour,
      receivedPaymentsCount,
      pendingPaymentsCount,
      receivedPaymentsValue,
      pendingPaymentsValue,
    };
  };

  const metrics1 = useMemo(() => calculateMetrics(period1Orders), [period1Orders]);
  const metrics2 = useMemo(() => calculateMetrics(period2Orders), [period2Orders]);

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-500";
    if (change < 0) return "text-red-500";
    return "text-muted-foreground";
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowRight className="w-4 h-4 rotate-[-45deg] text-green-500" />;
    if (change < 0) return <ArrowRight className="w-4 h-4 rotate-[45deg] text-red-500" />;
    return <ArrowRight className="w-4 h-4 text-muted-foreground" />;
  };

  const prepareChartData = (data1: any, data2: any, key: string) => {
    const keys = new Set([...Object.keys(data1), ...Object.keys(data2)]);
    return Array.from(keys).map(k => ({
      name: k,
      periodo1: data1[k] || 0,
      periodo2: data2[k] || 0,
    })).sort((a, b) => a.name.localeCompare(b.name));
  };

  const ordersByDayData = prepareChartData(metrics1.ordersByDay, metrics2.ordersByDay, 'day');
  
  const ordersByHourData = Array.from({ length: 24 }, (_, i) => ({
    hora: `${i}h`,
    periodo1: metrics1.ordersByHour[i] || 0,
    periodo2: metrics2.ordersByHour[i] || 0,
  }));

  const paymentMethodsData1 = Object.entries(metrics1.paymentMethods).map(([name, value]) => ({
    name,
    value,
  }));

  const paymentMethodsData2 = Object.entries(metrics2.paymentMethods).map(([name, value]) => ({
    name,
    value,
  }));

  const period1Days = period1.from && period1.to ? differenceInDays(period1.to, period1.from) + 1 : 0;
  const period2Days = period2.from && period2.to ? differenceInDays(period2.to, period2.from) + 1 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold text-orange-500 mb-2">Análise Comparativa de Métricas</h2>
          <p className="text-muted-foreground">Compare o desempenho entre dois períodos personalizados</p>
        </div>
        <BarChart3 className="w-12 h-12 text-orange-500" />
      </motion.div>

      {/* Period Selectors */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Period 1 */}
        <Card className="border-orange-500/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-500/10 to-transparent">
            <CardTitle className="flex items-center gap-2 text-orange-500">
              <CalendarIcon className="w-5 h-5" />
              Período 1
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Data Inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {period1.from ? format(period1.from, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={period1.from}
                      onSelect={(date) => setPeriod1({ ...period1, from: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Data Final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {period1.to ? format(period1.to, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={period1.to}
                      onSelect={(date) => setPeriod1({ ...period1, to: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Badge variant="outline" className="w-fit">
                {period1Days} {period1Days === 1 ? 'dia' : 'dias'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Period 2 */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
            <CardTitle className="flex items-center gap-2 text-primary">
              <CalendarIcon className="w-5 h-5" />
              Período 2
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Data Inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {period2.from ? format(period2.from, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={period2.from}
                      onSelect={(date) => setPeriod2({ ...period2, from: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Data Final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {period2.to ? format(period2.to, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={period2.to}
                      onSelect={(date) => setPeriod2({ ...period2, to: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Badge variant="outline" className="w-fit">
                {period2Days} {period2Days === 1 ? 'dia' : 'dias'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Metrics Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-xl font-bold mb-4">Métricas Principais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">P1:</span>
                  <span className="text-lg font-bold">R$ {metrics1.totalRevenue.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">P2:</span>
                  <span className="text-lg font-bold">R$ {metrics2.totalRevenue.toFixed(2)}</span>
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Variação:</span>
                <div className="flex items-center gap-1">
                  {getChangeIcon(calculateChange(metrics2.totalRevenue, metrics1.totalRevenue))}
                  <span className={cn("text-sm font-semibold", getChangeColor(calculateChange(metrics2.totalRevenue, metrics1.totalRevenue)))}>
                    {calculateChange(metrics2.totalRevenue, metrics1.totalRevenue).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Orders */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-500" />
                Total de Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">P1:</span>
                  <span className="text-lg font-bold">{metrics1.totalOrders}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">P2:</span>
                  <span className="text-lg font-bold">{metrics2.totalOrders}</span>
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Variação:</span>
                <div className="flex items-center gap-1">
                  {getChangeIcon(calculateChange(metrics2.totalOrders, metrics1.totalOrders))}
                  <span className={cn("text-sm font-semibold", getChangeColor(calculateChange(metrics2.totalOrders, metrics1.totalOrders)))}>
                    {calculateChange(metrics2.totalOrders, metrics1.totalOrders).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Order Value */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-purple-500" />
                Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">P1:</span>
                  <span className="text-lg font-bold">R$ {metrics1.avgOrderValue.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">P2:</span>
                  <span className="text-lg font-bold">R$ {metrics2.avgOrderValue.toFixed(2)}</span>
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Variação:</span>
                <div className="flex items-center gap-1">
                  {getChangeIcon(calculateChange(metrics2.avgOrderValue, metrics1.avgOrderValue))}
                  <span className={cn("text-sm font-semibold", getChangeColor(calculateChange(metrics2.avgOrderValue, metrics1.avgOrderValue)))}>
                    {calculateChange(metrics2.avgOrderValue, metrics1.avgOrderValue).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Rate */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                Taxa de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">P1:</span>
                  <span className="text-lg font-bold">{metrics1.conversionRate.toFixed(1)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">P2:</span>
                  <span className="text-lg font-bold">{metrics2.conversionRate.toFixed(1)}%</span>
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Variação:</span>
                <div className="flex items-center gap-1">
                  {getChangeIcon(calculateChange(metrics2.conversionRate, metrics1.conversionRate))}
                  <span className={cn("text-sm font-semibold", getChangeColor(calculateChange(metrics2.conversionRate, metrics1.conversionRate)))}>
                    {calculateChange(metrics2.conversionRate, metrics1.conversionRate).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status - Received */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-green-500" />
                Pgto Recebido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">P1:</span>
                  <span className="text-lg font-bold text-green-500">R$ {metrics1.receivedPaymentsValue.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">P2:</span>
                  <span className="text-lg font-bold text-green-500">R$ {metrics2.receivedPaymentsValue.toFixed(2)}</span>
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pedidos:</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs">P1: {metrics1.receivedPaymentsCount} | P2: {metrics2.receivedPaymentsCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status - Pending */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Pgto Pendente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">P1:</span>
                  <span className="text-lg font-bold text-amber-500">R$ {metrics1.pendingPaymentsValue.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">P2:</span>
                  <span className="text-lg font-bold text-amber-500">R$ {metrics2.pendingPaymentsValue.toFixed(2)}</span>
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pedidos:</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs">P1: {metrics1.pendingPaymentsCount} | P2: {metrics2.pendingPaymentsCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Orders by Day */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Pedidos por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ordersByDayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="periodo1" stroke="#FF6B35" name="Período 1" strokeWidth={2} />
                <Line type="monotone" dataKey="periodo2" stroke="#4ECDC4" name="Período 2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders by Hour */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Pedidos por Horário</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ordersByHourData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hora" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="periodo1" fill="#FF6B35" name="Período 1" />
                <Bar dataKey="periodo2" fill="#4ECDC4" name="Período 2" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods Period 1 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-500" />
              Métodos de Pagamento - Período 1
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentMethodsData1}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethodsData1.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods Period 2 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Métodos de Pagamento - Período 2
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentMethodsData2}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethodsData2.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Products Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Period 1 Top Products */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-500/10 to-transparent">
            <CardTitle className="flex items-center gap-2 text-orange-500">
              <Package className="w-5 h-5" />
              Top 5 Produtos - Período 1
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {metrics1.topProducts.length > 0 ? (
                metrics1.topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.count} unidades</p>
                      </div>
                    </div>
                    <span className="font-bold text-green-500">R$ {product.revenue.toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum produto vendido neste período</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Period 2 Top Products */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Package className="w-5 h-5" />
              Top 5 Produtos - Período 2
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {metrics2.topProducts.length > 0 ? (
                metrics2.topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.count} unidades</p>
                      </div>
                    </div>
                    <span className="font-bold text-green-500">R$ {product.revenue.toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum produto vendido neste período</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="shadow-lg border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Insights e Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {calculateChange(metrics2.totalRevenue, metrics1.totalRevenue) > 10 && (
                <div className="flex items-start gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-500">Crescimento Excelente!</p>
                    <p className="text-sm text-muted-foreground">Sua receita aumentou mais de 10% no período 2. Continue com as estratégias atuais!</p>
                  </div>
                </div>
              )}
              {calculateChange(metrics2.totalRevenue, metrics1.totalRevenue) < -10 && (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <TrendingDown className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-500">Atenção: Queda na Receita</p>
                    <p className="text-sm text-muted-foreground">Houve uma queda significativa na receita. Considere revisar preços, promoções ou estratégias de marketing.</p>
                  </div>
                </div>
              )}
              {calculateChange(metrics2.avgOrderValue, metrics1.avgOrderValue) > 5 && (
                <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <DollarSign className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-500">Ticket Médio em Alta</p>
                    <p className="text-sm text-muted-foreground">Os clientes estão gastando mais por pedido. Ótima oportunidade para upselling!</p>
                  </div>
                </div>
              )}
              {metrics2.conversionRate < 50 && (
                <div className="flex items-start gap-3 p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <Clock className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-500">Taxa de Conversão Baixa</p>
                    <p className="text-sm text-muted-foreground">Muitos pedidos não estão sendo finalizados. Verifique o processo de checkout e atendimento.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};