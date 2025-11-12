import { Home, BarChart3, MessageSquare, Mail, Bell, Settings, FolderOpen, ChevronDown, Package, FolderTree, Users, UserCog, Truck, MapPin, Bike, Tag, TrendingUp, DollarSign, ShoppingCart, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const DashboardSidebar = ({ activeTab, onTabChange }: DashboardSidebarProps) => {
  const [cadastrosOpen, setCadastrosOpen] = useState(false);
  const [homeOpen, setHomeOpen] = useState(false);

  const homeSubItems = [
    { id: 'home', label: 'dashboard', icon: Home },
    { id: 'metricas', label: 'métricas', icon: TrendingUp },
  ];

  const cadastrosSubItems = [
    { id: 'produtos', label: 'produtos', icon: Package },
    { id: 'categorias', label: 'categorias', icon: FolderTree },
    { id: 'clientes', label: 'clientes', icon: Users },
    { id: 'funcionarios', label: 'funcionários', icon: UserCog },
    { id: 'fornecedores', label: 'fornecedores', icon: Truck },
    { id: 'entregadores', label: 'entregadores', icon: Bike },
    { id: 'bairros', label: 'bairros', icon: MapPin },
    { id: 'cupons', label: 'cupons', icon: Tag },
  ];

  const menuItems = [
    { id: 'home', label: 'home', icon: Home, hasSubmenu: true },
    { id: 'cadastros', label: 'cadastros', icon: FolderOpen, hasSubmenu: true },
    { id: 'result', label: 'result', icon: BarChart3 },
    { id: 'chat', label: 'chat', icon: MessageSquare },
    { id: 'messages', label: 'messages', icon: Mail },
    { id: 'notification', label: 'notification', icon: Bell },
    { id: 'setting', label: 'setting', icon: Settings },
  ];

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-32 bg-background/95 backdrop-blur-xl border-r border-border/50 h-screen fixed left-0 top-0 flex flex-col items-center py-8 shadow-lg z-50"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-12 border border-primary/20">
        <span className="text-primary font-bold text-xl">U</span>
      </div>

      <nav className="flex-1 w-full space-y-1 px-2">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          if (item.hasSubmenu) {
            const isHomeMenu = item.id === 'home';
            const isCadastrosMenu = item.id === 'cadastros';
            const isOpen = isHomeMenu ? homeOpen : cadastrosOpen;
            const setOpen = isHomeMenu ? setHomeOpen : setCadastrosOpen;
            const subItems = isHomeMenu ? homeSubItems : cadastrosSubItems;
            
            return (
              <div key={item.id}>
                {index > 0 && <div className="h-0.5 bg-primary/20 my-2 mx-2" />}
                <Collapsible 
                  open={isOpen} 
                  onOpenChange={setOpen}
                >
                <CollapsibleTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "w-full flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg relative transition-all duration-200",
                      isOpen
                        ? "bg-primary/10 text-primary shadow-sm" 
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    {isOpen && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <Icon className={cn(
                      "w-5 h-5 relative z-10 transition-colors",
                      isOpen && "drop-shadow-sm"
                    )} />
                    <span className={cn(
                      "text-xs relative z-10 transition-colors font-medium uppercase",
                      isOpen && "font-semibold"
                    )}>
                      {item.label}
                    </span>
                    <ChevronDown className={cn(
                      "w-3 h-3 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )} />
                  </motion.button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-0.5 mt-1">
                  <AnimatePresence>
                    {subItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = activeTab === subItem.id;
                      
                      return (
                        <motion.button
                          key={subItem.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          onClick={() => onTabChange(subItem.id)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "w-full flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg relative transition-all duration-200",
                            isSubActive 
                              ? "bg-primary/15 text-primary shadow-sm" 
                              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          )}
                        >
                          {isSubActive && (
                            <motion.div
                              layoutId="activeSubTab"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-full"
                              initial={false}
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                          <SubIcon className={cn(
                            "w-4 h-4 relative z-10 transition-colors",
                            isSubActive && "drop-shadow-sm"
                          )} />
                          <span className={cn(
                            "text-[10px] relative z-10 transition-colors font-medium text-center leading-tight uppercase",
                            isSubActive && "font-semibold"
                          )}>
                            {subItem.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </CollapsibleContent>
              </Collapsible>
              </div>
            );
          }
          
          return (
            <div key={item.id}>
              {index > 0 && <div className="h-0.5 bg-primary/20 my-2 mx-2" />}
              <motion.button
              onClick={() => onTabChange(item.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "w-full flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg relative transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary shadow-sm" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon className={cn(
                "w-5 h-5 relative z-10 transition-colors",
                isActive && "drop-shadow-sm"
              )} />
              <span className={cn(
                "text-xs relative z-10 transition-colors font-medium uppercase",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </motion.button>
            </div>
          );
        })}
      </nav>
    </motion.div>
  );
};
