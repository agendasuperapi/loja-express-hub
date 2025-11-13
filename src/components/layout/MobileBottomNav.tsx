import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Package, Plus, ShoppingCart, Settings, Store, LayoutDashboard, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCart } from "@/contexts/CartContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getItemCount, getTotal } = useCart();
  const { hasRole } = useUserRole();
  const { user } = useAuth();
  const itemCount = getItemCount();
  const total = getTotal();
  const [lastStore, setLastStore] = useState<{ slug: string; name: string } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);

  // Verificar se é funcionário
  useEffect(() => {
    const checkEmployee = async () => {
      if (!user) {
        setIsEmployee(false);
        return;
      }
      
      const { data } = await supabase
        .from('store_employees' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      setIsEmployee(!!data);
    };
    
    checkEmployee();
  }, [user]);

  useEffect(() => {
    const loadLastStore = () => {
      const stored = localStorage.getItem('lastVisitedStore');
      if (stored) {
        setLastStore(JSON.parse(stored));
      }
    };
    
    // Load initially
    loadLastStore();
    
    // Listen for storage changes
    window.addEventListener('storage', loadLastStore);
    
    // Also check on interval to catch same-tab changes
    const interval = setInterval(loadLastStore, 500);
    
    return () => {
      window.removeEventListener('storage', loadLastStore);
      clearInterval(interval);
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const getDashboardPath = () => {
    if (hasRole('store_owner') || isEmployee) return '/dashboard-lojista';
    return '/dashboard';
  };

  const handleHomeClick = () => {
    if (lastStore) {
      navigate(`/${lastStore.slug}`);
    } else {
      navigate('/');
    }
  };

  // Hide on cart page
  if (location.pathname === '/cart') {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg">
      <div className="flex items-center justify-around h-20 px-2">
        {/* Home/Início */}
        <button
          onClick={handleHomeClick}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors",
            isActive('/') || (lastStore && isActive(`/${lastStore.slug}`))
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs font-medium">Home</span>
        </button>

        {/* Pedidos/Transações */}
        <Link
          to="/orders"
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors",
            isActive('/orders')
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="w-6 h-6" />
          <span className="text-xs font-medium">Pedidos</span>
        </Link>

        {/* Botão Central (Carrinho) */}
        <div className="flex flex-col items-center -mt-2">
          <Link
            to="/cart"
            className="flex items-center justify-center w-16 h-16 -mt-6 rounded-full bg-gradient-primary shadow-elegant hover:shadow-glow transition-all relative"
          >
            <ShoppingCart className="w-8 h-8 text-primary-foreground" />
            {itemCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 text-xs bg-destructive"
              >
                {itemCount}
              </Badge>
            )}
          </Link>
          <span className="text-xs font-semibold text-foreground mt-1">
            {total > 0 ? `R$ ${total.toFixed(2)}` : 'R$ 0,00'}
          </span>
        </div>

        {/* Dashboard/Menu */}
        <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors",
                isActive('/dashboard') || isActive('/dashboard-lojista')
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Plus className="w-6 h-6" />
              <span className="text-xs font-medium">Menu</span>
            </button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="center"
            className="w-56 p-2 mb-2 bg-background/95 backdrop-blur-lg border-border shadow-2xl z-[100]"
          >
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={() => {
                  navigate('/cart');
                  setIsMenuOpen(false);
                }}
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Carrinho</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={() => {
                  navigate(getDashboardPath());
                  setIsMenuOpen(false);
                }}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={() => {
                  navigate('/orders');
                  setIsMenuOpen(false);
                }}
              >
                <Package className="w-5 h-5" />
                <span>Pedidos</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={() => {
                  navigate('/profile');
                  setIsMenuOpen(false);
                }}
              >
                <User className="w-5 h-5" />
                <span>Perfil</span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Configurações/Perfil */}
        <Link
          to="/profile"
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors",
            isActive('/profile')
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings className="w-6 h-6" />
          <span className="text-xs font-medium">Perfil</span>
        </Link>
      </div>
    </nav>
  );
};
