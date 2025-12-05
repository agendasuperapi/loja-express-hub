import { useState, useMemo, useCallback, Fragment } from 'react';
import { useAffiliateAuth, AffiliateOrderItem } from '@/hooks/useAffiliateAuth';
import { useAffiliateEarningsNotification } from '@/hooks/useAffiliateEarningsNotification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollableTable } from '@/components/ui/scrollable-table';
import { toast } from 'sonner';
import {
  Users,
  DollarSign,
  Store,
  TrendingUp,
  Copy,
  LogOut,
  Loader2,
  Clock,
  CheckCircle,
  Building2,
  Wallet,
  BarChart3,
  User,
  Link,
  Ticket,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Package,
  Target,
  Settings,
  Ban,
  Calculator
} from 'lucide-react';

export default function AffiliateDashboardNew() {
  const {
    affiliateUser,
    affiliateStores,
    affiliateStats,
    affiliateOrders,
    isLoading,
    affiliateLogout,
    refreshData,
    fetchOrderItems
  } = useAffiliateAuth();

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [orderItems, setOrderItems] = useState<Record<string, AffiliateOrderItem[]>>({});
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

  // Extrair IDs dos store_affiliates para notificações em tempo real
  const storeAffiliateIds = useMemo(() => 
    affiliateStores.map(s => s.store_affiliate_id).filter(Boolean),
    [affiliateStores]
  );

  // Hook de notificação de ganhos em tempo real
  const handleNewEarning = useCallback(() => {
    refreshData();
  }, [refreshData]);

  useAffiliateEarningsNotification({
    storeAffiliateIds,
    onNewEarning: handleNewEarning
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLogout = async () => {
    await affiliateLogout();
    toast.success('Logout realizado com sucesso');
  };

  const toggleOrderExpansion = async (orderId: string, storeAffiliateId: string | undefined) => {
    console.log('[toggleOrderExpansion] orderId:', orderId, 'storeAffiliateId:', storeAffiliateId);
    
    const isExpanded = expandedOrders[orderId];
    
    if (isExpanded) {
      setExpandedOrders(prev => ({ ...prev, [orderId]: false }));
      return;
    }

    // Se já temos os itens, apenas expandir
    if (orderItems[orderId]) {
      setExpandedOrders(prev => ({ ...prev, [orderId]: true }));
      return;
    }

    // Carregar itens do pedido - suporta pedidos legados (sem store_affiliate_id)
    setLoadingItems(prev => ({ ...prev, [orderId]: true }));
    try {
      const items = await fetchOrderItems(orderId, storeAffiliateId || null);
      setOrderItems(prev => ({ ...prev, [orderId]: items }));
      setExpandedOrders(prev => ({ ...prev, [orderId]: true }));
    } catch (err) {
      console.error('Erro ao carregar itens:', err);
      toast.error('Erro ao carregar itens do pedido');
    } finally {
      setLoadingItems(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const selectedStore = affiliateStores.find(s => s.store_id === selectedStoreId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Painel do Afiliado</h1>
              <p className="text-sm text-muted-foreground">{affiliateUser?.name}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lojas</p>
                  <p className="text-2xl font-bold">{affiliateStats?.total_stores || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Vendas</p>
                  <p className="text-2xl font-bold">{formatCurrency(affiliateStats?.total_sales || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendente</p>
                  <p className="text-2xl font-bold">{formatCurrency(affiliateStats?.pending_commission || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Ganhos</p>
                  <p className="text-2xl font-bold">{formatCurrency(affiliateStats?.total_commission || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="stores" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stores" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Minhas</span> Lojas
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="commissions" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Comissões
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
          </TabsList>

          {/* Stores Tab */}
          <TabsContent value="stores" className="space-y-4">
            {affiliateStores.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma loja vinculada</h3>
                  <p className="text-muted-foreground">
                    Aguarde um convite de uma loja parceira para começar a ganhar comissões.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {affiliateStores.map((store) => (
                  <Card key={store.store_affiliate_id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {store.store_logo ? (
                            <img
                              src={store.store_logo}
                              alt={store.store_name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                              <Store className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-base">{store.store_name}</CardTitle>
                            <CardDescription>
                              {store.coupon_code 
                                ? `Cupom: ${store.coupon_code}`
                                : 'Sem cupom vinculado'}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={store.status === 'active' ? 'default' : 'secondary'}>
                          {store.status === 'active' ? 'Ativo' : 'Pendente'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Vendas</p>
                          <p className="font-semibold">{formatCurrency(store.total_sales)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Ganhos</p>
                          <p className="font-semibold text-green-600">{formatCurrency(store.total_commission)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Pendente</p>
                          <p className="font-semibold text-yellow-600">{formatCurrency(store.pending_commission)}</p>
                        </div>
                      </div>

                      {(store.coupons && store.coupons.length > 0) || store.coupon_code ? (
                        <>
                          <Separator />
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Ticket className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">
                                {(store.coupons?.length || 1) > 1 
                                  ? `Seus cupons de desconto (${store.coupons?.length})` 
                                  : 'Seu cupom de desconto'}
                              </span>
                            </div>
                            
                            {/* Render all coupons with individual links */}
                            {(store.coupons && store.coupons.length > 0 
                              ? store.coupons 
                              : store.coupon_code 
                                ? [{ code: store.coupon_code, discount_type: store.coupon_discount_type || '', discount_value: store.coupon_discount_value || 0 }]
                                : []
                            ).map((coupon, idx) => (
                              <div key={idx} className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
                                {/* Coupon code */}
                                <div className="flex items-center justify-between">
                                  <p className="font-mono font-bold text-xl text-primary">{coupon.code}</p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(coupon.code, 'Cupom')}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                {/* Discount info */}
                                {coupon.discount_type && (
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                      {coupon.discount_type === 'percentage' 
                                        ? `${coupon.discount_value}% de desconto`
                                        : `${formatCurrency(coupon.discount_value || 0)} de desconto`}
                                    </p>
                                    {/* Scope info */}
                                    <div className="text-xs text-muted-foreground/70">
                                      {coupon.applies_to === 'all' || !coupon.applies_to ? (
                                        <span className="inline-flex items-center gap-1">
                                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Geral</Badge>
                                          <span>Vale para todos os produtos</span>
                                        </span>
                                      ) : coupon.applies_to === 'categories' && coupon.category_names?.length ? (
                                        <span className="inline-flex items-center gap-1 flex-wrap">
                                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Categorias</Badge>
                                          <span>{coupon.category_names.join(', ')}</span>
                                        </span>
                                      ) : coupon.applies_to === 'products' && coupon.product_ids?.length ? (
                                        <span className="inline-flex items-center gap-1">
                                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Produtos</Badge>
                                          <span>{coupon.product_ids.length} produto(s) específico(s)</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1">
                                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Geral</Badge>
                                          <span>Vale para todos os produtos</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Individual affiliate link for this coupon */}
                                <div className="pt-2 border-t border-primary/10">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Link className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Link de afiliado</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <Input
                                      value={`https://ofertas.app/${store.store_slug}?cupom=${coupon.code}`}
                                      readOnly
                                      className="font-mono text-xs h-8"
                                    />
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="h-8"
                                      onClick={() => copyToClipboard(
                                        `https://ofertas.app/${store.store_slug}?cupom=${coupon.code}`,
                                        'Link de afiliado'
                                      )}
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copiar
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            <p className="text-xs text-muted-foreground text-center">
                              Compartilhe o link. O cupom será aplicado automaticamente!
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Separator />
                          <div className="p-3 bg-muted rounded-lg text-center">
                            <Ticket className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Aguardando vinculação de cupom pelo lojista
                            </p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Meus Pedidos</CardTitle>
                <CardDescription>
                  Pedidos realizados com seus cupons e comissões ganhas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {affiliateOrders.length === 0 ? (
                  <div className="py-12 text-center">
                    <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum pedido ainda</h3>
                    <p className="text-muted-foreground">
                      Quando clientes usarem seus cupons, os pedidos aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <ScrollableTable>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Loja</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Cupom</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">Comissão</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                      {affiliateOrders.map((order) => (
                          <Fragment key={order.earning_id}>
                            <TableRow 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => toggleOrderExpansion(order.order_id, order.store_affiliate_id)}
                            >
                              <TableCell className="w-10">
                                {loadingItems[order.order_id] ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : expandedOrders[order.order_id] ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </TableCell>
                              <TableCell className="font-mono font-medium">
                                #{order.order_number}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {formatDate(order.order_date)}
                              </TableCell>
                              <TableCell className="font-medium">
                                {order.store_name}
                              </TableCell>
                              <TableCell>
                                {order.customer_name}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {order.coupon_code || '-'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {formatCurrency(order.order_total)}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600 whitespace-nowrap">
                                {formatCurrency(order.commission_amount)}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={order.commission_status === 'paid' ? 'default' : 'secondary'}
                                  className={order.commission_status === 'paid' 
                                    ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                                    : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                                  }
                                >
                                  {order.commission_status === 'paid' ? (
                                    <><CheckCircle className="h-3 w-3 mr-1" /> Pago</>
                                  ) : (
                                    <><Clock className="h-3 w-3 mr-1" /> Pendente</>
                                  )}
                                </Badge>
                              </TableCell>
                            </TableRow>
                            {/* Linha expandida com itens */}
                            {expandedOrders[order.order_id] && orderItems[order.order_id] && (
                              <TableRow key={`${order.earning_id}-items`}>
                                <TableCell colSpan={9} className="bg-muted/30 p-0">
                                  <div className="py-3 px-4 space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                                      <Package className="h-4 w-4" />
                                      Itens do Pedido
                                    </div>
                                    {orderItems[order.order_id].length === 0 ? (
                                      <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {orderItems[order.order_id].map((item) => {
                                          const itemDiscount = item.item_discount || 0;
                                          
                                          return (
                                            <div 
                                              key={item.item_id} 
                                              className="flex items-center justify-between py-2 px-3 bg-background rounded-lg border"
                                            >
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                  <p className="font-medium text-sm">{item.product_name}</p>
                                                  {/* Badge de elegibilidade do cupom */}
                                                  {item.is_coupon_eligible ? (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-green-500/20">
                                                      Com desconto
                                                    </Badge>
                                                  ) : (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-500/10 text-gray-500 border-gray-500/20">
                                                      Sem desconto
                                                    </Badge>
                                                  )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                  {item.quantity}x {formatCurrency(item.unit_price)} = {formatCurrency(item.subtotal)}
                                                  {itemDiscount > 0 && (
                                                    <span className="text-orange-500 ml-1">
                                                      (-{formatCurrency(itemDiscount)})
                                                    </span>
                                                  )}
                                                  {item.item_value_with_discount !== undefined && item.item_value_with_discount !== item.subtotal && (
                                                    <span className="text-green-600 ml-1">
                                                      = {formatCurrency(item.item_value_with_discount)}
                                                    </span>
                                                  )}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-2 flex-wrap justify-end">
                                                {/* Badge de origem da comissão */}
                                                {item.commission_source === 'specific_product' && (
                                                  <Badge 
                                                    variant="outline" 
                                                    className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/20"
                                                  >
                                                    <Target className="h-3 w-3 mr-1" />
                                                    Regra específica
                                                  </Badge>
                                                )}
                                                {item.commission_source === 'default' && (
                                                  <Badge 
                                                    variant="outline" 
                                                    className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-500/20"
                                                  >
                                                    <Settings className="h-3 w-3 mr-1" />
                                                    Padrão
                                                  </Badge>
                                                )}
                                                {item.commission_source === 'none' && (
                                                  <Badge 
                                                    variant="outline" 
                                                    className="text-[10px] px-1.5 py-0 bg-gray-500/10 text-gray-500 border-gray-500/20"
                                                  >
                                                    <Ban className="h-3 w-3 mr-1" />
                                                    Sem comissão
                                                  </Badge>
                                                )}
                                                {item.commission_source === 'proporcional' && (
                                                  <Badge 
                                                    variant="outline" 
                                                    className="text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-600 border-orange-500/20"
                                                  >
                                                    <Calculator className="h-3 w-3 mr-1" />
                                                    Proporcional
                                                  </Badge>
                                                )}
                                                <Badge variant="secondary" className="text-xs">
                                                  {item.commission_type === 'percentage' 
                                                    ? `${item.commission_value}%` 
                                                    : formatCurrency(item.commission_value)
                                                  }
                                                </Badge>
                                                <span className="font-semibold text-green-600 text-sm whitespace-nowrap">
                                                  {formatCurrency(item.item_commission)}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollableTable>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumo de Comissões</CardTitle>
                <CardDescription>
                  Acompanhe seus ganhos em todas as lojas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm">Total de Pedidos</span>
                      </div>
                      <p className="text-2xl font-bold">{affiliateStats?.total_orders || 0}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Total Pago</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(affiliateStats?.paid_commission || 0)}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-3">Por Loja</h4>
                    <div className="space-y-2">
                      {affiliateStores.map((store) => (
                        <div
                          key={store.store_affiliate_id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {store.store_logo ? (
                              <img
                                src={store.store_logo}
                                alt={store.store_name}
                                className="w-8 h-8 rounded object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                                <Store className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium">{store.store_name}</span>
                          </div>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(store.total_commission)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Meus Dados</CardTitle>
                <CardDescription>
                  Informações da sua conta de afiliado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{affiliateUser?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">E-mail</p>
                    <p className="font-medium">{affiliateUser?.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{affiliateUser?.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
                    <p className="font-medium">{affiliateUser?.cpf_cnpj || '-'}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Chave PIX para recebimento</p>
                  {affiliateUser?.pix_key ? (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                        {affiliateUser.pix_key}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(affiliateUser.pix_key!, 'Chave PIX')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">Nenhuma chave PIX cadastrada</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
