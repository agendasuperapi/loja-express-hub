import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'customer' | 'store_owner' | 'admin';
  requireAuth?: boolean;
  redirectPath?: string;
}

export const ProtectedRoute = ({ 
  children, 
  requireRole,
  requireAuth = true,
  redirectPath 
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for both auth and role loading to complete
    if (authLoading || roleLoading) return;

    // Only redirect after loading is complete
    if (requireAuth && !user) {
      const defaultRedirect = requireRole === 'store_owner' ? '/login-lojista' : '/auth';
      navigate(redirectPath || defaultRedirect);
      return;
    }

    if (requireRole && !hasRole(requireRole)) {
      const defaultRedirect = requireRole === 'store_owner' ? '/login-lojista' : '/';
      navigate(redirectPath || defaultRedirect);
      return;
    }
  }, [user, authLoading, roleLoading, requireAuth, requireRole, hasRole, navigate, redirectPath]);

  // Show loading state while checking auth
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // After loading, check auth requirements
  if (requireAuth && !user) {
    return null;
  }

  if (requireRole && !hasRole(requireRole)) {
    return null;
  }

  return <>{children}</>;
};
