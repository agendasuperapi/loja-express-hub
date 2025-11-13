import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmployeePermissions {
  orders: { view: boolean; create: boolean; update: boolean; delete: boolean };
  products: { view: boolean; create: boolean; update: boolean; delete: boolean };
  categories: { view: boolean; create: boolean; update: boolean; delete: boolean };
  coupons: { view: boolean; create: boolean; update: boolean; delete: boolean };
  reports: { view: boolean };
  settings: { view: boolean; update: boolean };
  employees: { view: boolean; create: boolean; update: boolean; delete: boolean };
}

export interface StoreEmployee {
  id: string;
  store_id: string;
  user_id: string;
  employee_name: string;
  employee_email: string;
  employee_phone?: string;
  position?: string;
  is_active: boolean;
  permissions: EmployeePermissions;
  notes?: string;
  hired_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface EmployeeInvite {
  id: string;
  store_id: string;
  email: string;
  position?: string;
  permissions: EmployeePermissions;
  invite_token: string;
  expires_at: string;
  is_used: boolean;
  created_at: string;
}

export interface EmployeeActivityLog {
  id: string;
  store_id: string;
  employee_id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: any;
  created_at: string;
  employee?: {
    employee_name: string;
    employee_email: string;
  };
}

export const useStoreEmployees = (storeId?: string) => {
  const [employees, setEmployees] = useState<StoreEmployee[]>([]);
  const [invites, setInvites] = useState<EmployeeInvite[]>([]);
  const [activityLogs, setActivityLogs] = useState<EmployeeActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (storeId) {
      fetchEmployees();
      fetchInvites();
    }
  }, [storeId]);

  const fetchEmployees = async () => {
    if (!storeId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_employees' as any)
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast({
        title: 'Erro ao carregar funcionários',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvites = async () => {
    if (!storeId) return;
    
    try {
      const { data, error } = await supabase
        .from('employee_invites' as any)
        .select('*')
        .eq('store_id', storeId)
        .eq('is_used', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching invites:', error);
    }
  };

  const fetchActivityLogs = async (limit = 50) => {
    if (!storeId) return;
    
    try {
      const { data, error } = await supabase
        .from('employee_activity_log' as any)
        .select(`
          *,
          employee:store_employees!employee_id(employee_name, employee_email)
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setActivityLogs((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const createEmployee = async (employeeData: Omit<StoreEmployee, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('store_employees' as any)
        .insert([employeeData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Funcionário cadastrado',
        description: 'Funcionário adicionado com sucesso',
      });

      await fetchEmployees();
      return data;
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast({
        title: 'Erro ao cadastrar funcionário',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateEmployee = async (id: string, updates: Partial<StoreEmployee>) => {
    try {
      const { data, error } = await supabase
        .from('store_employees' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Funcionário atualizado',
        description: 'Dados atualizados com sucesso',
      });

      await fetchEmployees();
      return data;
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast({
        title: 'Erro ao atualizar funcionário',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('store_employees' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Funcionário removido',
        description: 'Funcionário removido do sistema',
      });

      await fetchEmployees();
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast({
        title: 'Erro ao remover funcionário',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const toggleEmployeeStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateEmployee(id, { is_active: !currentStatus });
    } catch (error) {
      throw error;
    }
  };

  const createInvite = async (inviteData: {
    email: string;
    position?: string;
    permissions: EmployeePermissions;
  }) => {
    if (!storeId) return;

    try {
      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('employee_invites' as any)
        .insert([{
          store_id: storeId,
          email: inviteData.email,
          position: inviteData.position,
          permissions: inviteData.permissions,
          invite_token: inviteToken,
          expires_at: expiresAt.toISOString(),
          created_by: userData.user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Convite criado',
        description: `Convite enviado para ${inviteData.email}`,
      });

      await fetchInvites();
      return data;
    } catch (error: any) {
      console.error('Error creating invite:', error);
      toast({
        title: 'Erro ao criar convite',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteInvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employee_invites' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Convite cancelado',
      });

      await fetchInvites();
    } catch (error: any) {
      console.error('Error deleting invite:', error);
      toast({
        title: 'Erro ao cancelar convite',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const logActivity = async (activityData: {
    employee_id: string;
    action: string;
    resource_type?: string;
    resource_id?: string;
    details?: any;
  }) => {
    if (!storeId) return;

    try {
      await supabase
        .from('employee_activity_log' as any)
        .insert([{
          store_id: storeId,
          ...activityData,
        }]);
    } catch (error: any) {
      console.error('Error logging activity:', error);
    }
  };

  return {
    employees,
    invites,
    activityLogs,
    isLoading,
    fetchEmployees,
    fetchInvites,
    fetchActivityLogs,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    toggleEmployeeStatus,
    createInvite,
    deleteInvite,
    logActivity,
  };
};
