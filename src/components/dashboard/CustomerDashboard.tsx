import { useState } from "react";
import { motion } from "framer-motion";
import { useOrders } from "@/hooks/useOrders";
import { useFavorites } from "@/hooks/useFavorites";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart, Store, TrendingUp, Eye, X, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const CustomerDashboard = () => {
  const { orders, isLoading: ordersLoading } = useOrders();
  const { favorites } = useFavorites();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const totalOrders = orders?.length || 0;
  const totalSpent = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
  const recentOrders = orders?.slice(0, 3) || [];

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
              <div className="text-3xl font-bold gradient-text">{totalOrders}</div>
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
              <div className="text-3xl font-bold text-green-500">
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
              <div className="text-3xl font-bold text-pink-500">{favorites?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Lojas salvas
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
          <Card className="hover-scale overflow-hidden relative border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Ações Rápidas</CardTitle>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-5 w-5 text-blue-500" />
              </motion.div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex flex-col gap-2">
                <Button asChild size="sm" className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                  <Link to="/">
                    <Store className="h-4 w-4 mr-2" />
                    Explorar Lojas
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

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
