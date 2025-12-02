import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAffiliates, Affiliate, AffiliateEarning, AffiliateCommissionRule, AffiliateStats } from '@/hooks/useAffiliates';
import { useCoupons } from '@/hooks/useCoupons';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { 
  Users, Plus, Edit, Trash2, DollarSign, TrendingUp, 
  Copy, Check, Tag, Percent, Settings, Eye, 
  Clock, CheckCircle, XCircle, CreditCard, Loader2, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { validatePixKey, detectPixKeyType } from '@/lib/pixValidation';

interface AffiliatesManagerProps {
  storeId: string;
}

export const AffiliatesManager = ({ storeId }: AffiliatesManagerProps) => {
  const { 
    affiliates, 
    isLoading, 
    createAffiliate, 
    updateAffiliate, 
    deleteAffiliate, 
    toggleAffiliateStatus,
    toggleCommission,
    getCommissionRules,
    createCommissionRule,
    deleteCommissionRule,
    getAffiliateEarnings,
    updateEarningStatus,
    getAffiliateStats,
    getAllStoreEarnings,
    createPayment,
  } = useAffiliates(storeId);
  
  const { coupons } = useCoupons(storeId);
  const { categories } = useCategories(storeId);
  const productsQuery = useProducts(storeId);
  const products = productsQuery.data || [];

  const [activeTab, setActiveTab] = useState('gerenciar');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [commissionRules, setCommissionRules] = useState<AffiliateCommissionRule[]>([]);
  const [affiliateEarnings, setAffiliateEarnings] = useState<AffiliateEarning[]>([]);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
  const [allEarnings, setAllEarnings] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf_cnpj: '',
    pix_key: '',
    coupon_id: '',
    commission_enabled: true,
    default_commission_type: 'percentage' as 'percentage' | 'fixed',
    default_commission_value: 0,
  });

  const [ruleFormData, setRuleFormData] = useState({
    commission_type: 'percentage' as 'percentage' | 'fixed',
    commission_value: 0,
    applies_to: 'category' as 'category' | 'product',
    category_name: '',
    product_id: '',
  });

  const [paymentFormData, setPaymentFormData] = useState({
    amount: 0,
    payment_method: 'pix',
    notes: '',
  });

  // Load all earnings for reports tab
  useEffect(() => {
    if (activeTab === 'relatorios') {
      getAllStoreEarnings().then(setAllEarnings);
    }
  }, [activeTab, getAllStoreEarnings]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      cpf_cnpj: '',
      pix_key: '',
      coupon_id: '',
      commission_enabled: true,
      default_commission_type: 'percentage',
      default_commission_value: 0,
    });
    setEditingAffiliate(null);
  };

  const handleOpenDialog = (affiliate?: Affiliate) => {
    if (affiliate) {
      setEditingAffiliate(affiliate);
      setFormData({
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone || '',
        cpf_cnpj: affiliate.cpf_cnpj || '',
        pix_key: affiliate.pix_key || '',
        coupon_id: affiliate.coupon_id || '',
        commission_enabled: affiliate.commission_enabled,
        default_commission_type: affiliate.default_commission_type,
        default_commission_value: affiliate.default_commission_value,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome e email são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    const data = {
      ...formData,
      coupon_id: formData.coupon_id || null,
    };

    if (editingAffiliate) {
      await updateAffiliate(editingAffiliate.id, data);
    } else {
      await createAffiliate(data);
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleViewDetails = async (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate);
    const [rules, earnings, stats] = await Promise.all([
      getCommissionRules(affiliate.id),
      getAffiliateEarnings(affiliate.id),
      getAffiliateStats(affiliate.id),
    ]);
    setCommissionRules(rules);
    setAffiliateEarnings(earnings);
    setAffiliateStats(stats);
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: 'Código copiado!' });
  };

  const handleAddRule = async () => {
    if (!selectedAffiliate) return;

    await createCommissionRule({
      affiliate_id: selectedAffiliate.id,
      ...ruleFormData,
      category_name: ruleFormData.applies_to === 'category' ? ruleFormData.category_name : null,
      product_id: ruleFormData.applies_to === 'product' ? ruleFormData.product_id : null,
    });

    const rules = await getCommissionRules(selectedAffiliate.id);
    setCommissionRules(rules);
    setRuleDialogOpen(false);
    setRuleFormData({
      commission_type: 'percentage',
      commission_value: 0,
      applies_to: 'category',
      category_name: '',
      product_id: '',
    });
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!selectedAffiliate) return;
    await deleteCommissionRule(ruleId);
    const rules = await getCommissionRules(selectedAffiliate.id);
    setCommissionRules(rules);
  };

  const handleRegisterPayment = async () => {
    if (!selectedAffiliate || paymentFormData.amount <= 0) return;

    await createPayment({
      affiliate_id: selectedAffiliate.id,
      amount: paymentFormData.amount,
      payment_method: paymentFormData.payment_method,
      notes: paymentFormData.notes,
    });

    setPaymentDialogOpen(false);
    setPaymentFormData({ amount: 0, payment_method: 'pix', notes: '' });
    
    // Refresh stats
    const stats = await getAffiliateStats(selectedAffiliate.id);
    setAffiliateStats(stats);
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

  // Calculate totals for summary cards
  const totalAffiliates = affiliates.length;
  const activeAffiliates = affiliates.filter(a => a.is_active).length;
  const totalPendingEarnings = allEarnings
    .filter(e => e.status === 'pending' || e.status === 'approved')
    .reduce((sum, e) => sum + Number(e.commission_amount), 0);
  const totalPaidEarnings = allEarnings
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.commission_amount), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Afiliados
          </h2>
          <p className="text-muted-foreground">
            Gerencie seus afiliados e comissões
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Afiliado
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{totalAffiliates}</p>
              </div>
              <Users className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{activeAffiliates}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPendingEarnings)}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pago</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaidEarnings)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gerenciar">Gerenciar</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        {/* Tab: Gerenciar */}
        <TabsContent value="gerenciar" className="space-y-4">
          {affiliates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum afiliado cadastrado</h3>
                <p className="text-muted-foreground mb-4">
                  Cadastre seu primeiro afiliado para começar a gerar comissões.
                </p>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Afiliado
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {affiliates.map((affiliate) => (
                <Card key={affiliate.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-primary">
                            {affiliate.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate">{affiliate.name}</h3>
                            <Badge variant={affiliate.is_active ? 'default' : 'secondary'}>
                              {affiliate.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                            {affiliate.commission_enabled && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <DollarSign className="h-3 w-3 mr-1" />
                                Comissão Ativa
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{affiliate.email}</p>
                          {affiliate.coupon && (
                            <div className="flex items-center gap-2 mt-1">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                                {affiliate.coupon.code}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleCopyCode(affiliate.coupon!.code)}
                              >
                                {copiedCode === affiliate.coupon.code ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Percent className="h-3 w-3" />
                            <span>
                              Comissão padrão: {affiliate.default_commission_type === 'percentage' 
                                ? `${affiliate.default_commission_value}%` 
                                : formatCurrency(affiliate.default_commission_value)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(affiliate)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Detalhes
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(affiliate)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir afiliado?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Todos os dados do afiliado serão removidos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteAffiliate(affiliate.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Comissões */}
        <TabsContent value="comissoes" className="space-y-4">
          {selectedAffiliate ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedAffiliate.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedAffiliate.email}</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedAffiliate(null)}>
                  Voltar
                </Button>
              </div>

              {/* Stats do afiliado */}
              {affiliateStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Vendas</p>
                      <p className="text-xl font-bold">{formatCurrency(affiliateStats.totalSales)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Comissões</p>
                      <p className="text-xl font-bold">{formatCurrency(affiliateStats.totalEarnings)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Pendente</p>
                      <p className="text-xl font-bold text-amber-600">{formatCurrency(affiliateStats.pendingEarnings)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Pedidos</p>
                      <p className="text-xl font-bold">{affiliateStats.totalOrders}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Regras de comissão */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Regras de Comissão</CardTitle>
                    <CardDescription>Comissões específicas por categoria ou produto</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setRuleDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Regra
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Padrão</Badge>
                          <span className="text-sm">Todas as vendas</span>
                        </div>
                        <span className="font-semibold">
                          {selectedAffiliate.default_commission_type === 'percentage'
                            ? `${selectedAffiliate.default_commission_value}%`
                            : formatCurrency(selectedAffiliate.default_commission_value)}
                        </span>
                      </div>
                    </div>
                    {commissionRules.map((rule) => (
                      <div key={rule.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge>
                              {rule.applies_to === 'category' ? 'Categoria' : 'Produto'}
                            </Badge>
                            <span className="text-sm">
                              {rule.applies_to === 'category' 
                                ? rule.category_name 
                                : rule.product?.name || 'Produto'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {rule.commission_type === 'percentage'
                                ? `${rule.commission_value}%`
                                : formatCurrency(rule.commission_value)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Histórico de comissões */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Histórico de Comissões</CardTitle>
                    <CardDescription>Todas as comissões geradas</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                    <CreditCard className="h-4 w-4 mr-1" />
                    Registrar Pagamento
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor Venda</TableHead>
                          <TableHead>Comissão</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {affiliateEarnings.map((earning) => (
                          <TableRow key={earning.id}>
                            <TableCell className="font-mono text-sm">
                              #{earning.order?.order_number || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(earning.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </TableCell>
                            <TableCell>{formatCurrency(earning.order_total)}</TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatCurrency(earning.commission_amount)}
                            </TableCell>
                            <TableCell>{getStatusBadge(earning.status)}</TableCell>
                            <TableCell>
                              <Select
                                value={earning.status}
                                onValueChange={(value) => updateEarningStatus(earning.id, value as any)}
                              >
                                <SelectTrigger className="w-[120px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pendente</SelectItem>
                                  <SelectItem value="approved">Aprovada</SelectItem>
                                  <SelectItem value="paid">Paga</SelectItem>
                                  <SelectItem value="cancelled">Cancelada</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                        {affiliateEarnings.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Nenhuma comissão registrada
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Selecione um afiliado</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Na aba "Gerenciar", clique em "Detalhes" de um afiliado para configurar suas comissões.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Relatórios */}
        <TabsContent value="relatorios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Todas as Comissões</CardTitle>
              <CardDescription>Histórico completo de comissões de todos os afiliados</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Afiliado</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor Venda</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allEarnings.map((earning) => (
                      <TableRow key={earning.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{earning.affiliate?.name}</p>
                            <p className="text-xs text-muted-foreground">{earning.affiliate?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          #{earning.order?.order_number || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(earning.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{formatCurrency(earning.order_total)}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(earning.commission_amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(earning.status)}</TableCell>
                      </TableRow>
                    ))}
                    {allEarnings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhuma comissão registrada
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

      {/* Dialog: Criar/Editar Afiliado */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAffiliate ? 'Editar Afiliado' : 'Novo Afiliado'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div className="col-span-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 11) value = value.slice(0, 11);
                    // Apply mask (00) 00000-0000
                    if (value.length > 0) {
                      value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
                      value = value.replace(/(\d{5})(\d)/, '$1-$2');
                    }
                    setFormData({ ...formData, phone: value });
                  }}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                {formData.phone && formData.phone.replace(/\D/g, '').length > 0 && formData.phone.replace(/\D/g, '').length < 10 && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Telefone incompleto
                  </p>
                )}
              </div>
              <div>
                <Label>CPF/CNPJ</Label>
                <Input
                  value={formData.cpf_cnpj}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 14) value = value.slice(0, 14);
                    // Apply mask based on length
                    if (value.length <= 11) {
                      // CPF: 000.000.000-00
                      value = value.replace(/(\d{3})(\d)/, '$1.$2');
                      value = value.replace(/(\d{3})(\d)/, '$1.$2');
                      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                    } else {
                      // CNPJ: 00.000.000/0000-00
                      value = value.replace(/^(\d{2})(\d)/, '$1.$2');
                      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                      value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
                      value = value.replace(/(\d{4})(\d)/, '$1-$2');
                    }
                    setFormData({ ...formData, cpf_cnpj: value });
                  }}
                  placeholder="000.000.000-00"
                  maxLength={18}
                />
                {formData.cpf_cnpj && (() => {
                  const digits = formData.cpf_cnpj.replace(/\D/g, '');
                  if (digits.length > 0 && digits.length < 11) {
                    return (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        CPF incompleto
                      </p>
                    );
                  }
                  if (digits.length > 11 && digits.length < 14) {
                    return (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        CNPJ incompleto
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="col-span-2">
                <Label>Chave PIX</Label>
                <Input
                  value={formData.pix_key}
                  onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                  placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
                />
                {formData.pix_key && (() => {
                  const validation = validatePixKey(formData.pix_key);
                  if (validation.type === 'invalid') {
                    return (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        {validation.message}
                      </p>
                    );
                  }
                  if (validation.type !== 'empty') {
                    return (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {validation.message}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="col-span-2">
                <Label>Cupom Vinculado</Label>
                <Select
                  value={formData.coupon_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, coupon_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cupom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {coupons.map((coupon) => (
                      <SelectItem key={coupon.id} value={coupon.id}>
                        {coupon.code} ({coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : formatCurrency(coupon.discount_value)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <Label>Comissão Ativa</Label>
                  <p className="text-xs text-muted-foreground">O afiliado receberá comissão das vendas</p>
                </div>
                <Switch
                  checked={formData.commission_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, commission_enabled: checked })}
                />
              </div>
              {formData.commission_enabled && (
                <>
                  <div>
                    <Label>Tipo de Comissão</Label>
                    <Select
                      value={formData.default_commission_type}
                      onValueChange={(value: 'percentage' | 'fixed') => setFormData({ ...formData, default_commission_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentual (%)</SelectItem>
                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor da Comissão</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.default_commission_value}
                      onChange={(e) => setFormData({ ...formData, default_commission_value: Number(e.target.value) })}
                      placeholder={formData.default_commission_type === 'percentage' ? '5' : '10.00'}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingAffiliate ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Adicionar Regra de Comissão */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Regra de Comissão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Aplica-se a</Label>
              <Select
                value={ruleFormData.applies_to}
                onValueChange={(value: 'category' | 'product') => setRuleFormData({ ...ruleFormData, applies_to: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">Categoria</SelectItem>
                  <SelectItem value="product">Produto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {ruleFormData.applies_to === 'category' && (
              <div>
                <Label>Categoria</Label>
                <Select
                  value={ruleFormData.category_name}
                  onValueChange={(value) => setRuleFormData({ ...ruleFormData, category_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {ruleFormData.applies_to === 'product' && (
              <div>
                <Label>Produto</Label>
                <Select
                  value={ruleFormData.product_id}
                  onValueChange={(value) => setRuleFormData({ ...ruleFormData, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={ruleFormData.commission_type}
                  onValueChange={(value: 'percentage' | 'fixed') => setRuleFormData({ ...ruleFormData, commission_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ruleFormData.commission_value}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, commission_value: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddRule}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Registrar Pagamento */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: Number(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Método de Pagamento</Label>
              <Select
                value={paymentFormData.payment_method}
                onValueChange={(value) => setPaymentFormData({ ...paymentFormData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Input
                value={paymentFormData.notes}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                placeholder="Observações do pagamento"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterPayment}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
