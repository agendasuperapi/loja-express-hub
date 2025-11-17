import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOrders } from "@/hooks/useOrders";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Clock, CheckCircle, XCircle, Calendar as CalendarIcon, Store, Copy, Check, CreditCard, Mail, Phone, Key } from "lucide-react";
import { formatPixKey, validatePixKey } from "@/lib/pixValidation";
import { toast } from "@/hooks/use-toast";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { isStoreOpen, getStoreStatusText } from "@/lib/storeUtils";

const statusConfig = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-yellow-500' },
  confirmed: { label: 'Confirmado', icon: CheckCircle, color: 'bg-blue-500' },
  preparing: { label: 'Preparando', icon: Package, color: 'bg-purple-500' },
  ready: { label: 'Pronto', icon: CheckCircle, color: 'bg-teal-500' },
  in_delivery: { label: 'Em entrega', icon: Package, color: 'bg-orange-500' },
  delivered: { label: 'Entregue', icon: CheckCircle, color: 'bg-green-500' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'bg-red-500' },
};

type FilterType = 'day' | 'week' | 'month' | 'custom';
type PaymentFilterType = 'all' | 'pending' | 'received';

export default function Orders() {
  const navigate = useNavigate();
  const { orders, isLoading } = useOrders();
  const [filterType, setFilterType] = useState<FilterType>('day');
  const [customDate, setCustomDate] = useState<Date>();
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterType>('all');
  const [lastStore, setLastStore] = useState<{ slug: string; name: string } | null>(null);
  const [copiedPixKey, setCopiedPixKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('lastVisitedStore');
    if (stored) {
      setLastStore(JSON.parse(stored));
    }
  }, []);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (filterType) {
      case 'day':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now, { locale: ptBR });
        endDate = endOfWeek(now, { locale: ptBR });
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'custom':
        if (!customDate) return orders;
        startDate = startOfDay(customDate);
        endDate = endOfDay(customDate);
        break;
      default:
        return orders;
    }

    return orders.filter((order) => {
      const orderDate = new Date(order.created_at);
      const dateMatch = isWithinInterval(orderDate, { start: startDate, end: endDate });
      
      // Filtro de pagamento
      let paymentMatch = true;
      if (paymentFilter === 'pending') {
        paymentMatch = !(order as any).payment_received;
      } else if (paymentFilter === 'received') {
        paymentMatch = (order as any).payment_received === true;
      }
      
      return dateMatch && paymentMatch;
    });
  }, [orders, filterType, customDate, paymentFilter]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-4 md:pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">Meus Pedidos</h1>
              <p className="text-muted-foreground">
                Acompanhe o status dos seus pedidos
              </p>
            </div>
            {lastStore && (
              <Button
                onClick={() => navigate(`/${lastStore.slug}`)}
                className="bg-gradient-primary"
              >
                <Store className="w-4 h-4 mr-2" />
                Voltar para {lastStore.name}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Date Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Filtros de Data */}
                <div>
                  <p className="text-sm font-medium mb-2">Período</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={filterType === 'day' ? 'default' : 'outline'}
                      onClick={() => setFilterType('day')}
                      size="sm"
                    >
                      Hoje
                    </Button>
                    <Button
                      variant={filterType === 'week' ? 'default' : 'outline'}
                      onClick={() => setFilterType('week')}
                      size="sm"
                    >
                      Esta Semana
                    </Button>
                    <Button
                      variant={filterType === 'month' ? 'default' : 'outline'}
                      onClick={() => setFilterType('month')}
                      size="sm"
                    >
                      Este Mês
                    </Button>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={filterType === 'custom' ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customDate && filterType === 'custom' 
                            ? format(customDate, "dd/MM/yyyy")
                            : "Data Personalizada"
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customDate}
                          onSelect={(date) => {
                            setCustomDate(date);
                            if (date) setFilterType('custom');
                          }}
                          initialFocus
                          locale={ptBR}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>

                    <div className="ml-auto flex items-center text-sm text-muted-foreground">
                      {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Filtros de Pagamento */}
                <div>
                  <p className="text-sm font-medium mb-2">Status de Pagamento</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={paymentFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setPaymentFilter('all')}
                      size="sm"
                    >
                      Todos
                    </Button>
                    <Button
                      variant={paymentFilter === 'pending' ? 'default' : 'outline'}
                      onClick={() => setPaymentFilter('pending')}
                      size="sm"
                      className={paymentFilter === 'pending' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                    >
                      Pagamento Pendente
                    </Button>
                    <Button
                      variant={paymentFilter === 'received' ? 'default' : 'outline'}
                      onClick={() => setPaymentFilter('received')}
                      size="sm"
                      className={paymentFilter === 'received' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      Pagamento Recebido
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : !filteredOrders || filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-lg">
              {orders && orders.length > 0 
                ? 'Nenhum pedido encontrado neste período'
                : 'Você ainda não fez nenhum pedido'
              }
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order, index) => {
              const status = statusConfig[order.status as keyof typeof statusConfig];
              const StatusIcon = status.icon;
              
              // Check if this is a scheduled order
              const store = (order as any).stores;
              const storeIsCurrentlyOpen = store?.operating_hours ? isStoreOpen(store.operating_hours) : true;
              const storeStatusText = store?.operating_hours ? getStoreStatusText(store.operating_hours) : '';
              const allowOrdersWhenClosed = store?.allow_orders_when_closed ?? false;
              const isScheduledOrder = !storeIsCurrentlyOpen && allowOrdersWhenClosed && 
                                        (order.status === 'pending' || order.status === 'confirmed');

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-orange-300">
                    <CardContent className="p-6">
                      {/* Store Name */}
                      {order.stores && (
                        <div className="mb-4">
                          <h2 className="text-2xl font-bold text-primary">
                            {order.stores.name}
                          </h2>
                        </div>
                      )}
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
                        <div>
                          <h3 className="text-xl font-bold mb-1">
                            Pedido {order.order_number}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Badge className={`${status.color} text-white w-fit`}>
                            <StatusIcon className="w-4 h-4 mr-1" />
                            {status.label}
                          </Badge>
                          
                          {isScheduledOrder && (
                            <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400 w-fit">
                              <Clock className="w-3 h-3 mr-1" />
                              Pedido Agendado
                            </Badge>
                          )}
                        </div>
                      </div>

                      {isScheduledOrder && (
                        <Alert className="mb-4 border-amber-500 bg-amber-500/10">
                          <Clock className="h-4 w-4 text-amber-500" />
                          <AlertDescription className="text-amber-700 dark:text-amber-400">
                            <div className="space-y-1">
                              <p className="font-medium">📅 Este pedido está agendado</p>
                              <p className="text-sm">Seu pedido será processado assim que a loja abrir.</p>
                              <p className="text-sm font-medium">{storeStatusText}</p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <Separator className="my-4" />

                      <div className="space-y-3">
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium">{item.product_name}</p>
                              {item.order_item_flavors && item.order_item_flavors.length > 0 && (
                                <div className="text-sm text-muted-foreground pl-4 mt-1">
                                  <span className="font-medium">Sabores:</span>
                                  {item.order_item_flavors.map((flavor: any, idx: number) => (
                                    <div key={flavor.id} className="flex justify-between ml-2">
                                      <span>• {flavor.flavor_name}</span>
                                      {Number(flavor.flavor_price) > 0 && (
                                        <span>R$ {Number(flavor.flavor_price).toFixed(2)}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {item.order_item_addons && item.order_item_addons.length > 0 && (
                                <div className="text-sm text-muted-foreground pl-4 mt-1">
                                  {item.order_item_addons.map((addon: any, idx: number) => (
                                    <div key={addon.id} className="flex justify-between">
                                      <span>+ {addon.addon_name}</span>
                                      <span>R$ {Number(addon.addon_price).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {item.observation && (
                                <p className="text-sm text-muted-foreground italic">
                                  Obs: {item.observation}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                Quantidade: {item.quantity}
                              </p>
                            </div>
                            <p className="font-semibold whitespace-nowrap ml-4">
                              R$ {Number(item.subtotal).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal</span>
                          <span>R$ {Number(order.subtotal).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>{order.delivery_type === 'pickup' ? 'Retirada' : 'Taxa de entrega'}</span>
                          <span>{order.delivery_type === 'pickup' ? 'Grátis' : `R$ ${Number(order.delivery_fee).toFixed(2)}`}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span className="text-primary">
                            R$ {Number(order.total).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      {order.delivery_type === 'pickup' ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Store className="w-4 h-4" />
                            Retirar na loja
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Você poderá retirar seu pedido diretamente na loja após a confirmação.
                          </p>
                          {(order.stores?.pickup_address || order.stores?.address) && (
                            <div className="mt-2 p-3 bg-muted rounded-lg">
                              <p className="text-sm font-medium mb-1">Endereço para retirada:</p>
                              <p className="text-sm text-muted-foreground">
                                {order.stores.pickup_address || order.stores.address}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Endereço de entrega:</p>
                          <p className="text-sm text-muted-foreground">
                            {order.delivery_street}, {order.delivery_number}
                            {order.delivery_complement && ` - ${order.delivery_complement}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Bairro: {order.delivery_neighborhood}
                          </p>
                        </div>
                      )}

                      <Separator className="my-4" />

                      {(order as any).customer_notes && (
                        <>
                          <div className="space-y-2 p-4 rounded-lg border">
                            <p className="text-sm font-medium">
                              Observações da Loja:
                            </p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {(order as any).customer_notes}
                            </p>
                          </div>
                          <Separator className="my-4" />
                        </>
                      )}

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Forma de pagamento:</p>
                        <p className="text-sm text-muted-foreground">
                          {order.payment_method === 'pix' && 'PIX'}
                          {order.payment_method === 'dinheiro' && 'Dinheiro'}
                          {order.payment_method === 'cartao' && 'Cartão'}
                        </p>
                        
                        {(() => {
                          const paymentReceived = (order as any).payment_received;
                          console.log('[Payment Status Debug]', {
                            orderId: order.id,
                            orderNumber: order.order_number,
                            payment_received: paymentReceived,
                            fullOrder: order
                          });
                          
                          return (
                            <div className="mt-2">
                              <Badge 
                                variant={paymentReceived ? 'default' : 'secondary'}
                                className={paymentReceived ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}
                              >
                                {paymentReceived ? 'Pagamento recebido' : 'Pagamento pendente'}
                              </Badge>
                            </div>
                          );
                        })()}
                        
                        {order.payment_method === 'dinheiro' && order.change_amount && (
                          <p className="text-sm text-muted-foreground">
                            Troco para: R$ {Number(order.change_amount).toFixed(2)}
                          </p>
                        )}
                        
                        {order.payment_method === 'pix' && order.stores?.pix_key && order.stores?.show_pix_key_to_customer !== false && (() => {
                          const pixValidation = validatePixKey(order.stores.pix_key);
                          
                          if (!pixValidation.isValid) {
                            return (
                              <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                                <p className="text-sm text-destructive">
                                  Chave PIX inválida cadastrada pela loja. Entre em contato com o estabelecimento.
                                </p>
                              </div>
                            );
                          }

                          const typeConfig = {
                            cpf: { icon: CreditCard, label: 'CPF', color: 'bg-blue-500' },
                            cnpj: { icon: CreditCard, label: 'CNPJ', color: 'bg-purple-500' },
                            email: { icon: Mail, label: 'E-mail', color: 'bg-green-500' },
                            phone: { icon: Phone, label: 'Telefone', color: 'bg-orange-500' },
                            random: { icon: Key, label: 'Aleatória', color: 'bg-gray-500' },
                          };

                          const config = typeConfig[pixValidation.type as keyof typeof typeConfig];
                          const TypeIcon = config?.icon;
                          
                          return (
                            <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-sm font-medium">Chave PIX para pagamento:</p>
                                {config && (
                                  <Badge className={`${config.color} text-white text-xs`}>
                                    <TypeIcon className="w-3 h-3 mr-1" />
                                    {config.label}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <code 
                                  className={cn(
                                    "flex-1 text-sm px-3 py-2 rounded border cursor-pointer select-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-0 selection:bg-green-200 selection:text-green-900 dark:selection:bg-green-900/60 dark:selection:text-green-200 active:bg-green-50",
                                    copiedPixKey === order.id 
                                      ? "bg-green-50 border-green-600 text-green-800 dark:bg-green-900/50 dark:border-green-500 dark:text-green-300 scale-105" 
                                      : "bg-background border-border hover:bg-muted"
                                  )}
                                  onClick={() => {
                                    navigator.clipboard.writeText(order.stores.pix_key);
                                    setCopiedPixKey(order.id);
                                    setTimeout(() => setCopiedPixKey(null), 2000);
                                    toast({
                                      title: "Chave PIX copiada!",
                                      description: "Cole no seu app de pagamento",
                                    });
                                  }}
                                >
                                  {copiedPixKey === order.id ? (
                                    <span className="font-semibold flex items-center gap-2">
                                      <Check className="w-4 h-4" />
                                      Copiado!
                                    </span>
                                  ) : (
                                    formatPixKey(order.stores.pix_key)
                                  )}
                                </code>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    navigator.clipboard.writeText(order.stores.pix_key);
                                    setCopiedPixKey(order.id);
                                    setTimeout(() => setCopiedPixKey(null), 2000);
                                    toast({
                                      title: "Chave PIX copiada!",
                                      description: "Cole no seu app de pagamento",
                                    });
                                  }}
                                >
                                  {copiedPixKey === order.id ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
