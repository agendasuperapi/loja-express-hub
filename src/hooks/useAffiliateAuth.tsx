import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AffiliateUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  cpf_cnpj?: string;
  pix_key?: string;
  avatar_url?: string;
}

interface AffiliateCoupon {
  code: string;
  discount_type: string;
  discount_value: number;
  applies_to?: string;
  category_names?: string[];
  product_ids?: string[];
}

interface AffiliateStore {
  store_affiliate_id: string;
  store_id: string;
  store_name: string;
  store_slug: string;
  store_logo?: string;
  commission_type: string;
  commission_value: number;
  status: string;
  // Legacy single coupon fields (backwards compatibility)
  coupon_code?: string;
  coupon_discount_type?: string;
  coupon_discount_value?: number;
  // New: array of all coupons
  coupons?: AffiliateCoupon[];
  total_sales: number;
  total_commission: number;
  pending_commission: number;
}

interface AffiliateStats {
  total_stores: number;
  total_sales: number;
  total_commission: number;
  pending_commission: number;
  paid_commission: number;
  total_orders: number;
}

export interface AffiliateOrder {
  earning_id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  order_date: string;
  store_id: string;
  store_name: string;
  store_affiliate_id?: string;
  order_total: number;
  commission_amount: number;
  commission_status: string;
  coupon_code?: string;
}

export interface AffiliateOrderItem {
  item_id: string;
  product_id: string;
  product_name: string;
  product_category: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  commission_type: string;
  commission_source: string;
  commission_value: number;
  item_commission: number;
}

interface AffiliateAuthContextType {
  affiliateUser: AffiliateUser | null;
  affiliateStores: AffiliateStore[];
  affiliateStats: AffiliateStats | null;
  affiliateOrders: AffiliateOrder[];
  isAuthenticated: boolean;
  isLoading: boolean;
  affiliateLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  affiliateLogout: () => Promise<void>;
  affiliateRegister: (token: string, password: string, name: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
  fetchAffiliateOrders: () => Promise<void>;
  fetchOrderItems: (orderId: string, storeAffiliateId: string) => Promise<AffiliateOrderItem[]>;
}

const AffiliateAuthContext = createContext<AffiliateAuthContextType | undefined>(undefined);

const AFFILIATE_TOKEN_KEY = 'affiliate_session_token';

export function AffiliateAuthProvider({ children }: { children: ReactNode }) {
  const [affiliateUser, setAffiliateUser] = useState<AffiliateUser | null>(null);
  const [affiliateStores, setAffiliateStores] = useState<AffiliateStore[]>([]);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
  const [affiliateOrders, setAffiliateOrders] = useState<AffiliateOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getStoredToken = () => localStorage.getItem(AFFILIATE_TOKEN_KEY);
  const setStoredToken = (token: string) => localStorage.setItem(AFFILIATE_TOKEN_KEY, token);
  const removeStoredToken = () => localStorage.removeItem(AFFILIATE_TOKEN_KEY);

  const validateSession = async () => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('affiliate-auth', {
        body: { action: 'validate', token }
      });

      if (error || !data?.valid) {
        removeStoredToken();
        setAffiliateUser(null);
        setAffiliateStores([]);
        setAffiliateStats(null);
        setAffiliateOrders([]);
      } else {
        setAffiliateUser(data.affiliate);
        await fetchAffiliateData();
      }
    } catch (err) {
      console.error('Session validation error:', err);
      removeStoredToken();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAffiliateOrders = async () => {
    const token = getStoredToken();
    if (!token) return;

    try {
      const { data: ordersData } = await supabase.functions.invoke('affiliate-invite', {
        body: { action: 'orders', affiliate_token: token }
      });
      
      if (ordersData?.orders) {
        setAffiliateOrders(ordersData.orders);
      }
    } catch (err) {
      console.error('Error fetching affiliate orders:', err);
    }
  };

  const fetchAffiliateData = async () => {
    const token = getStoredToken();
    if (!token) return;

    try {
      // Fetch stores
      const { data: storesData } = await supabase.functions.invoke('affiliate-invite', {
        body: { action: 'list-stores', affiliate_token: token }
      });
      
      if (storesData?.stores) {
        setAffiliateStores(storesData.stores);
      }

      // Fetch stats
      const { data: statsData } = await supabase.functions.invoke('affiliate-invite', {
        body: { action: 'stats', affiliate_token: token }
      });
      
      if (statsData?.stats) {
        setAffiliateStats(statsData.stats);
      }

      // Fetch orders
      await fetchAffiliateOrders();
    } catch (err) {
      console.error('Error fetching affiliate data:', err);
    }
  };

  useEffect(() => {
    validateSession();
  }, []);

  const affiliateLogin = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-auth', {
        body: { action: 'login', email, password }
      });

      if (error || !data?.success) {
        return { success: false, error: data?.error || 'Erro ao fazer login' };
      }

      setStoredToken(data.token);
      setAffiliateUser(data.affiliate);
      await fetchAffiliateData();
      
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de conexão' };
    }
  };

  const affiliateLogout = async () => {
    const token = getStoredToken();
    if (token) {
      try {
        await supabase.functions.invoke('affiliate-auth', {
          body: { action: 'logout', token }
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    removeStoredToken();
    setAffiliateUser(null);
    setAffiliateStores([]);
    setAffiliateStats(null);
    setAffiliateOrders([]);
  };

  const affiliateRegister = async (token: string, password: string, name: string, phone?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-auth', {
        body: { action: 'register', invite_token: token, password, name, phone }
      });

      if (error || !data?.success) {
        return { success: false, error: data?.error || 'Erro ao completar cadastro' };
      }

      // Auto login after registration
      setStoredToken(data.token);
      setAffiliateUser(data.affiliate);
      await fetchAffiliateData();
      
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de conexão' };
    }
  };

  const refreshData = async () => {
    if (affiliateUser) {
      await fetchAffiliateData();
    }
  };

  const fetchOrderItems = async (orderId: string, storeAffiliateId: string): Promise<AffiliateOrderItem[]> => {
    const token = getStoredToken();
    if (!token) return [];

    try {
      const { data } = await supabase.functions.invoke('affiliate-invite', {
        body: { 
          action: 'order-details', 
          affiliate_token: token,
          order_id: orderId,
          store_affiliate_id: storeAffiliateId
        }
      });
      
      return data?.items || [];
    } catch (err) {
      console.error('Error fetching order items:', err);
      return [];
    }
  };

  return (
    <AffiliateAuthContext.Provider
      value={{
        affiliateUser,
        affiliateStores,
        affiliateStats,
        affiliateOrders,
        isAuthenticated: !!affiliateUser,
        isLoading,
        affiliateLogin,
        affiliateLogout,
        affiliateRegister,
        refreshData,
        fetchAffiliateOrders,
        fetchOrderItems
      }}
    >
      {children}
    </AffiliateAuthContext.Provider>
  );
}

export function useAffiliateAuth() {
  const context = useContext(AffiliateAuthContext);
  if (context === undefined) {
    throw new Error('useAffiliateAuth must be used within an AffiliateAuthProvider');
  }
  return context;
}
