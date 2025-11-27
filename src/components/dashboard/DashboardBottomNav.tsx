import { motion } from "framer-motion";
import { ShoppingBag, Package, TrendingUp, Menu, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMenuClick: () => void;
  pendingOrdersCount?: number;
}

export const DashboardBottomNav = ({ activeTab, onTabChange, onMenuClick, pendingOrdersCount = 0 }: DashboardBottomNavProps) => {
  const navItems = [
    { id: "home", label: "Início", icon: Home },
    { id: "produtos", label: "Produtos", icon: Package },
    { id: "pedidos", label: "Pedidos", icon: ShoppingBag },
    { id: "relatorios", label: "Relatórios", icon: TrendingUp, isMenu: true },
    { id: "menu", label: "Menu", icon: Menu, isMenu: true },
  ];

  return (
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
              onClick={() => item.isMenu ? onMenuClick() : onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 relative transition-colors",
                "active:scale-95 transition-transform duration-100",
                isActive && !item.isMenu ? "text-primary" : "text-muted-foreground"
              )}
            >
              {/* Indicador de aba ativa */}
              {isActive && !item.isMenu && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-b-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}

              {/* Ícone com animação e badge */}
              <motion.div
                animate={{
                  scale: isActive && !item.isMenu ? 1.1 : 1,
                  y: isActive && !item.isMenu ? -2 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="relative"
              >
                <Icon 
                  className={cn(
                    "w-5 h-5 transition-all",
                    isActive && !item.isMenu && "stroke-[2.5]"
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
                  isActive && !item.isMenu && "font-semibold"
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
  );
};
