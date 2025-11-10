import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type AppRole = 'customer' | 'store_owner' | 'admin';

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;

        setRoles(data?.map(r => r.role as AppRole) || []);
      } catch (error) {
        console.error('Error fetching user roles:', error);
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
