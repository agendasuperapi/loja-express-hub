import { Navigate } from 'react-router-dom';
import { useAffiliateAuth } from '@/hooks/useAffiliateAuth';
import { Loader2 } from 'lucide-react';

interface AffiliateProtectedRouteProps {
  children: React.ReactNode;
}

export function AffiliateProtectedRoute({ children }: AffiliateProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAffiliateAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login-afiliado" replace />;
  }

  return <>{children}</>;
}
