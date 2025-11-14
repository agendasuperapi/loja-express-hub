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
import { Search, ShoppingCart, Download, Tag, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { generateOrdersReport } from "@/lib/pdfReports";

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
  delivery_type: string;
  delivery_street: string | null;
  delivery_number: string | null;
  delivery_neighborhood: string | null;
  delivery_complement: string | null;
  change_amount: number | null;
  notes: string | null;
  created_at: string;
}

interface OrdersReportProps {
  storeId: string;
  storeName?: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
}

export const OrdersReport = ({ storeId, storeName = "Minha Loja", dateRange }: OrdersReportProps) => {
  const [orders, setOrders] = useState<OrderReport[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('orders')
        .select('*')
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
        delivery_type: order.delivery_type,
        delivery_street: order.delivery_street || null,
        delivery_number: order.delivery_number || null,
        delivery_neighborhood: order.delivery_neighborhood || null,
        delivery_complement: order.delivery_complement || null,
        change_amount: order.change_amount || null,
        notes: order.notes || null,
        created_at: order.created_at,
      }));

      setOrders(mappedData);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pedidos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchOrders();
    }
  }, [storeId, dateRange]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (statusFilter !== "all") {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.order_number.toLowerCase().includes(term) ||
          order.customer_name.toLowerCase().includes(term) ||
          order.customer_phone.includes(term) ||
          order.coupon_code?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [orders, searchTerm, statusFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateRange]);

  const exportToCSV = () => {
    const headers = Object.keys(filteredOrders[0] || {});
    const csvContent = [
      headers.join(','),
      ...filteredOrders.map(row => headers.map(header => `"${(row as any)[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_pedidos_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const periodLabel = dateRange.from && dateRange.to
      ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
      : "Todos os períodos";
    
    const ordersForReport = filteredOrders.map(order => ({
      id: order.id,
      created_at: order.created_at,
      customer_name: order.customer_name,
      total: order.total,
      status: order.status,
      payment_method: order.payment_method
    }));

    generateOrdersReport(ordersForReport, storeName, periodLabel);
    
    toast({
      title: "PDF gerado!",
      description: "O relatório foi exportado com sucesso.",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex-1 flex gap-4">
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar pedido por número, cliente ou cupom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-[150px]">
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
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={filteredOrders.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              disabled={filteredOrders.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Cupom</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground">
                      {searchTerm || statusFilter !== "all" 
                        ? 'Nenhum pedido encontrado com os filtros selecionados' 
                        : 'Nenhum pedido no período selecionado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-medium">
                        #{order.order_number}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{order.customer_name}</TableCell>
                      <TableCell className="text-sm">{order.customer_phone}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === 'delivered' ? 'default' :
                            order.status === 'cancelled' ? 'destructive' :
                            order.status === 'pending' ? 'secondary' :
                            'outline'
                          }
                          className="capitalize"
                        >
                          {order.status === 'pending' && 'Pendente'}
                          {order.status === 'confirmed' && 'Confirmado'}
                          {order.status === 'preparing' && 'Preparando'}
                          {order.status === 'ready' && 'Pronto'}
                          {order.status === 'out_for_delivery' && 'Saiu p/ entrega'}
                          {order.status === 'delivered' && 'Entregue'}
                          {order.status === 'cancelled' && 'Cancelado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {order.subtotal.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {order.delivery_fee > 0 ? `R$ ${order.delivery_fee.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.coupon_discount && order.coupon_discount > 0 ? (
                          <span className="text-green-600">-R$ {order.coupon_discount.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        R$ {order.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="capitalize text-sm">
                        {order.payment_method === 'pix' && 'PIX'}
                        {order.payment_method === 'credit_card' && 'Cartão Crédito'}
                        {order.payment_method === 'debit_card' && 'Cartão Débito'}
                        {order.payment_method === 'cash' && 'Dinheiro'}
                        {order.payment_method === 'voucher' && 'Vale'}
                        {!['pix', 'credit_card', 'debit_card', 'cash', 'voucher'].includes(order.payment_method) && order.payment_method}
                        {order.change_amount && order.change_amount > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Troco: R$ {order.change_amount.toFixed(2)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">
                        <Badge variant={order.delivery_type === 'delivery' ? 'default' : 'secondary'}>
                          {order.delivery_type === 'delivery' ? 'Entrega' : 'Retirada'}
                        </Badge>
                        {order.delivery_type === 'delivery' && order.delivery_neighborhood && (
                          <div className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate">
                            {order.delivery_neighborhood}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.coupon_code ? (
                          <Badge variant="outline" className="gap-1">
                            <Tag className="h-3 w-3" />
                            {order.coupon_code}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {filteredOrders.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                  <p className="text-2xl font-bold">{filteredOrders.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {filteredOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold">
                    R$ {(filteredOrders.reduce((sum, order) => sum + order.total, 0) / filteredOrders.length).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Descontos Aplicados</p>
                  <p className="text-2xl font-bold text-orange-600">
                    R$ {filteredOrders.reduce((sum, order) => sum + (order.coupon_discount || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
  );
};
