import { ReactNode, useEffect, useState, useRef } from 'react';
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
  const checkedUserRef = useRef<string | null>(null);

  useEffect(() => {
    const checkEmployee = async () => {
      if (!user) {
        setIsEmployee(false);
        checkedUserRef.current = null;
        return;
      }
      
      // Evitar re-verificação desnecessária para o mesmo usuário
      if (checkedUserRef.current === user.id) {
        console.log('[StoreAccessRoute] Usuário já verificado, pulando');
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
        checkedUserRef.current = user.id;
      } catch (e) {
        setIsEmployee(false);
        checkedUserRef.current = user.id;
      }
    };
    checkEmployee();
  }, [user]);

  const isLoading = authLoading || roleLoading || isEmployee === null;

  useEffect(() => {
    // Wait for all loading states to complete before any navigation
    if (isLoading) {
      console.log('[StoreAccessRoute] Still loading', { authLoading, roleLoading, isEmployee, user });
      return;
    }

    console.log('[StoreAccessRoute] Evaluating access', { user, isEmployee, roleLoading, authLoading, redirectPath });

    // Only navigate after we have complete information
    if (!user) {
      console.log('[StoreAccessRoute] No user, redirecting to', redirectPath);
      navigate(redirectPath);
      return;
    }
    
    const owner = hasRole('store_owner');
    console.log('[StoreAccessRoute] Role check', { owner, isEmployee });

    if (!owner && !isEmployee) {
      console.log('[StoreAccessRoute] No permission, redirecting to', redirectPath);
      navigate(redirectPath);
    }
  }, [user, isLoading, hasRole, isEmployee, navigate, redirectPath, authLoading, roleLoading]);

  // Show loading while checking authentication and permissions
  if (isLoading) {
    console.log('[StoreAccessRoute] Rendering loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // After loading, verify access
  if (!user) {
    console.log('[StoreAccessRoute] Render blocked: no user after loading');
    return null;
  }

  const owner = hasRole('store_owner');
  if (!owner && !isEmployee) {
    console.log('[StoreAccessRoute] Render blocked: insufficient permissions');
    return null;
  }

  return <>{children}</>;
};
