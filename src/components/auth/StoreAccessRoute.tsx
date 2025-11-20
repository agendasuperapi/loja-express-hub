import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface StoreAccessRouteProps {
  children: ReactNode;
  redirectPath?: string;
}

// Permite acesso se: (1) usuário logado E (2) é dono da loja OU funcionário ativo
export const StoreAccessRoute = ({ children, redirectPath = '/login-lojista' }: StoreAccessRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();
  const [isEmployee, setIsEmployee] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkEmployee = async () => {
      if (!user) {
        setIsEmployee(false);
        return;
      }
      try {
        const { data } = await (supabase
          .from('store_employees' as any)
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle() as any);
        setIsEmployee(!!data);
      } catch (e) {
        setIsEmployee(false);
      }
    };
    checkEmployee();
  }, [user]);

  const isLoading = authLoading || roleLoading || isEmployee === null;

  useEffect(() => {
    // Wait for all loading states to complete before any navigation
    if (isLoading) return;
    
    // Only navigate after we have complete information
    if (!user) {
      navigate(redirectPath);
      return;
    }
    
    const owner = hasRole('store_owner');
    if (!owner && !isEmployee) {
      navigate(redirectPath);
    }
  }, [user, isLoading, hasRole, isEmployee, navigate, redirectPath]);

  // Show loading while checking authentication and permissions
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // After loading, verify access
  if (!user) return null;

  const owner = hasRole('store_owner');
  if (!owner && !isEmployee) return null;

  return <>{children}</>;
};
