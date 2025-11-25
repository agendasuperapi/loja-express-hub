import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type AppRole = 'customer' | 'store_owner' | 'admin';

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('[useUserRole] 👤 useEffect disparado:', {
      userId: user?.id,
      prevUserId: prevUserIdRef.current,
      isSameUser: user?.id === prevUserIdRef.current,
      timestamp: Date.now()
    });

    if (!user) {
      console.log('[useUserRole] ❌ Sem usuário, limpando roles');
      setRoles([]);
      setLoading(false);
      prevUserIdRef.current = null;
      return;
    }

    // Evitar re-fetch se o usuário não mudou
    if (user?.id === prevUserIdRef.current && prevUserIdRef.current !== null) {
      console.log('[useUserRole] ⏭️ Pulando fetch - mesmo usuário');
      return;
    }

    // Sempre que houver usuário, marcamos como carregando antes de buscar as roles
    setLoading(true);
    console.log('[useUserRole] 🔍 Iniciando fetch de roles para:', user.id);

    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;

        const userRoles = data?.map(r => r.role as AppRole) || [];
        console.log('[useUserRole] ✅ Roles obtidas:', userRoles);
        setRoles(userRoles);
        prevUserIdRef.current = user.id;
      } catch (error) {
        console.error('[useUserRole] ❌ Erro ao buscar roles:', error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user]);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isCustomer = hasRole('customer');
  const isStoreOwner = hasRole('store_owner');
  const isAdmin = hasRole('admin');

  return {
    roles,
    hasRole,
    isCustomer,
    isStoreOwner,
    isAdmin,
    loading,
  };
};
