import { useState, useMemo, useCallback } from 'react';
import { useAffiliateAuth } from '@/hooks/useAffiliateAuth';
import { useAffiliateEarningsNotification } from '@/hooks/useAffiliateEarningsNotification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
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
  Ticket
} from 'lucide-react';

export default function AffiliateDashboardNew() {
  const {
    affiliateUser,
    affiliateStores,
    affiliateStats,
    isLoading,
    affiliateLogout,
    refreshData
  } = useAffiliateAuth();

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

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

  const handleLogout = async () => {
    await affiliateLogout();
    toast.success('Logout realizado com sucesso');
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stores" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Minhas Lojas
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

                      {store.coupon_code ? (
                        <>
                          <Separator />
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Ticket className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">Seu cupom de desconto</span>
                            </div>
                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-mono font-bold text-xl text-primary">{store.coupon_code}</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(store.coupon_code!, 'Cupom')}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              {store.coupon_discount_type && (
                                <p className="text-xs text-muted-foreground">
                                  {store.coupon_discount_type === 'percentage' 
                                    ? `${store.coupon_discount_value}% de desconto`
                                    : `${formatCurrency(store.coupon_discount_value || 0)} de desconto`}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Link className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Link de afiliado</span>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                value={`https://ofertas.app/${store.store_slug}?cupom=${store.coupon_code}`}
                                readOnly
                                className="font-mono text-xs"
                              />
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => copyToClipboard(
                                  `https://ofertas.app/${store.store_slug}?cupom=${store.coupon_code}`,
                                  'Link de afiliado'
                                )}
                              >
                                <Copy className="h-4 w-4 mr-1" />
                                Copiar
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Compartilhe este link. O cupom será aplicado automaticamente!
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
