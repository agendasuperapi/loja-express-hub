import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
import { InviteAffiliateDialog } from './InviteAffiliateDialog';
import { 
  Users, Plus, Edit, Trash2, DollarSign, TrendingUp, 
  Copy, Check, Tag, Percent, Settings, Eye, 
  Clock, CheckCircle, XCircle, CreditCard, Loader2, AlertCircle, Search, Mail, Link2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { validatePixKey, detectPixKeyType } from '@/lib/pixValidation';
import { supabase } from '@/integrations/supabase/client';

interface AffiliatesManagerProps {
  storeId: string;
  storeName?: string;
}

export const AffiliatesManager = ({ storeId, storeName = 'Loja' }: AffiliatesManagerProps) => {
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
  
  const { coupons, createCoupon } = useCoupons(storeId);
  const { categories } = useCategories(storeId);
  const productsQuery = useProducts(storeId);
  const products = productsQuery.data || [];

  const [activeTab, setActiveTab] = useState('gerenciar');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);

  // Filter coupons: only show coupons not linked to other affiliates
  const availableCoupons = coupons.filter((coupon) => {
    // Check if coupon is linked via legacy field (coupon_id) - only if coupon exists
    const linkedViaLegacy = affiliates.find(a => a.coupon_id === coupon.id && a.coupon !== null);
    
    // Check if coupon is linked via junction table (affiliate_coupons) - only if coupon exists
    const linkedViaJunction = affiliates.find(a => 
      a.affiliate_coupons?.some(ac => ac.coupon_id === coupon.id && ac.coupon !== null)
    );
    
    const linkedAffiliate = linkedViaLegacy || linkedViaJunction;
    
    // Allow if: not linked to any affiliate, OR linked to the affiliate being edited
    if (!linkedAffiliate) return true;
    return linkedAffiliate.id === editingAffiliate?.id;
  });
  const [commissionRules, setCommissionRules] = useState<AffiliateCommissionRule[]>([]);
  const [affiliateEarnings, setAffiliateEarnings] = useState<AffiliateEarning[]>([]);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
  const [allEarnings, setAllEarnings] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [inviteLinkDialogOpen, setInviteLinkDialogOpen] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [createdAffiliateName, setCreatedAffiliateName] = useState<string>('');
  const [newCouponDialogOpen, setNewCouponDialogOpen] = useState(false);
  const [newCouponData, setNewCouponData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 10,
    min_order_value: 0,
    max_uses: null as number | null,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    applies_to: 'all' as 'all' | 'category' | 'product',
    category_names: [] as string[],
    product_ids: [] as string[],
  });

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf_cnpj: '',
    pix_key: '',
    coupon_ids: [] as string[],
    commission_enabled: true,
    default_commission_type: 'percentage' as 'percentage' | 'fixed',
    default_commission_value: 0,
    commission_scope: 'product' as 'category' | 'product',
    commission_categories: [] as { name: string; type: 'percentage' | 'fixed'; value: number }[],
    commission_products: [] as { id: string; type: 'percentage' | 'fixed'; value: number }[],
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

  // Product search states
  const [productSearch, setProductSearch] = useState('');
  const [ruleProductSearch, setRuleProductSearch] = useState('');
  const [couponProductSearch, setCouponProductSearch] = useState('');
  const [couponCategorySearch, setCouponCategorySearch] = useState('');

  // Filter products by search term
  const filteredProducts = products.filter((product) => {
    if (!productSearch.trim()) return true;
    const search = productSearch.toLowerCase().trim();
    return (
      product.name?.toLowerCase().includes(search) ||
      product.id?.toLowerCase().includes(search) ||
      product.short_id?.toLowerCase().includes(search) ||
      product.external_code?.toLowerCase().includes(search)
    );
  });

  const filteredRuleProducts = products.filter((product) => {
    if (!ruleProductSearch.trim()) return true;
    const search = ruleProductSearch.toLowerCase().trim();
    return (
      product.name?.toLowerCase().includes(search) ||
      product.id?.toLowerCase().includes(search) ||
      product.short_id?.toLowerCase().includes(search) ||
      product.external_code?.toLowerCase().includes(search)
    );
  });

  const filteredCouponProducts = products.filter((product) => {
    if (!couponProductSearch.trim()) return true;
    const search = couponProductSearch.toLowerCase().trim();
    return (
      product.name?.toLowerCase().includes(search) ||
      product.id?.toLowerCase().includes(search) ||
      product.short_id?.toLowerCase().includes(search) ||
      product.external_code?.toLowerCase().includes(search)
    );
  });

  const filteredCouponCategories = categories.filter((category) => {
    if (!couponCategorySearch.trim()) return true;
    return category.name?.toLowerCase().includes(couponCategorySearch.toLowerCase().trim());
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
      coupon_ids: [],
      commission_enabled: true,
      default_commission_type: 'percentage',
      default_commission_value: 0,
      commission_scope: 'product',
      commission_categories: [],
      commission_products: [],
    });
    setProductSearch('');
    setEditingAffiliate(null);
  };

  const handleOpenDialog = async (affiliate?: Affiliate) => {
    if (affiliate) {
      setEditingAffiliate(affiliate);
      // Get coupon IDs from junction table or legacy field - filter out deleted coupons
      const couponIds = affiliate.affiliate_coupons
        ?.filter(ac => ac.coupon !== null && ac.coupon !== undefined)
        .map(ac => ac.coupon_id) || 
        (affiliate.coupon_id && affiliate.coupon ? [affiliate.coupon_id] : []);
      
      // Load existing commission rules
      const existingRules = await getCommissionRules(affiliate.id);
      const categoryRules = existingRules
        .filter(r => r.applies_to === 'category' && r.category_name)
        .map(r => ({
          name: r.category_name!,
          type: r.commission_type as 'percentage' | 'fixed',
          value: r.commission_value,
        }));
      
      const productRules = existingRules
        .filter(r => r.applies_to === 'product' && r.product_id)
        .map(r => ({
          id: r.product_id!,
          type: r.commission_type as 'percentage' | 'fixed',
          value: r.commission_value,
        }));
      
      // Determine scope based on existing rules
      let scope: 'category' | 'product' = 'product';
      if (categoryRules.length > 0) scope = 'category';
      else if (productRules.length > 0) scope = 'product';
      
      setFormData({
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone || '',
        cpf_cnpj: affiliate.cpf_cnpj || '',
        pix_key: affiliate.pix_key || '',
        coupon_ids: couponIds,
        commission_enabled: affiliate.commission_enabled,
        default_commission_type: affiliate.default_commission_type,
        default_commission_value: affiliate.default_commission_value,
        commission_scope: scope,
        commission_categories: categoryRules,
        commission_products: productRules,
      });
    } else {
      resetForm();
    }
    setProductSearch('');
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

    if (formData.coupon_ids.length === 0) {
      toast({
        title: 'Cupom obrigatório',
        description: 'Selecione ou crie pelo menos um cupom para vincular ao afiliado.',
        variant: 'destructive',
      });
      return;
    }

    // Validação de escopo
    if (formData.commission_enabled && formData.commission_scope === 'category' && formData.commission_categories.length === 0) {
      toast({
        title: 'Selecione pelo menos uma categoria',
        description: 'Para comissão por categoria, selecione pelo menos uma categoria.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.commission_enabled && formData.commission_scope === 'product' && formData.commission_products.length === 0) {
      toast({
        title: 'Selecione pelo menos um produto',
        description: 'Para comissão por produto, selecione pelo menos um produto.',
        variant: 'destructive',
      });
      return;
    }

    const affiliateData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      cpf_cnpj: formData.cpf_cnpj,
      pix_key: formData.pix_key,
      coupon_ids: formData.coupon_ids,
      commission_enabled: formData.commission_enabled,
      default_commission_type: formData.default_commission_type,
      default_commission_value: 0,
    };

    let result;
    const isNewAffiliate = !editingAffiliate;
    if (editingAffiliate) {
      result = await updateAffiliate(editingAffiliate.id, affiliateData);
    } else {
      result = await createAffiliate(affiliateData);
    }

    // Se a comissão é por categoria ou produto, criar regra específica
    if (result && formData.commission_enabled) {
      // Delete existing rules first when editing
      if (editingAffiliate) {
        const existingRules = await getCommissionRules(editingAffiliate.id);
        for (const rule of existingRules) {
          await deleteCommissionRule(rule.id);
        }
      }
      
      if (formData.commission_scope === 'category') {
        // Criar regra para cada categoria com sua comissão específica
        for (const category of formData.commission_categories) {
          await createCommissionRule({
            affiliate_id: result.id,
            commission_type: category.type,
            commission_value: category.value,
            applies_to: 'category',
            category_name: category.name,
            product_id: null,
          });
        }
      } else if (formData.commission_scope === 'product') {
        // Criar regra para cada produto com sua comissão específica
        for (const product of formData.commission_products) {
          await createCommissionRule({
            affiliate_id: result.id,
            commission_type: product.type,
            commission_value: product.value,
            applies_to: 'product',
            category_name: null,
            product_id: product.id,
          });
        }
      }
    }

    // Salvar dados antes de resetar o form
    const affiliateName = formData.name;
    const affiliateEmail = formData.email;

    setDialogOpen(false);
    resetForm();

    // Gerar link de convite automaticamente para novos afiliados
    if (isNewAffiliate && result) {
      try {
        const { data, error } = await supabase.functions.invoke('affiliate-invite', {
          body: {
            action: 'send',
            store_id: storeId,
            store_name: storeName,
            email: affiliateEmail,
            name: affiliateName,
            coupon_id: formData.coupon_ids[0] || null,
          }
        });

        if (data?.success && data?.invite_token) {
          const link = `${window.location.origin}/afiliado/cadastro?token=${data.invite_token}`;
          setGeneratedInviteLink(link);
          setCreatedAffiliateName(affiliateName);
          setInviteLinkDialogOpen(true);
        }
      } catch (err) {
        console.error('Error generating invite link:', err);
      }
    }
  };

  const handleViewDetails = async (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate);
    setActiveTab('comissoes');
    const [rules, earnings, stats] = await Promise.all([
      getCommissionRules(affiliate.id),
      getAffiliateEarnings(affiliate.id),
      getAffiliateStats(affiliate.id),
    ]);
    setCommissionRules(rules);
    setAffiliateEarnings(earnings);
    setAffiliateStats(stats);
  };

  const handleShowInviteLink = async (affiliate: Affiliate) => {
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-invite', {
        body: {
          action: 'get-invite-link',
          store_id: storeId,
          affiliate_email: affiliate.email,
        }
      });

      if (data?.already_verified) {
        toast({ 
          title: 'Afiliado já cadastrado', 
          description: 'Este afiliado já completou o cadastro e não precisa de link de convite.',
        });
        return;
      }

      if (data?.success && data?.invite_token) {
        const link = `${window.location.origin}/afiliado/cadastro?token=${data.invite_token}`;
        setGeneratedInviteLink(link);
        setCreatedAffiliateName(affiliate.name);
        setInviteLinkDialogOpen(true);
      } else {
        toast({ title: 'Erro ao gerar link', description: data?.error || 'Tente novamente.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error generating invite link:', err);
      toast({ title: 'Erro ao gerar link', variant: 'destructive' });
    }
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

  const handleCreateNewCoupon = async () => {
    if (!newCouponData.code.trim()) {
      toast({
        title: 'Código obrigatório',
        description: 'Informe o código do cupom',
        variant: 'destructive',
      });
      return;
    }

    try {
      const couponResult = await createCoupon({
        store_id: storeId,
        code: newCouponData.code.toUpperCase(),
        discount_type: newCouponData.discount_type,
        discount_value: newCouponData.discount_value,
        min_order_value: newCouponData.min_order_value,
        max_uses: newCouponData.max_uses,
        valid_from: newCouponData.valid_from,
        valid_until: newCouponData.valid_until || null,
        is_active: true,
        applies_to: newCouponData.applies_to,
        category_names: newCouponData.category_names,
        product_ids: newCouponData.product_ids,
      }) as any;

      if (couponResult?.id) {
        // Aplicar automaticamente as configurações de escopo do cupom à comissão do afiliado
        const categoryConfigs = newCouponData.category_names.map(name => ({
          name,
          type: 'percentage' as const,
          value: 10,
        }));
        const productConfigs = newCouponData.product_ids.map(id => ({
          id,
          type: 'percentage' as const,
          value: 10,
        }));
        setFormData({ 
          ...formData, 
          coupon_ids: [...formData.coupon_ids, couponResult.id],
          commission_scope: newCouponData.applies_to === 'category' ? 'category' : 'product',
          commission_categories: categoryConfigs,
          commission_products: productConfigs,
        });
        setNewCouponDialogOpen(false);
        setNewCouponData({
          code: '',
          discount_type: 'percentage',
          discount_value: 10,
          min_order_value: 0,
          max_uses: null,
          valid_from: new Date().toISOString().split('T')[0],
          valid_until: '',
          applies_to: 'all',
          category_names: [],
          product_ids: [],
        });
      }
    } catch (error) {
      console.error('Error creating coupon:', error);
    }
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Convidar Afiliado
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Afiliado
          </Button>
        </div>
      </div>
      
      {/* Invite Dialog */}
      <InviteAffiliateDialog
        storeId={storeId}
        storeName={storeName}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />

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
                          {(() => {
                            // Filter out deleted coupons (null references)
                            const affiliateCoupons = (affiliate.affiliate_coupons
                              ?.map(ac => ac.coupon)
                              .filter(coupon => coupon !== null && coupon !== undefined) || [])
                              .concat(affiliate.coupon && !affiliate.affiliate_coupons?.some(ac => ac.coupon?.id === affiliate.coupon?.id) 
                                ? [affiliate.coupon] 
                                : [])
                              .filter(coupon => coupon !== null && coupon !== undefined);
                            if (affiliateCoupons.length === 0) return null;
                            return (
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Tag className="h-3 w-3 text-muted-foreground" />
                                {affiliateCoupons.map((coupon) => (
                                  <div key={coupon.id} className="flex items-center gap-1">
                                    <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                                      {coupon.code}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={() => handleCopyCode(coupon.code)}
                                    >
                                      {copiedCode === coupon.code ? (
                                        <Check className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
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
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => handleShowInviteLink(selectedAffiliate)}>
                    <Link2 className="h-4 w-4 mr-1" />
                    Link de Convite
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedAffiliate(null)}>
                    Voltar
                  </Button>
                </div>
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
                <Label>Cupons Vinculados *</Label>
                <div className="flex gap-2">
                  <div className="flex-1 border rounded-md p-3 max-h-48 overflow-y-auto">
                    {availableCoupons.length === 0 ? (
                      <div className="py-2 text-sm text-muted-foreground text-center">
                        Nenhum cupom disponível
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {availableCoupons.map((coupon) => {
                          const isSelected = formData.coupon_ids.includes(coupon.id);
                          return (
                            <div key={coupon.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`coupon-${coupon.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFormData({
                                      ...formData,
                                      coupon_ids: [...formData.coupon_ids, coupon.id],
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      coupon_ids: formData.coupon_ids.filter(id => id !== coupon.id),
                                    });
                                  }
                                }}
                              />
                              <label htmlFor={`coupon-${coupon.id}`} className="text-sm flex-1 cursor-pointer">
                                <span className="font-medium">{coupon.code}</span>
                                <span className="text-muted-foreground ml-1">
                                  ({coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : formatCurrency(coupon.discount_value)})
                                </span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <Dialog open={newCouponDialogOpen} onOpenChange={setNewCouponDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" size="icon" variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Novo Cupom</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Código do Cupom</Label>
                          <Input
                            value={newCouponData.code}
                            onChange={(e) => setNewCouponData({ ...newCouponData, code: e.target.value.toUpperCase() })}
                            placeholder="Ex: AFILIADO10"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Tipo de Desconto</Label>
                            <Select
                              value={newCouponData.discount_type}
                              onValueChange={(value: 'percentage' | 'fixed') => setNewCouponData({ ...newCouponData, discount_type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                                <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Valor do Desconto</Label>
                            <Input
                              type="number"
                              value={newCouponData.discount_value}
                              onChange={(e) => setNewCouponData({ ...newCouponData, discount_value: Number(e.target.value) })}
                              min={0}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Pedido Mínimo (R$)</Label>
                            <Input
                              type="number"
                              value={newCouponData.min_order_value}
                              onChange={(e) => setNewCouponData({ ...newCouponData, min_order_value: Number(e.target.value) })}
                              min={0}
                            />
                          </div>
                          <div>
                            <Label>Máximo de Usos</Label>
                            <Input
                              type="number"
                              value={newCouponData.max_uses || ''}
                              onChange={(e) => setNewCouponData({ ...newCouponData, max_uses: e.target.value ? Number(e.target.value) : null })}
                              placeholder="Ilimitado"
                              min={1}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Válido a partir de</Label>
                            <Input
                              type="date"
                              value={newCouponData.valid_from}
                              onChange={(e) => setNewCouponData({ ...newCouponData, valid_from: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Válido até</Label>
                            <Input
                              type="date"
                              value={newCouponData.valid_until}
                              onChange={(e) => setNewCouponData({ ...newCouponData, valid_until: e.target.value })}
                              placeholder="Sem limite"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Cupom aplica-se a</Label>
                          <Select
                            value={newCouponData.applies_to}
                            onValueChange={(value: 'all' | 'category' | 'product') => setNewCouponData({ 
                              ...newCouponData, 
                              applies_to: value,
                              category_names: [],
                              product_ids: []
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os produtos</SelectItem>
                              <SelectItem value="category">Por Categoria</SelectItem>
                              <SelectItem value="product">Por Produto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newCouponData.applies_to === 'category' && (
                          <div className="space-y-2">
                            <Label>Categorias ({newCouponData.category_names.length} selecionadas)</Label>
                            {newCouponData.category_names.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {newCouponData.category_names.map((categoryName) => (
                                  <Badge key={categoryName} variant="secondary" className="flex items-center gap-1">
                                    {categoryName}
                                    <XCircle 
                                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                      onClick={() => setNewCouponData({
                                        ...newCouponData,
                                        category_names: newCouponData.category_names.filter(c => c !== categoryName)
                                      })}
                                    />
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Buscar categoria..."
                                value={couponCategorySearch}
                                onChange={(e) => setCouponCategorySearch(e.target.value)}
                                className="pl-8"
                              />
                            </div>
                            <ScrollArea className="h-32 border rounded-md p-2">
                              <div className="space-y-2">
                                {filteredCouponCategories.map((category) => (
                                  <div key={category.id} className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`coupon-cat-${category.id}`}
                                      checked={newCouponData.category_names.includes(category.name)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setNewCouponData({
                                            ...newCouponData,
                                            category_names: [...newCouponData.category_names, category.name]
                                          });
                                        } else {
                                          setNewCouponData({
                                            ...newCouponData,
                                            category_names: newCouponData.category_names.filter(c => c !== category.name)
                                          });
                                        }
                                      }}
                                      className="rounded border-input"
                                    />
                                    <Label htmlFor={`coupon-cat-${category.id}`} className="text-sm font-normal cursor-pointer">
                                      {category.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                        {newCouponData.applies_to === 'product' && (
                          <div className="space-y-2">
                            <Label>Produtos ({newCouponData.product_ids.length} selecionados)</Label>
                            {newCouponData.product_ids.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {newCouponData.product_ids.map((productId) => {
                                  const product = products.find(p => p.id === productId);
                                  return (
                                    <Badge key={productId} variant="secondary" className="flex items-center gap-1">
                                      {product?.name || productId}
                                      <XCircle 
                                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                        onClick={() => setNewCouponData({
                                          ...newCouponData,
                                          product_ids: newCouponData.product_ids.filter(p => p !== productId)
                                        })}
                                      />
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Buscar produto..."
                                value={couponProductSearch}
                                onChange={(e) => setCouponProductSearch(e.target.value)}
                                className="pl-8"
                              />
                            </div>
                            <ScrollArea className="h-32 border rounded-md p-2">
                              <div className="space-y-2">
                                {filteredCouponProducts.map((product) => (
                                  <div key={product.id} className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`coupon-prod-${product.id}`}
                                      checked={newCouponData.product_ids.includes(product.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setNewCouponData({
                                            ...newCouponData,
                                            product_ids: [...newCouponData.product_ids, product.id]
                                          });
                                        } else {
                                          setNewCouponData({
                                            ...newCouponData,
                                            product_ids: newCouponData.product_ids.filter(p => p !== product.id)
                                          });
                                        }
                                      }}
                                      className="rounded border-input"
                                    />
                                    <Label htmlFor={`coupon-prod-${product.id}`} className="text-sm font-normal cursor-pointer">
                                      {product.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setNewCouponDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleCreateNewCoupon}>
                          Criar Cupom
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
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
                  <div className="col-span-2">
                    <Label>Comissão aplica-se a</Label>
                    <Select
                      value={formData.commission_scope}
                      onValueChange={(value: 'category' | 'product') => setFormData({ 
                        ...formData, 
                        commission_scope: value,
                        commission_categories: [],
                        commission_products: []
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="category">Por Categoria</SelectItem>
                        <SelectItem value="product">Por Produto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.commission_scope === 'category' && (
                    <div className="col-span-2 space-y-3">
                      <Label>Categorias e Comissões ({formData.commission_categories.length} selecionadas)</Label>
                      <ScrollArea className="h-[250px] border rounded-md p-2">
                        <div className="space-y-2">
                          {categories.map((cat) => {
                            const categoryConfig = formData.commission_categories.find(c => c.name === cat.name);
                            const isSelected = !!categoryConfig;
                            return (
                              <div
                                key={cat.id}
                                className={`p-3 rounded-md border ${isSelected ? 'bg-primary/5 border-primary/30' : 'border-border hover:bg-muted/50'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setFormData({
                                          ...formData,
                                          commission_categories: [
                                            ...formData.commission_categories,
                                            { name: cat.name, type: 'percentage', value: 10 }
                                          ]
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          commission_categories: formData.commission_categories.filter(c => c.name !== cat.name)
                                        });
                                      }
                                    }}
                                  />
                                  <span className="text-sm font-medium flex-1">{cat.name}</span>
                                </div>
                                {isSelected && (
                                  <div className="mt-3 ml-7 flex items-center gap-2">
                                    <Select
                                      value={categoryConfig.type}
                                      onValueChange={(value: 'percentage' | 'fixed') => {
                                        setFormData({
                                          ...formData,
                                          commission_categories: formData.commission_categories.map(c =>
                                            c.name === cat.name ? { ...c, type: value } : c
                                          )
                                        });
                                      }}
                                    >
                                      <SelectTrigger className="w-[120px] h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="percentage">%</SelectItem>
                                        <SelectItem value="fixed">R$</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={categoryConfig.value}
                                      onChange={(e) => {
                                        setFormData({
                                          ...formData,
                                          commission_categories: formData.commission_categories.map(c =>
                                            c.name === cat.name ? { ...c, value: Number(e.target.value) } : c
                                          )
                                        });
                                      }}
                                      className="w-[100px] h-8"
                                      placeholder="Valor"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                  {formData.commission_scope === 'product' && (
                    <div className="col-span-2 space-y-3">
                      <Label>Produtos e Comissões ({formData.commission_products.length} selecionados)</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Buscar por nome, código interno ou externo..."
                          className="pl-9"
                        />
                      </div>
                      <ScrollArea className="h-[250px] border rounded-md p-2">
                        {filteredProducts.length === 0 ? (
                          <div className="py-4 text-sm text-muted-foreground text-center">
                            Nenhum produto encontrado
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {filteredProducts.map((product) => {
                              const productConfig = formData.commission_products.find(p => p.id === product.id);
                              const isSelected = !!productConfig;
                              return (
                                <div
                                  key={product.id}
                                  className={`p-3 rounded-md border ${isSelected ? 'bg-primary/5 border-primary/30' : 'border-border hover:bg-muted/50'}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setFormData({
                                            ...formData,
                                            commission_products: [
                                              ...formData.commission_products,
                                              { id: product.id, type: 'percentage', value: 10 }
                                            ]
                                          });
                                        } else {
                                          setFormData({
                                            ...formData,
                                            commission_products: formData.commission_products.filter(p => p.id !== product.id)
                                          });
                                        }
                                      }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{product.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {product.external_code && `Cód: ${product.external_code}`}
                                        {product.external_code && product.short_id && ' • '}
                                        {product.short_id && `ID: ${product.short_id}`}
                                      </p>
                                    </div>
                                  </div>
                                  {isSelected && productConfig && (
                                    <div className="mt-3 ml-7 flex items-center gap-2">
                                      <Select
                                        value={productConfig.type}
                                        onValueChange={(value: 'percentage' | 'fixed') => {
                                          setFormData({
                                            ...formData,
                                            commission_products: formData.commission_products.map(p =>
                                              p.id === product.id ? { ...p, type: value } : p
                                            )
                                          });
                                        }}
                                      >
                                        <SelectTrigger className="w-[120px] h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="percentage">%</SelectItem>
                                          <SelectItem value="fixed">R$</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={productConfig.value}
                                        onChange={(e) => {
                                          setFormData({
                                            ...formData,
                                            commission_products: formData.commission_products.map(p =>
                                              p.id === product.id ? { ...p, value: Number(e.target.value) } : p
                                            )
                                          });
                                        }}
                                        className="w-[100px] h-8"
                                        placeholder="Valor"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  )}
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
              <div className="space-y-2">
                <Label>Produto</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={ruleProductSearch}
                    onChange={(e) => setRuleProductSearch(e.target.value)}
                    placeholder="Buscar por nome, código interno ou externo..."
                    className="pl-9"
                  />
                </div>
                <Select
                  value={ruleFormData.product_id}
                  onValueChange={(value) => setRuleFormData({ ...ruleFormData, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {filteredRuleProducts.length === 0 ? (
                      <div className="py-2 px-3 text-sm text-muted-foreground text-center">
                        Nenhum produto encontrado
                      </div>
                    ) : (
                      filteredRuleProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex flex-col">
                            <span>{product.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {product.external_code && `Cód: ${product.external_code}`}
                              {product.external_code && product.short_id && ' • '}
                              {product.short_id && `ID: ${product.short_id}`}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
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

      {/* Dialog: Link de Convite Gerado */}
      <Dialog open={inviteLinkDialogOpen} onOpenChange={setInviteLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Afiliado Cadastrado!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Convite criado com sucesso!</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Envie o link abaixo para {createdAffiliateName}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link de convite</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedInviteLink || ''}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    if (generatedInviteLink) {
                      navigator.clipboard.writeText(generatedInviteLink);
                      toast({ title: 'Link copiado!' });
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este link expira em 7 dias
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setInviteLinkDialogOpen(false);
              setGeneratedInviteLink(null);
              setCreatedAffiliateName('');
            }} className="w-full">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
