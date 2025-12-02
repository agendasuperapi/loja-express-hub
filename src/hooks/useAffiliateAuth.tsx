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

interface AffiliateStore {
  store_affiliate_id: string;
  store_id: string;
  store_name: string;
  store_slug: string;
  store_logo?: string;
  commission_type: string;
  commission_value: number;
  status: string;
  coupon_code?: string;
  coupon_discount_type?: string;
  coupon_discount_value?: number;
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

interface AffiliateAuthContextType {
  affiliateUser: AffiliateUser | null;
  affiliateStores: AffiliateStore[];
  affiliateStats: AffiliateStats | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  affiliateLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  affiliateLogout: () => Promise<void>;
  affiliateRegister: (token: string, password: string, name: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
}

const AffiliateAuthContext = createContext<AffiliateAuthContextType | undefined>(undefined);

const AFFILIATE_TOKEN_KEY = 'affiliate_session_token';

export function AffiliateAuthProvider({ children }: { children: ReactNode }) {
  const [affiliateUser, setAffiliateUser] = useState<AffiliateUser | null>(null);
  const [affiliateStores, setAffiliateStores] = useState<AffiliateStore[]>([]);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
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

  const fetchAffiliateData = async () => {
    const token = getStoredToken();
    if (!token) return;

    try {
      // Fetch stores
      const { data: storesData } = await supabase.functions.invoke('affiliate-invite', {
        body: { action: 'list-stores', token }
      });
      
      if (storesData?.stores) {
        setAffiliateStores(storesData.stores);
      }

      // Fetch stats
      const { data: statsData } = await supabase.functions.invoke('affiliate-invite', {
        body: { action: 'stats', token }
      });
      
      if (statsData?.stats) {
        setAffiliateStats(statsData.stats);
      }
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

  return (
    <AffiliateAuthContext.Provider
      value={{
        affiliateUser,
        affiliateStores,
        affiliateStats,
        isAuthenticated: !!affiliateUser,
        isLoading,
        affiliateLogin,
        affiliateLogout,
        affiliateRegister,
        refreshData
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
