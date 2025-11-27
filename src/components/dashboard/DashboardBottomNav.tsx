import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Package, TrendingUp, Menu, Home, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface DashboardBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMenuClick: () => void;
  pendingOrdersCount?: number;
}

export const DashboardBottomNav = ({ activeTab, onTabChange, onMenuClick, pendingOrdersCount = 0 }: DashboardBottomNavProps) => {
  const [showRelatoriosMenu, setShowRelatoriosMenu] = useState(false);
  const relatoriosButtonRef = useRef<HTMLButtonElement>(null);

  const navItems = [
    { id: "home", label: "Início", icon: Home },
    { id: "produtos", label: "Produtos", icon: Package },
    { id: "pedidos", label: "Pedidos", icon: ShoppingBag },
    { id: "relatorios", label: "Relatórios", icon: TrendingUp, isRelatorios: true },
    { id: "menu", label: "Menu", icon: Menu, isMenu: true },
  ];

  const relatoriosSubmenus = [
    { id: "relatorio-clientes", label: "Clientes", icon: Users },
    { id: "relatorio-produtos-vendidos", label: "Mais Vendidos", icon: TrendingUp },
    { id: "relatorio-produtos-cadastrados", label: "Produtos", icon: Package },
    { id: "relatorio-pedidos", label: "Pedidos", icon: ShoppingBag },
  ];

  const handleClick = (item: typeof navItems[0]) => {
    if (item.isMenu) {
      onMenuClick();
    } else if (item.isRelatorios) {
      setShowRelatoriosMenu(!showRelatoriosMenu);
    } else {
      onTabChange(item.id);
    }
  };

  const handleRelatorioClick = (id: string) => {
    onTabChange(id);
    setShowRelatoriosMenu(false);
  };

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (relatoriosButtonRef.current && !relatoriosButtonRef.current.contains(event.target as Node)) {
        setShowRelatoriosMenu(false);
      }
    };

    if (showRelatoriosMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRelatoriosMenu]);

  return (
    <>
      {/* Menu popup de Relatórios */}
      <AnimatePresence>
        {showRelatoriosMenu && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] w-[90vw] max-w-xs"
          >
            <div className="bg-background border border-border rounded-lg shadow-2xl overflow-hidden">
              {relatoriosSubmenus.map((submenu, index) => {
                const SubmenuIcon = submenu.icon;
                const isActive = activeTab === submenu.id;
                
                return (
                  <button
                    key={submenu.id}
                    onClick={() => handleRelatorioClick(submenu.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 transition-colors",
                      "hover:bg-muted/50 active:bg-muted",
                      isActive && "bg-primary/10 text-primary font-medium",
                      index !== relatoriosSubmenus.length - 1 && "border-b border-border"
                    )}
                  >
                    <SubmenuIcon className="w-5 h-5" />
                    <span className="text-sm">{submenu.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border shadow-lg safe-area-inset-bottom"
      >
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                ref={item.isRelatorios ? relatoriosButtonRef : null}
                onClick={() => handleClick(item)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 relative transition-colors",
                  "active:scale-95 transition-transform duration-100",
                  isActive && !item.isMenu && !item.isRelatorios ? "text-primary" : "text-muted-foreground"
                )}
              >
              {/* Indicador de aba ativa */}
              {isActive && !item.isMenu && !item.isRelatorios && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-b-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}

              {/* Ícone com animação e badge */}
              <motion.div
                animate={{
                  scale: isActive && !item.isMenu && !item.isRelatorios ? 1.1 : 1,
                  y: isActive && !item.isMenu && !item.isRelatorios ? -2 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="relative"
              >
                <Icon 
                  className={cn(
                    "w-5 h-5 transition-all",
                    isActive && !item.isMenu && !item.isRelatorios && "stroke-[2.5]"
                  )} 
                />
                
                {/* Badge de contagem de pedidos */}
                {item.id === "pedidos" && pendingOrdersCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="absolute -top-1 -right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1 shadow-lg"
                  >
                    {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
                  </motion.div>
                )}
              </motion.div>

              {/* Label */}
              <span 
                className={cn(
                  "text-[10px] font-medium transition-all",
                  isActive && !item.isMenu && !item.isRelatorios && "font-semibold"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

        {/* Barra de segurança inferior para iOS */}
        <div className="h-safe-area-inset-bottom bg-background/95" />
      </motion.nav>
    </>
  );
};
