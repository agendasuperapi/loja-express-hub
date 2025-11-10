import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, Menu, LogOut, Package, ShoppingCart, ShieldCheck, User, Store } from "lucide-react";
import { AnimatedButton } from "@/components/ui/animated-button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect } from "react";

export const Navigation = () => {
  const { user, signOut } = useAuth();
  const { getItemCount } = useCart();
  const { hasRole } = useUserRole();
  const itemCount = getItemCount();
  const navigate = useNavigate();
  const [lastStore, setLastStore] = useState<{ slug: string; name: string } | null>(null);

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

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="hidden md:flex fixed top-0 left-0 right-0 z-50 glass border-b border-border/50"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center h-16">
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    if (lastStore) {
                      navigate(`/${lastStore.slug}`);
                    } else {
                      navigate('/');
                    }
                  }}
                >
                  <Store className="w-4 h-4 mr-2" />
                  Home
                </Button>
                <Link to="/cart">
                  <Button variant="ghost" size="sm" className="relative">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Carrinho
                    {itemCount > 0 && (
                      <Badge 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {itemCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Link to="/orders">
                  <Button variant="ghost" size="sm">
                    <Package className="w-4 h-4 mr-2" />
                    Pedidos
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="ghost" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    Perfil
                  </Button>
                </Link>
                {hasRole('admin') && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm">
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    if (lastStore) {
                      navigate(`/${lastStore.slug}`);
                    } else {
                      navigate('/');
                    }
                  }}
                >
                  <Store className="w-4 h-4 mr-2" />
                  Home
                </Button>
                <Link to="/cart">
                  <Button variant="ghost" size="sm" className="relative">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Carrinho
                    {itemCount > 0 && (
                      <Badge 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {itemCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link to="/auth">
                  <AnimatedButton size="sm" className="bg-gradient-primary">
                    Entrar / Cadastrar
                  </AnimatedButton>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="flex flex-col gap-6 mt-8">
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      if (lastStore) {
                        navigate(`/${lastStore.slug}`);
                      } else {
                        navigate('/');
                      }
                    }}
                  >
                    <Store className="w-4 h-4 mr-2" />
                    Home
                  </Button>
                  <Link to="/cart" className="block">
                    <Button variant="outline" className="w-full relative">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Carrinho
                      {itemCount > 0 && (
                        <Badge 
                          className="absolute -top-1 right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                          {itemCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                  {user ? (
                    <>
                      <Link to="/dashboard" className="block">
                        <Button variant="outline" className="w-full">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Dashboard
                        </Button>
                      </Link>
                      <Link to="/orders" className="block">
                        <Button variant="outline" className="w-full">
                          <Package className="w-4 h-4 mr-2" />
                          Pedidos
                        </Button>
                      </Link>
                      <Link to="/profile" className="block">
                        <Button variant="outline" className="w-full">
                          <User className="w-4 h-4 mr-2" />
                          Perfil
                        </Button>
                      </Link>
                      {hasRole('admin') && (
                        <Link to="/admin" className="block">
                          <Button variant="outline" className="w-full">
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            Admin
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="outline" 
                        className="w-full"
                        onClick={signOut}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair
                      </Button>
                    </>
                  ) : (
                    <Link to="/auth" className="block">
                      <Button className="w-full bg-gradient-primary">
                        Entrar / Cadastrar
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.nav>
  );
};
