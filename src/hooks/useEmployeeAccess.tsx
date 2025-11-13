import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { EmployeePermissions } from './useStoreEmployees';

export interface EmployeeAccess {
  isEmployee: boolean;
  storeId: string | null;
  storeName: string | null;
  permissions: EmployeePermissions | null;
  loading: boolean;
}

export const useEmployeeAccess = () => {
  const { user } = useAuth();
  const [employeeAccess, setEmployeeAccess] = useState<EmployeeAccess>({
    isEmployee: false,
    storeId: null,
    storeName: null,
    permissions: null,
    loading: true,
  });

  useEffect(() => {
    const checkEmployeeAccess = async () => {
      if (!user) {
        setEmployeeAccess({
          isEmployee: false,
          storeId: null,
          storeName: null,
          permissions: null,
          loading: false,
        });
        return;
      }

      try {
        // Verificar se o usuário é um funcionário ativo
        const { data: employeeData, error } = await supabase
          .from('store_employees' as any)
          .select(`
            id,
            store_id,
            permissions,
            is_active,
            stores:store_id (
              id,
              name
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (error || !employeeData) {
          setEmployeeAccess({
            isEmployee: false,
            storeId: null,
            storeName: null,
            permissions: null,
            loading: false,
          });
          return;
        }

        setEmployeeAccess({
          isEmployee: true,
          storeId: (employeeData as any).store_id,
          storeName: (employeeData as any).stores?.name || null,
          permissions: (employeeData as any).permissions as EmployeePermissions,
          loading: false,
        });
      } catch (error) {
        console.error('Error checking employee access:', error);
        setEmployeeAccess({
          isEmployee: false,
          storeId: null,
          storeName: null,
          permissions: null,
          loading: false,
        });
      }
    };

    checkEmployeeAccess();
  }, [user]);

  return employeeAccess;
};
