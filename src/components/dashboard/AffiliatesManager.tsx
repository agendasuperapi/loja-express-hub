import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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
  Clock, CheckCircle, XCircle, CreditCard, Loader2, AlertCircle, Search, Mail, Link2, Package, ChevronDown, ChevronRight, Pencil, X
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
    updateCommissionRule,
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
  const [ruleProductsModalOpen, setRuleProductsModalOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsedRuleCategories, setCollapsedRuleCategories] = useState<Set<string>>(new Set());
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());
  const [rulesSearchTerm, setRulesSearchTerm] = useState('');
  
  // Estados para edição de regra inline
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRuleValue, setEditingRuleValue] = useState<number>(0);
  const [editingRuleType, setEditingRuleType] = useState<'percentage' | 'fixed'>('percentage');
  
  // Default Commission states
  const [defaultCommissionEnabled, setDefaultCommissionEnabled] = useState(true);
  const [defaultCommissionType, setDefaultCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [defaultCommissionValue, setDefaultCommissionValue] = useState(0);
  const [savingDefaultCommission, setSavingDefaultCommission] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [inviteLinkDialogOpen, setInviteLinkDialogOpen] = useState(false);
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
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
    commission_products: [] as { id: string; type: 'percentage' | 'fixed'; value: number }[],
  });

  const [ruleFormData, setRuleFormData] = useState({
    commission_type: 'percentage' as 'percentage' | 'fixed',
    commission_value: 0,
    applies_to: 'product' as 'product',
    product_ids: [] as string[],
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
    if (formData.commission_enabled && formData.commission_products.length === 0) {
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
    setDetailsModalOpen(true);
    
    // Load default commission settings
    setDefaultCommissionEnabled(affiliate.use_default_commission ?? true);
    setDefaultCommissionType(affiliate.default_commission_type || 'percentage');
    setDefaultCommissionValue(affiliate.default_commission_value || 0);
    
    const [rules, earnings, stats] = await Promise.all([
      getCommissionRules(affiliate.id),
      getAffiliateEarnings(affiliate.id),
      getAffiliateStats(affiliate.id),
    ]);
    setCommissionRules(rules);
    setAffiliateEarnings(earnings);
    setAffiliateStats(stats);
  };

  const handleSaveDefaultCommission = async () => {
    if (!selectedAffiliate) return;
    
    setSavingDefaultCommission(true);
    try {
      await updateAffiliate(selectedAffiliate.id, {
        use_default_commission: defaultCommissionEnabled,
        default_commission_type: defaultCommissionType,
        default_commission_value: defaultCommissionValue,
      });
      
      // Update local state
      setSelectedAffiliate({
        ...selectedAffiliate,
        use_default_commission: defaultCommissionEnabled,
        default_commission_type: defaultCommissionType,
        default_commission_value: defaultCommissionValue,
      });
      
      toast({
        title: 'Comissão padrão salva!',
        description: defaultCommissionEnabled 
          ? `Produtos sem regra específica receberão ${defaultCommissionType === 'percentage' ? `${defaultCommissionValue}%` : formatCurrency(defaultCommissionValue)} de comissão.`
          : 'Comissão padrão desativada.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a comissão padrão.',
        variant: 'destructive',
      });
    } finally {
      setSavingDefaultCommission(false);
    }
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
    if (!selectedAffiliate || ruleFormData.product_ids.length === 0) {
      toast({
        title: 'Selecione pelo menos um produto',
        variant: 'destructive',
      });
      return;
    }

    let createdCount = 0;
    for (const productId of ruleFormData.product_ids) {
      await createCommissionRule({
        affiliate_id: selectedAffiliate.id,
        commission_type: ruleFormData.commission_type,
        commission_value: ruleFormData.commission_value,
        applies_to: 'product',
        category_name: null,
        product_id: productId,
      });
      createdCount++;
    }

    const rules = await getCommissionRules(selectedAffiliate.id);
    setCommissionRules(rules);
    setRuleDialogOpen(false);
    setRuleFormData({
      commission_type: 'percentage',
      commission_value: 0,
      applies_to: 'product',
      product_ids: [],
    });
    setRuleProductSearch('');
    
    toast({
      title: 'Regras criadas com sucesso',
      description: `${createdCount} regra(s) de comissão adicionada(s)`,
    });
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!selectedAffiliate) return;
    await deleteCommissionRule(ruleId);
    const rules = await getCommissionRules(selectedAffiliate.id);
    setCommissionRules(rules);
  };

  const handleSaveRuleEdit = async (ruleId: string) => {
    if (editingRuleValue <= 0) {
      toast({
        title: "Valor inválido",
        description: "O valor da comissão deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }
    
    const result = await updateCommissionRule(ruleId, {
      commission_type: editingRuleType,
      commission_value: editingRuleValue,
    });
    
    if (result && selectedAffiliate) {
      const rules = await getCommissionRules(selectedAffiliate.id);
      setCommissionRules(rules);
      setEditingRuleId(null);
    }
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
                            <Badge>Produto</Badge>
                            <span className="text-sm">
                              {rule.product?.name || 'Produto'}
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
        <DialogContent className="max-w-lg h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingAffiliate ? 'Editar Afiliado' : 'Novo Afiliado'}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="dados" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="cupons">Cupons</TabsTrigger>
              <TabsTrigger value="comissoes">Comissões</TabsTrigger>
            </TabsList>
            
            {/* Aba Dados Básicos */}
            <TabsContent value="dados" className="flex-1 overflow-auto mt-4">
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
                        if (value.length <= 11) {
                          value = value.replace(/(\d{3})(\d)/, '$1.$2');
                          value = value.replace(/(\d{3})(\d)/, '$1.$2');
                          value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                        } else {
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
                </div>
              </div>
            </TabsContent>
            
            {/* Aba Cupons */}
            <TabsContent value="cupons" className="flex-1 overflow-auto mt-4">
              <div className="space-y-4">
                <div>
                  <Label>Cupons Vinculados *</Label>
                  <div className="flex gap-2 mt-2">
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
              </div>
            </TabsContent>
            
            {/* Aba Comissões */}
            <TabsContent value="comissoes" className="flex-1 overflow-auto mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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
                  <div>
                    <Label>Produtos e Comissões</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setProductsModalOpen(true)}
                        className="w-full justify-start"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Selecionar Produtos ({formData.commission_products.length} selecionados)
                      </Button>
                    </div>
                    {formData.commission_products.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {formData.commission_products.slice(0, 5).map((p) => {
                          const product = products.find(pr => pr.id === p.id);
                          return (
                            <Badge key={p.id} variant="secondary" className="text-xs">
                              {product?.name || 'Produto'} - {p.type === 'percentage' ? `${p.value}%` : `R$ ${p.value}`}
                            </Badge>
                          );
                        })}
                        {formData.commission_products.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{formData.commission_products.length - 5} mais
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
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

      {/* Dialog: Selecionar Produtos */}
      <Dialog open={productsModalOpen} onOpenChange={setProductsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Selecionar Produtos e Comissões</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Buscar por nome, código interno ou externo..."
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[400px] border rounded-md p-2">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setProductsModalOpen(false)}>
              Confirmar ({formData.commission_products.length} selecionados)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes do Afiliado */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalhes do Afiliado</DialogTitle>
            {selectedAffiliate && (
              <DialogDescription>
                {selectedAffiliate.name} - {selectedAffiliate.email}
              </DialogDescription>
            )}
          </DialogHeader>
          
          {selectedAffiliate && (
            <Tabs defaultValue="resumo" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="regras">Comissão Padrão</TabsTrigger>
                <TabsTrigger value="regras-especificas">Regras Específicas</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>
              
              {/* Aba Resumo */}
              <TabsContent value="resumo" className="flex-1 overflow-auto mt-4">
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
              </TabsContent>
              
              {/* Aba Regras de Comissão */}
              <TabsContent value="regras" className="flex-1 overflow-auto mt-4 space-y-4">
                {/* Seção Comissão Padrão */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Comissão Padrão</CardTitle>
                      </div>
                      <Switch
                        checked={defaultCommissionEnabled}
                        onCheckedChange={setDefaultCommissionEnabled}
                      />
                    </div>
                    <CardDescription>
                      {defaultCommissionEnabled 
                        ? 'Aplicada automaticamente a todos os produtos sem regra específica'
                        : 'Desativada - apenas produtos com regra específica terão comissão'}
                    </CardDescription>
                  </CardHeader>
                  
                  {defaultCommissionEnabled && (
                    <CardContent className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                          <Label className="text-sm">Tipo de Comissão</Label>
                          <Select
                            value={defaultCommissionType}
                            onValueChange={(v) => setDefaultCommissionType(v as 'percentage' | 'fixed')}
                          >
                            <SelectTrigger className="mt-1.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">
                                <div className="flex items-center gap-2">
                                  <Percent className="h-4 w-4" />
                                  Porcentagem (%)
                                </div>
                              </SelectItem>
                              <SelectItem value="fixed">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4" />
                                  Valor Fixo (R$)
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex-1">
                          <Label className="text-sm">
                            Valor {defaultCommissionType === 'percentage' ? '(%)' : '(R$)'}
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step={defaultCommissionType === 'percentage' ? '0.5' : '0.01'}
                            max={defaultCommissionType === 'percentage' ? '100' : undefined}
                            value={defaultCommissionValue}
                            onChange={(e) => setDefaultCommissionValue(Number(e.target.value))}
                            className="mt-1.5"
                            placeholder={defaultCommissionType === 'percentage' ? '10' : '5.00'}
                          />
                        </div>
                      </div>
                      
                      {/* Overview Stats */}
                      <div className="grid grid-cols-3 gap-3 p-3 bg-background rounded-lg border">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{products.length}</p>
                          <p className="text-xs text-muted-foreground">Total Produtos</p>
                        </div>
                        <div className="text-center border-x">
                          <p className="text-2xl font-bold text-amber-600">{commissionRules.length}</p>
                          <p className="text-xs text-muted-foreground">Com Regra Específica</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-emerald-600">
                            {Math.max(0, products.length - commissionRules.length)}
                          </p>
                          <p className="text-xs text-muted-foreground">Usando Padrão</p>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleSaveDefaultCommission}
                        disabled={savingDefaultCommission}
                        className="w-full"
                      >
                        {savingDefaultCommission ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Salvar Comissão Padrão
                          </>
                        )}
                      </Button>
                    </CardContent>
                  )}
                  
                  {!defaultCommissionEnabled && (
                    <CardContent>
                      <div className="flex items-center justify-center py-4 text-center">
                        <div>
                          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Ative para aplicar comissão em produtos sem regra específica
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => setDefaultCommissionEnabled(true)}
                          >
                            Ativar Comissão Padrão
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </TabsContent>
              
              {/* Aba Regras Específicas */}
              <TabsContent value="regras-especificas" className="flex-1 overflow-auto mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Regras Específicas
                      </CardTitle>
                      <CardDescription>
                        Regras que sobrescrevem a comissão padrão para produtos específicos
                      </CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setRuleDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Regra
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {/* Search and Actions Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por produto..."
                          value={rulesSearchTerm}
                          onChange={(e) => setRulesSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      {selectedRuleIds.size > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {selectedRuleIds.size} selecionado(s)
                          </span>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              const idsToDelete = Array.from(selectedRuleIds);
                              for (const id of idsToDelete) {
                                await handleDeleteRule(id);
                              }
                              setSelectedRuleIds(new Set());
                              toast({
                                title: "Regras excluídas",
                                description: `${idsToDelete.length} regra(s) excluída(s) com sucesso.`,
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir Selecionados
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRuleIds(new Set())}
                          >
                            Limpar Seleção
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Grouped Rules by Category */}
                    {(() => {
                      // Create product map to get category
                      const productMap = new Map(products.map(p => [p.id, p]));
                      
                      // Helper to get category for a rule
                      const getRuleCategory = (rule: typeof commissionRules[0]) => {
                        if (rule.product_id) {
                          const product = productMap.get(rule.product_id);
                          return product?.category || 'Sem Categoria';
                        }
                        return 'Sem Categoria';
                      };
                      
                      // Filter rules by search term
                      const filteredRules = commissionRules.filter(rule => {
                        const productCategory = getRuleCategory(rule);
                        return rule.product?.name?.toLowerCase().includes(rulesSearchTerm.toLowerCase()) ||
                          productCategory.toLowerCase().includes(rulesSearchTerm.toLowerCase());
                      });

                      // Group by category
                      const groupedRules = filteredRules.reduce((acc, rule) => {
                        const category = getRuleCategory(rule);
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(rule);
                        return acc;
                      }, {} as Record<string, typeof commissionRules>);

                      const categoryNames = Object.keys(groupedRules).sort();

                      if (categoryNames.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            {rulesSearchTerm 
                              ? 'Nenhuma regra encontrada para a busca'
                              : 'Nenhuma regra de comissão específica configurada'}
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {/* Select All */}
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Checkbox
                              checked={filteredRules.length > 0 && filteredRules.every(r => selectedRuleIds.has(r.id))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRuleIds(new Set(filteredRules.map(r => r.id)));
                                } else {
                                  setSelectedRuleIds(new Set());
                                }
                              }}
                            />
                            <span className="text-sm font-medium">Selecionar todos ({filteredRules.length})</span>
                          </div>

                          {categoryNames.map((category) => {
                            const categoryRules = groupedRules[category];
                            const isCollapsed = collapsedRuleCategories.has(category);
                            const allSelected = categoryRules.every(r => selectedRuleIds.has(r.id));
                            const someSelected = categoryRules.some(r => selectedRuleIds.has(r.id));

                            return (
                              <div key={category} className="border rounded-lg overflow-hidden">
                                {/* Category Header */}
                                <div
                                  className="flex items-center gap-2 p-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                                  onClick={(e) => {
                                    if ((e.target as HTMLElement).closest('[data-checkbox]')) return;
                                    setCollapsedRuleCategories(prev => {
                                      const next = new Set(prev);
                                      if (next.has(category)) {
                                        next.delete(category);
                                      } else {
                                        next.add(category);
                                      }
                                      return next;
                                    });
                                  }}
                                >
                                  <div data-checkbox onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={allSelected}
                                      onCheckedChange={(checked) => {
                                        setSelectedRuleIds(prev => {
                                          const next = new Set(prev);
                                          categoryRules.forEach(r => {
                                            if (checked) {
                                              next.add(r.id);
                                            } else {
                                              next.delete(r.id);
                                            }
                                          });
                                          return next;
                                        });
                                      }}
                                      className={someSelected && !allSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                                    />
                                  </div>
                                  {isCollapsed ? (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium flex-1">{category}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {categoryRules.length} {categoryRules.length === 1 ? 'regra' : 'regras'}
                                  </Badge>
                                  {someSelected && (
                                    <Badge variant="outline" className="text-xs">
                                      {categoryRules.filter(r => selectedRuleIds.has(r.id)).length} selecionado(s)
                                    </Badge>
                                  )}
                                </div>

                                {/* Category Rules */}
                                {!isCollapsed && (
                                  <div className="divide-y">
                                    {categoryRules.map((rule) => (
                                      <div
                                        key={rule.id}
                                        className={`flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors ${
                                          selectedRuleIds.has(rule.id) ? 'bg-primary/5' : ''
                                        }`}
                                      >
                                        <Checkbox
                                          checked={selectedRuleIds.has(rule.id)}
                                          onCheckedChange={(checked) => {
                                            setSelectedRuleIds(prev => {
                                              const next = new Set(prev);
                                              if (checked) {
                                                next.add(rule.id);
                                              } else {
                                                next.delete(rule.id);
                                              }
                                              return next;
                                            });
                                          }}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <span className="text-sm truncate block">
                                            {rule.product?.name || 'Produto'}
                                          </span>
                                        </div>
                                        
                                        {/* Modo de Edição ou Visualização */}
                                        {editingRuleId === rule.id ? (
                                          <div className="flex items-center gap-2">
                                            <Input
                                              type="number"
                                              value={editingRuleValue}
                                              onChange={(e) => setEditingRuleValue(Number(e.target.value))}
                                              className="w-20 h-8 text-sm"
                                              min={0}
                                              step={editingRuleType === 'percentage' ? 1 : 0.01}
                                            />
                                            <Select
                                              value={editingRuleType}
                                              onValueChange={(v) => setEditingRuleType(v as 'percentage' | 'fixed')}
                                            >
                                              <SelectTrigger className="w-16 h-8">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="percentage">%</SelectItem>
                                                <SelectItem value="fixed">R$</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-green-600"
                                              onClick={() => handleSaveRuleEdit(rule.id)}
                                            >
                                              <Check className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8"
                                              onClick={() => setEditingRuleId(null)}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <>
                                            <Badge variant="outline" className="shrink-0">
                                              {rule.commission_type === 'percentage'
                                                ? `${rule.commission_value}%`
                                                : formatCurrency(rule.commission_value)}
                                            </Badge>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0"
                                              onClick={() => {
                                                setEditingRuleId(rule.id);
                                                setEditingRuleValue(rule.commission_value);
                                                setEditingRuleType(rule.commission_type as 'percentage' | 'fixed');
                                              }}
                                            >
                                              <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-destructive shrink-0"
                                              onClick={() => handleDeleteRule(rule.id)}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Aba Histórico */}
              <TabsContent value="historico" className="flex-1 overflow-auto mt-4">
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
                    <ScrollArea className="h-[400px]">
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
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => handleShowInviteLink(selectedAffiliate!)}>
              <Link2 className="h-4 w-4 mr-1" />
              Link de Convite
            </Button>
            <Button onClick={() => setDetailsModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Adicionar Regra de Comissão - Movido para o final para ficar acima do modal de detalhes */}
      <Dialog open={ruleDialogOpen} onOpenChange={(open) => {
        setRuleDialogOpen(open);
        if (!open) {
          setRuleFormData({
            commission_type: 'percentage',
            commission_value: 0,
            applies_to: 'product',
            product_ids: [],
          });
          setRuleProductSearch('');
        }
      }}>
        <DialogContent className="max-w-md h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Nova Regra de Comissão</DialogTitle>
            <DialogDescription>
              Defina a comissão e selecione os produtos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Commission Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Comissão</Label>
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
              <div className="space-y-2">
                <Label>Valor</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ruleFormData.commission_value}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, commission_value: Number(e.target.value) })}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {ruleFormData.commission_type === 'percentage' ? '%' : 'R$'}
                  </span>
                </div>
              </div>
            </div>

            {/* Product Selection Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Produtos</Label>
                <span className="text-sm text-muted-foreground">
                  {ruleFormData.product_ids.length} selecionado(s)
                </span>
              </div>
              
              {/* Button to open product selection modal */}
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start h-auto min-h-10 py-2"
                onClick={() => setRuleProductsModalOpen(true)}
              >
                <Package className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">
                  {ruleFormData.product_ids.length === 0 
                    ? 'Selecionar produtos...' 
                    : `${ruleFormData.product_ids.length} produto(s) selecionado(s)`}
                </span>
              </Button>

              {/* Selected Products Badges */}
              {ruleFormData.product_ids.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-muted/50 rounded-md">
                  {ruleFormData.product_ids.map((productId) => {
                    const product = products.find(p => p.id === productId);
                    return (
                      <Badge 
                        key={productId} 
                        variant="secondary" 
                        className="text-xs flex items-center gap-1 pr-1"
                      >
                        {product?.name || 'Produto'}
                        <button
                          type="button"
                          onClick={() => setRuleFormData({
                            ...ruleFormData,
                            product_ids: ruleFormData.product_ids.filter(id => id !== productId)
                          })}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Info Message */}
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>A mesma comissão será aplicada a todos os produtos selecionados.</span>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddRule}
              disabled={ruleFormData.product_ids.length === 0 || ruleFormData.commission_value <= 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar {ruleFormData.product_ids.length > 0 && `(${ruleFormData.product_ids.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Selecionar Produtos para Regra de Comissão */}
      <Dialog open={ruleProductsModalOpen} onOpenChange={setRuleProductsModalOpen}>
        <DialogContent className="max-w-2xl h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Produtos</DialogTitle>
            <DialogDescription>
              Escolha os produtos que receberão a regra de comissão.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={ruleProductSearch}
                onChange={(e) => setRuleProductSearch(e.target.value)}
                placeholder="Buscar por nome, código interno ou externo..."
                className="pl-9"
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allProductIds = filteredRuleProducts
                      .filter(p => !commissionRules.some(r => r.product_id === p.id))
                      .map(p => p.id);
                    setRuleFormData({ ...ruleFormData, product_ids: allProductIds });
                  }}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Selecionar Todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRuleFormData({ ...ruleFormData, product_ids: [] })}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Limpar
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                {ruleFormData.product_ids.length} selecionado(s)
              </span>
            </div>

            {/* Products List by Category */}
            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-2 space-y-3">
                {filteredRuleProducts.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum produto encontrado</p>
                  </div>
                ) : (
                  // Group products by category
                  (() => {
                    const productsByCategory = filteredRuleProducts.reduce((acc, product) => {
                      const category = product.category || 'Sem Categoria';
                      if (!acc[category]) {
                        acc[category] = [];
                      }
                      acc[category].push(product);
                      return acc;
                    }, {} as Record<string, typeof filteredRuleProducts>);

                    return Object.entries(productsByCategory).map(([category, categoryProducts]) => {
                      const selectableProducts = categoryProducts.filter(p => !commissionRules.some(r => r.product_id === p.id));
                      const selectedInCategory = categoryProducts.filter(p => ruleFormData.product_ids.includes(p.id)).length;
                      const allSelectableSelected = selectableProducts.length > 0 && selectableProducts.every(p => ruleFormData.product_ids.includes(p.id));

                      return (
                        <div key={category} className="border rounded-lg overflow-hidden">
                          {/* Category Header */}
                          <div 
                            className="flex items-center gap-3 p-3 bg-muted/50 border-b cursor-pointer"
                            onClick={() => {
                              setCollapsedCategories(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(category)) {
                                  newSet.delete(category);
                                } else {
                                  newSet.add(category);
                                }
                                return newSet;
                              });
                            }}
                          >
                            <button
                              type="button"
                              className="p-0.5 hover:bg-muted rounded transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCollapsedCategories(prev => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(category)) {
                                    newSet.delete(category);
                                  } else {
                                    newSet.add(category);
                                  }
                                  return newSet;
                                });
                              }}
                            >
                              {collapsedCategories.has(category) ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                            <Checkbox
                              checked={allSelectableSelected}
                              disabled={selectableProducts.length === 0}
                              onClick={(e) => e.stopPropagation()}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const newIds = [...new Set([...ruleFormData.product_ids, ...selectableProducts.map(p => p.id)])];
                                  setRuleFormData({ ...ruleFormData, product_ids: newIds });
                                } else {
                                  const categoryIds = categoryProducts.map(p => p.id);
                                  setRuleFormData({
                                    ...ruleFormData,
                                    product_ids: ruleFormData.product_ids.filter(id => !categoryIds.includes(id))
                                  });
                                }
                              }}
                            />
                            <div className="flex-1 flex items-center justify-between">
                              <span className="font-semibold text-sm">{category}</span>
                              <Badge variant="secondary" className="text-xs">
                                {selectedInCategory}/{categoryProducts.length} selecionados
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Category Products */}
                          {!collapsedCategories.has(category) && (
                            <div className="p-1.5 space-y-0.5">
                              {categoryProducts.map((product) => {
                                const isSelected = ruleFormData.product_ids.includes(product.id);
                                const hasExistingRule = commissionRules.some(r => r.product_id === product.id);
                                
                                return (
                                  <label
                                    key={product.id}
                                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                                      isSelected 
                                        ? 'bg-primary/10 border border-primary/30' 
                                        : 'hover:bg-muted/50 border border-transparent'
                                    } ${hasExistingRule ? 'opacity-50' : ''}`}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      disabled={hasExistingRule}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setRuleFormData({
                                            ...ruleFormData,
                                            product_ids: [...ruleFormData.product_ids, product.id]
                                          });
                                        } else {
                                          setRuleFormData({
                                            ...ruleFormData,
                                            product_ids: ruleFormData.product_ids.filter(id => id !== product.id)
                                          });
                                        }
                                      }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm truncate">{product.name}</span>
                                        {hasExistingRule && (
                                          <Badge variant="outline" className="text-xs">Já tem regra</Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {product.external_code && <span>Cód: {product.external_code}</span>}
                                        {product.external_code && product.short_id && <span>•</span>}
                                        {product.short_id && <span>ID: {product.short_id}</span>}
                                        <span>•</span>
                                        <span className="font-medium text-foreground">
                                          R$ {(product.promotional_price || product.price).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRuleProductsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setRuleProductsModalOpen(false)}>
              <Check className="h-4 w-4 mr-1" />
              Confirmar ({ruleFormData.product_ids.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
