import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Affiliate {
  id: string;
  store_id: string;
  user_id?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  cpf_cnpj?: string | null;
  pix_key?: string | null;
  coupon_id?: string | null; // Legacy field
  is_active: boolean;
  commission_enabled: boolean;
  default_commission_type: 'percentage' | 'fixed';
  default_commission_value: number;
  created_at: string;
  updated_at: string;
  coupon?: {
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
  } | null;
  // Multiple coupons
  affiliate_coupons?: Array<{
    coupon_id: string;
    coupon: {
      id: string;
      code: string;
      discount_type: string;
      discount_value: number;
    };
  }>;
}

export interface AffiliateCommissionRule {
  id: string;
  affiliate_id: string;
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  applies_to: 'all' | 'category' | 'product';
  category_name?: string | null;
  product_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product?: { id: string; name: string } | null;
}

export interface AffiliateEarning {
  id: string;
  affiliate_id: string;
  order_id: string;
  order_item_id?: string | null;
  order_total: number;
  commission_amount: number;
  commission_type: string;
  commission_value: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  paid_at?: string | null;
  created_at: string;
  order?: {
    order_number: string;
    customer_name: string;
    total: number;
    created_at: string;
  } | null;
}

export interface AffiliatePayment {
  id: string;
  affiliate_id: string;
  amount: number;
  payment_method?: string | null;
  payment_proof?: string | null;
  notes?: string | null;
  paid_at: string;
  created_at: string;
}

export interface AffiliateStats {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  totalSales: number;
  totalOrders: number;
}

export const useAffiliates = (storeId?: string) => {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAffiliates = useCallback(async () => {
    if (!storeId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('affiliates')
        .select(`*, coupon:coupons(id, code, discount_type, discount_value), affiliate_coupons(coupon_id, coupon:coupons(id, code, discount_type, discount_value))`)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAffiliates(data || []);
    } catch (error: any) {
      console.error('Error fetching affiliates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchAffiliates();
  }, [fetchAffiliates]);

  const createAffiliate = async (affiliateData: Partial<Affiliate> & { coupon_ids?: string[] }) => {
    if (!storeId) return null;
    try {
      const { coupon_ids, ...rest } = affiliateData;
      const { data, error } = await (supabase as any)
        .from('affiliates')
        .insert({
          store_id: storeId,
          name: rest.name,
          email: rest.email,
          phone: rest.phone,
          cpf_cnpj: rest.cpf_cnpj,
          pix_key: rest.pix_key,
          coupon_id: coupon_ids?.[0] || rest.coupon_id, // Keep legacy field for backwards compatibility
          is_active: rest.is_active ?? true,
          commission_enabled: rest.commission_enabled ?? true,
          default_commission_type: rest.default_commission_type || 'percentage',
          default_commission_value: rest.default_commission_value || 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert multiple coupons into junction table
      if (coupon_ids && coupon_ids.length > 0) {
        const couponInserts = coupon_ids.map(couponId => ({
          affiliate_id: data.id,
          coupon_id: couponId,
        }));
        await (supabase as any).from('affiliate_coupons').insert(couponInserts);
        
        // Sync with store_affiliates system if affiliate_account exists
        const { data: affiliateAccount } = await supabase
          .from('affiliate_accounts')
          .select('id')
          .eq('email', rest.email?.toLowerCase() || '')
          .maybeSingle();

        if (affiliateAccount) {
          const { data: storeAffiliate } = await (supabase as any)
            .from('store_affiliates')
            .select('id')
            .eq('affiliate_account_id', affiliateAccount.id)
            .eq('store_id', storeId)
            .maybeSingle();

          if (storeAffiliate) {
            // Update legacy coupon_id field AND sync commission values
            await (supabase as any)
              .from('store_affiliates')
              .update({ 
                coupon_id: coupon_ids[0],
                default_commission_type: rest.default_commission_type || 'percentage',
                default_commission_value: rest.default_commission_value || 0
              })
              .eq('id', storeAffiliate.id);

            // Sync store_affiliate_coupons junction table
            const storeAffiliateInserts = coupon_ids.map(couponId => ({
              store_affiliate_id: storeAffiliate.id,
              coupon_id: couponId,
            }));
            await (supabase as any).from('store_affiliate_coupons').insert(storeAffiliateInserts);
            console.log('✅ Synced coupons and commission to store_affiliates:', { coupon_ids, commission_type: rest.default_commission_type, commission_value: rest.default_commission_value });
          }
        }
      }

      toast({ title: 'Afiliado criado!' });
      await fetchAffiliates();
      return data;
    } catch (error: any) {
      toast({ title: 'Erro ao criar afiliado', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const updateAffiliate = async (id: string, updates: Partial<Affiliate> & { coupon_ids?: string[] }) => {
    try {
      const { coupon_ids, ...rest } = updates;
      const updateData = { ...rest };
      if (coupon_ids) {
        updateData.coupon_id = coupon_ids[0] || null; // Keep legacy field
      }
      
      const { data, error } = await (supabase as any)
        .from('affiliates')
        .update(updateData)
        .eq('id', id)
        .select('*, email')
        .single();

      if (error) throw error;

      // Update junction table if coupon_ids provided
      if (coupon_ids !== undefined) {
        // Remove existing from affiliate_coupons
        await (supabase as any).from('affiliate_coupons').delete().eq('affiliate_id', id);
        // Insert new into affiliate_coupons
        if (coupon_ids.length > 0) {
          const couponInserts = coupon_ids.map(couponId => ({
            affiliate_id: id,
            coupon_id: couponId,
          }));
          await (supabase as any).from('affiliate_coupons').insert(couponInserts);
        }

        // Sync with store_affiliates table AND store_affiliate_coupons junction table
        if (data?.email) {
          const { data: affiliateAccount } = await supabase
            .from('affiliate_accounts')
            .select('id')
            .eq('email', data.email.toLowerCase())
            .single();

          if (affiliateAccount && data?.store_id) {
            // Get the store_affiliate record
            const { data: storeAffiliate } = await (supabase as any)
              .from('store_affiliates')
              .select('id')
              .eq('affiliate_account_id', affiliateAccount.id)
              .eq('store_id', data.store_id)
              .single();

            if (storeAffiliate) {
              // Update legacy coupon_id field AND sync commission values
              await (supabase as any)
                .from('store_affiliates')
                .update({ 
                  coupon_id: coupon_ids[0] || null,
                  default_commission_type: rest.default_commission_type || data.default_commission_type || 'percentage',
                  default_commission_value: rest.default_commission_value ?? data.default_commission_value ?? 0
                })
                .eq('id', storeAffiliate.id);

              console.log('✅ Synced commission to store_affiliates:', { 
                commission_type: rest.default_commission_type || data.default_commission_type, 
                commission_value: rest.default_commission_value ?? data.default_commission_value 
              });

              // Clear old store_affiliate_coupons entries
              await (supabase as any)
                .from('store_affiliate_coupons')
                .delete()
                .eq('store_affiliate_id', storeAffiliate.id);

              // Insert new store_affiliate_coupons entries
              if (coupon_ids.length > 0) {
                const storeAffiliateInserts = coupon_ids.map(couponId => ({
                  store_affiliate_id: storeAffiliate.id,
                  coupon_id: couponId,
                }));
                await (supabase as any).from('store_affiliate_coupons').insert(storeAffiliateInserts);
              }
            }
          }
        }
      }

      toast({ title: 'Afiliado atualizado!' });
      await fetchAffiliates();
      return data;
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const deleteAffiliate = async (id: string) => {
    try {
      const { error } = await (supabase as any).from('affiliates').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Afiliado removido!' });
      await fetchAffiliates();
      return true;
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const toggleAffiliateStatus = (id: string, isActive: boolean) => updateAffiliate(id, { is_active: isActive });
  const toggleCommission = (id: string, enabled: boolean) => updateAffiliate(id, { commission_enabled: enabled });

  const getCommissionRules = async (affiliateId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('affiliate_commission_rules')
        .select(`*, product:products(id, name)`)
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch { return []; }
  };

  const createCommissionRule = async (ruleData: Partial<AffiliateCommissionRule>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('affiliate_commission_rules')
        .insert({
          affiliate_id: ruleData.affiliate_id,
          commission_type: ruleData.commission_type || 'percentage',
          commission_value: ruleData.commission_value || 0,
          applies_to: ruleData.applies_to || 'all',
          category_name: ruleData.category_name,
          product_id: ruleData.product_id,
          is_active: ruleData.is_active ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      toast({ title: 'Regra criada!' });
      return data;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const deleteCommissionRule = async (id: string) => {
    try {
      const { error } = await (supabase as any).from('affiliate_commission_rules').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Regra removida!' });
      return true;
    } catch { return false; }
  };

  const getAffiliateEarnings = async (affiliateId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('affiliate_earnings')
        .select(`*, order:orders(order_number, customer_name, total, created_at)`)
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch { return []; }
  };

  const updateEarningStatus = async (id: string, status: AffiliateEarning['status']) => {
    try {
      const updateData: any = { status };
      if (status === 'paid') updateData.paid_at = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from('affiliate_earnings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      toast({ title: 'Status atualizado!' });
      return data;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const getAffiliatePayments = async (affiliateId: string): Promise<AffiliatePayment[]> => {
    try {
      const { data, error } = await (supabase as any)
        .from('affiliate_payments')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('paid_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch { return []; }
  };

  const createPayment = async (paymentData: Partial<AffiliatePayment>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('affiliate_payments')
        .insert({
          affiliate_id: paymentData.affiliate_id,
          amount: paymentData.amount || 0,
          payment_method: paymentData.payment_method,
          notes: paymentData.notes,
          paid_at: paymentData.paid_at || new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      toast({ title: 'Pagamento registrado!' });
      return data;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const getAffiliateStats = async (affiliateId: string): Promise<AffiliateStats> => {
    try {
      const { data: earnings } = await (supabase as any)
        .from('affiliate_earnings')
        .select('commission_amount, status, order_total')
        .eq('affiliate_id', affiliateId);

      const stats: AffiliateStats = { totalEarnings: 0, pendingEarnings: 0, paidEarnings: 0, totalSales: 0, totalOrders: earnings?.length || 0 };
      earnings?.forEach((e: any) => {
        stats.totalSales += Number(e.order_total) || 0;
        const amount = Number(e.commission_amount) || 0;
        stats.totalEarnings += amount;
        if (e.status === 'pending' || e.status === 'approved') stats.pendingEarnings += amount;
        else if (e.status === 'paid') stats.paidEarnings += amount;
      });
      return stats;
    } catch { return { totalEarnings: 0, pendingEarnings: 0, paidEarnings: 0, totalSales: 0, totalOrders: 0 }; }
  };

  const getAllStoreEarnings = async () => {
    if (!storeId) return [];
    try {
      const { data } = await (supabase as any)
        .from('affiliate_earnings')
        .select(`*, affiliate:affiliates!inner(id, name, email, store_id), order:orders(order_number, customer_name, total, created_at)`)
        .eq('affiliate.store_id', storeId)
        .order('created_at', { ascending: false });
      return data || [];
    } catch { return []; }
  };

  return {
    affiliates, isLoading, fetchAffiliates, createAffiliate, updateAffiliate, deleteAffiliate,
    toggleAffiliateStatus, toggleCommission, getCommissionRules, createCommissionRule, deleteCommissionRule,
    getAffiliateEarnings, updateEarningStatus, getAffiliatePayments, createPayment, getAffiliateStats, getAllStoreEarnings,
  };
};

export const useMyAffiliateData = () => {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [earnings, setEarnings] = useState<AffiliateEarning[]>([]);
  const [payments, setPayments] = useState<AffiliatePayment[]>([]);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: affiliateData } = await (supabase as any)
        .from('affiliates')
        .select(`*, coupon:coupons(id, code, discount_type, discount_value)`)
        .eq('user_id', user.id)
        .single();

      if (!affiliateData) { setIsLoading(false); return; }
      setAffiliate(affiliateData);

      const { data: earningsData } = await (supabase as any)
        .from('affiliate_earnings')
        .select(`*, order:orders(order_number, customer_name, total, created_at)`)
        .eq('affiliate_id', affiliateData.id)
        .order('created_at', { ascending: false });
      setEarnings(earningsData || []);

      const { data: paymentsData } = await (supabase as any)
        .from('affiliate_payments')
        .select('*')
        .eq('affiliate_id', affiliateData.id)
        .order('paid_at', { ascending: false });
      setPayments(paymentsData || []);

      const calculatedStats: AffiliateStats = { totalEarnings: 0, pendingEarnings: 0, paidEarnings: 0, totalSales: 0, totalOrders: earningsData?.length || 0 };
      earningsData?.forEach((e: any) => {
        calculatedStats.totalSales += Number(e.order_total) || 0;
        const amount = Number(e.commission_amount) || 0;
        calculatedStats.totalEarnings += amount;
        if (e.status === 'pending' || e.status === 'approved') calculatedStats.pendingEarnings += amount;
        else if (e.status === 'paid') calculatedStats.paidEarnings += amount;
      });
      setStats(calculatedStats);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMyData(); }, [fetchMyData]);

  return { affiliate, earnings, payments, stats, isLoading, refetch: fetchMyData };
};
