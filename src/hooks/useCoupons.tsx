import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type DiscountType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  store_id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponValidation {
  is_valid: boolean;
  discount_type: DiscountType | null;
  discount_value: number | null;
  discount_amount: number;
  error_message: string | null;
}

export const useCoupons = (storeId: string | undefined) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load coupons when store ID is available
  useEffect(() => {
    if (storeId) {
      fetchCoupons();
    }
  }, [storeId]);

  const fetchCoupons = async () => {
    if (!storeId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('coupons' as any)
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data as unknown as Coupon[]) || []);
    } catch (error: any) {
      console.warn('Cupons table not available yet. Please run create_coupons_system.sql migration.');
      setCoupons([]);
    } finally {
      setIsLoading(false);
    }
  };

  const validateCoupon = async (
    code: string,
    orderTotal: number
  ): Promise<CouponValidation> => {
    if (!storeId) {
      return {
        is_valid: false,
        discount_type: null,
        discount_value: null,
        discount_amount: 0,
        error_message: 'Loja não identificada',
      };
    }

    try {
      const { data, error } = await supabase.rpc('validate_coupon' as any, {
        p_store_id: storeId,
        p_code: code,
        p_order_total: orderTotal,
      });

      if (error) throw error;

      const result = data[0] as CouponValidation;
      
      if (!result.is_valid) {
        toast({
          title: 'Cupom inválido',
          description: result.error_message || 'Este cupom não pode ser aplicado',
          variant: 'destructive',
        });
      }

      return result;
    } catch (error: any) {
      console.warn('Coupon validation not available yet. Please run create_coupons_system.sql migration.');
      return {
        is_valid: false,
        discount_type: null,
        discount_value: null,
        discount_amount: 0,
        error_message: 'Sistema de cupons ainda não configurado',
      };
    }
  };

  const createCoupon = async (couponData: Omit<Coupon, 'id' | 'created_at' | 'updated_at' | 'used_count'>) => {
    try {
      console.log('Creating coupon with data:', couponData);
      
      const { data, error } = await supabase
        .from('coupons' as any)
        .insert([couponData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating coupon:', error);
        throw error;
      }

      toast({
        title: 'Cupom criado com sucesso',
        description: `O cupom ${couponData.code} foi criado`,
      });

      await fetchCoupons();
      return data;
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      
      const errorMessage = error.message || error.hint || 'Erro desconhecido';
      
      toast({
        title: 'Erro ao criar cupom',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateCoupon = async (id: string, updates: Partial<Coupon>) => {
    try {
      console.log('Updating coupon:', id, updates);
      
      const { data, error } = await supabase
        .from('coupons' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating coupon:', error);
        throw error;
      }

      toast({
        title: 'Cupom atualizado',
        description: 'As alterações foram salvas com sucesso',
      });

      await fetchCoupons();
      return data;
    } catch (error: any) {
      console.error('Error updating coupon:', error);
      
      const errorMessage = error.message || error.hint || 'Erro desconhecido';
      
      toast({
        title: 'Erro ao atualizar cupom',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      console.log('Deleting coupon:', id);
      
      const { error } = await supabase
        .from('coupons' as any)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error deleting coupon:', error);
        throw error;
      }

      toast({
        title: 'Cupom excluído',
        description: 'O cupom foi removido com sucesso',
      });

      await fetchCoupons();
    } catch (error: any) {
      console.error('Error deleting coupon:', error);
      
      const errorMessage = error.message || error.hint || 'Erro desconhecido';
      
      toast({
        title: 'Erro ao excluir cupom',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const toggleCouponStatus = async (id: string, isActive: boolean) => {
    return updateCoupon(id, { is_active: isActive });
  };

  return {
    coupons,
    isLoading,
    fetchCoupons,
    validateCoupon,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
  };
};
