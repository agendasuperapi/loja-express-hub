import { motion } from "framer-motion";
import { ShoppingBag, Package, TrendingUp, Menu, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMenuClick: () => void;
}

export const DashboardBottomNav = ({ activeTab, onTabChange, onMenuClick }: DashboardBottomNavProps) => {
  const navItems = [
    { id: "home", label: "Início", icon: Home },
    { id: "pedidos", label: "Pedidos", icon: ShoppingBag },
    { id: "produtos", label: "Produtos", icon: Package },
    { id: "relatorios", label: "Relatórios", icon: TrendingUp },
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

              {/* Ícone com animação */}
              <motion.div
                animate={{
                  scale: isActive && !item.isMenu ? 1.1 : 1,
                  y: isActive && !item.isMenu ? -2 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Icon 
                  className={cn(
                    "w-5 h-5 transition-all",
                    isActive && !item.isMenu && "stroke-[2.5]"
                  )} 
                />
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
