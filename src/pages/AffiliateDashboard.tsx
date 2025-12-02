import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMyAffiliateData } from '@/hooks/useAffiliates';
import { useAuth } from '@/hooks/useAuth';
import { 
  DollarSign, TrendingUp, Clock, CheckCircle, 
  Tag, Copy, Check, ShoppingCart, CreditCard,
  Users, Loader2, LogOut, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const AffiliateDashboard = () => {
  const { affiliate, earnings, payments, stats, isLoading, refetch } = useMyAffiliateData();
  const { signOut, user } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = async () => {
    if (!affiliate?.coupon?.code) return;
    await navigator.clipboard.writeText(affiliate.coupon.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast({ title: 'Código copiado!' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'outline' },
      approved: { label: 'Aprovada', variant: 'secondary' },
      paid: { label: 'Paga', variant: 'default' },
      cancelled: { label: 'Cancelada', variant: 'destructive' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso não autorizado</h2>
            <p className="text-muted-foreground text-center mb-6">
              Você não está cadastrado como afiliado em nenhuma loja.
            </p>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Logado como: {user?.email}
            </p>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold">Painel do Afiliado</h1>
                <p className="text-sm text-muted-foreground">{affiliate.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Welcome Card with Coupon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Olá, {affiliate.name}!</h2>
                  <p className="text-muted-foreground">
                    Acompanhe suas vendas e comissões em tempo real.
                  </p>
                </div>
                {affiliate.coupon && (
                  <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
                    <Tag className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Seu cupom de desconto</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold font-mono">{affiliate.coupon.code}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleCopyCode}
                        >
                          {copiedCode ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {affiliate.coupon.discount_type === 'percentage'
                          ? `${affiliate.coupon.discount_value}% de desconto`
                          : `${formatCurrency(affiliate.coupon.discount_value)} de desconto`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Vendas</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Comissões</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">A Receber</p>
                    <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.pendingEarnings)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Já Recebido</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidEarnings)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Commission Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Sua Comissão
              </CardTitle>
              <CardDescription>
                Configuração de comissão definida pela loja
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {affiliate.default_commission_type === 'percentage' ? (
                    <span className="text-lg font-bold text-primary">%</span>
                  ) : (
                    <DollarSign className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {affiliate.default_commission_type === 'percentage'
                      ? `${affiliate.default_commission_value}%`
                      : formatCurrency(affiliate.default_commission_value)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {affiliate.default_commission_type === 'percentage'
                      ? 'de comissão sobre cada venda'
                      : 'fixo por cada venda'}
                  </p>
                </div>
                {affiliate.commission_enabled ? (
                  <Badge variant="default" className="ml-auto">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ativa
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-auto">
                    Inativa
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs: Comissões e Pagamentos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs defaultValue="comissoes">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="comissoes">Comissões</TabsTrigger>
              <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
            </TabsList>

            <TabsContent value="comissoes">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Histórico de Comissões</CardTitle>
                  <CardDescription>
                    Todas as comissões geradas pelas suas vendas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor Venda</TableHead>
                          <TableHead>Comissão</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {earnings.map((earning) => (
                          <TableRow key={earning.id}>
                            <TableCell className="font-mono text-sm">
                              #{earning.order?.order_number || '-'}
                            </TableCell>
                            <TableCell>
                              {earning.order?.customer_name || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(earning.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </TableCell>
                            <TableCell>{formatCurrency(earning.order_total)}</TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatCurrency(earning.commission_amount)}
                            </TableCell>
                            <TableCell>{getStatusBadge(earning.status)}</TableCell>
                          </TableRow>
                        ))}
                        {earnings.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Nenhuma comissão registrada ainda</p>
                              <p className="text-sm">Divulgue seu cupom para começar a ganhar!</p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pagamentos">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Histórico de Pagamentos</CardTitle>
                  <CardDescription>
                    Todos os pagamentos recebidos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Observações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {format(new Date(payment.paid_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {payment.payment_method || 'Não informado'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {payment.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {payments.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Nenhum pagamento recebido ainda</p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* PIX Key Info */}
        {affiliate.pix_key && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Dados para Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Chave PIX cadastrada</p>
                  <p className="font-mono text-lg">{affiliate.pix_key}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default AffiliateDashboard;
