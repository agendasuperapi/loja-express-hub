import { Home, BarChart3, MessageSquare, Mail, Bell, Settings, FolderOpen, ChevronDown, Package, FolderTree, Users, UserCog, Truck, MapPin, Bike, Tag, TrendingUp, DollarSign, ShoppingCart, Calendar, FileBarChart, FileText, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { EmployeePermissions } from "@/hooks/useStoreEmployees";
import { Badge } from "@/components/ui/badge";

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  storeLogo?: string;
  storeName?: string;
  isEmployee?: boolean;
  employeePermissions?: EmployeePermissions | null;
  onSignOut?: () => void;
}

export const DashboardSidebar = ({ activeTab, onTabChange, storeLogo, storeName, isEmployee, employeePermissions, onSignOut }: DashboardSidebarProps) => {
  const [cadastrosOpen, setCadastrosOpen] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(false);

  const handleTabChange = (tab: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onTabChange(tab);
  };

  // Função para verificar se o funcionário tem permissão
  const hasPermission = (module: string, action: string = 'view'): boolean => {
    if (!isEmployee || !employeePermissions) return true; // Donos de loja veem tudo
    
    const modulePermissions = (employeePermissions as any)[module];
    if (!modulePermissions) return false;
    
    return modulePermissions[action] === true;
  };

  const cadastrosSubItems = [
    ...(hasPermission('products', 'view') 
      ? [{ id: 'produtos', label: 'produtos', icon: Package }] 
      : []),
    ...(hasPermission('coupons', 'view') 
      ? [{ id: 'cupons', label: 'cupons', icon: Tag }] 
      : []),
    // Funcionários só são visíveis para donos de loja
    ...(!isEmployee ? [{ id: 'funcionarios', label: 'funcionários', icon: UserCog }] : []),
  ];

  const relatoriosSubItems = [
    ...(hasPermission('reports') ? [{ id: 'relatorio-clientes', label: 'clientes', icon: Users }] : []),
    ...(hasPermission('reports') ? [{ id: 'relatorio-produtos-vendidos', label: 'mais vendidos', icon: TrendingUp }] : []),
    ...(hasPermission('reports') ? [{ id: 'relatorio-produtos-cadastrados', label: 'produtos', icon: Package }] : []),
    ...(hasPermission('reports') ? [{ id: 'relatorio-pedidos', label: 'pedidos', icon: ShoppingCart }] : []),
  ];
  
  console.log('[DashboardSidebar] Cadastros SubItems:', {
    products: hasPermission('products', 'view'),
    coupons: hasPermission('coupons', 'view'),
    categories: hasPermission('categories', 'view'),
    isEmployee,
    cadastrosSubItems: cadastrosSubItems.map(i => i.id),
    employeePermissions
  });

  const menuItems = [
    { id: 'home', label: 'home', icon: Home, show: true },
    ...(hasPermission('reports') ? [{ id: 'metricas', label: 'métricas', icon: TrendingUp, show: true }] : []),
    ...(hasPermission('orders') ? [{ id: 'pedidos', label: 'pedidos', icon: ShoppingCart, show: true }] : []),
    ...(relatoriosSubItems.length > 0 ? [{ id: 'relatorios', label: 'relatórios', icon: FileBarChart, hasSubmenu: true, show: true }] : []),
    ...(cadastrosSubItems.length > 0 ? [{ id: 'cadastros', label: 'cadastros', icon: FolderOpen, hasSubmenu: true, show: true }] : []),
    ...(hasPermission('settings', 'manage_whatsapp') ? [{ id: 'whatsapp', label: 'whatsapp', icon: MessageSquare, show: true }] : []),
    ...(hasPermission('settings') ? [{ id: 'result', label: 'configurações', icon: Settings, show: true }] : []),
  ].filter(item => item.show);

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="hidden md:flex w-[120px] bg-gray-50 dark:bg-gray-900 backdrop-blur-xl border-2 border-gray-300 dark:border-gray-700 h-screen sticky top-0 flex-col items-center py-4 shadow-lg overflow-y-hidden"
    >
      <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center mb-3 border border-primary/20 overflow-hidden flex-shrink-0">
        {storeLogo ? (
          <img 
            src={storeLogo} 
            alt={storeName || 'Logo da loja'} 
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-primary font-bold text-3xl">U</span>
        )}
      </div>
      
      {isEmployee && (
        <Badge variant="secondary" className="mb-3 text-xs">
          Funcionário
        </Badge>
      )}

      <nav className="flex-1 w-full space-y-1 px-3 overflow-y-hidden min-h-0">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          if (item.hasSubmenu) {
            const isOpen = item.id === 'cadastros' ? cadastrosOpen : relatoriosOpen;
            const setOpen = item.id === 'cadastros' ? setCadastrosOpen : setRelatoriosOpen;
            const subItems = item.id === 'cadastros' ? cadastrosSubItems : relatoriosSubItems;
            
            return (
              <div key={item.id}>
                {index > 0 && <div className="h-0.5 bg-primary/20 my-1.5 mx-2" />}
                <Collapsible 
                  open={isOpen} 
                  onOpenChange={setOpen}
                >
                <CollapsibleTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "w-full flex flex-col items-center gap-2 py-3 px-2 rounded-lg relative transition-all duration-200",
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
                
                <CollapsibleContent className="space-y-1 mt-1">
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
                          onClick={() => handleTabChange(subItem.id)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "w-full flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg relative transition-all duration-200",
                            isSubActive 
                              ? "bg-primary/15 text-primary shadow-sm" 
                              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          )}
                        >
                          {isSubActive && (
                            <motion.div
                              layoutId="activeSubTab"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 bg-primary rounded-r-full"
                              initial={false}
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                          <SubIcon className={cn(
                            "w-4.5 h-4.5 relative z-10 transition-colors",
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
              {index > 0 && <div className="h-0.5 bg-primary/20 my-1.5 mx-2" />}
              <motion.button
              onClick={() => handleTabChange(item.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "w-full flex flex-col items-center gap-2 py-3 px-2 rounded-lg relative transition-all duration-200",
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

      {/* Botão Sair no final */}
      {onSignOut && (
        <div className="px-3 pb-3 pt-2 flex-shrink-0">
          <div className="h-0.5 bg-primary/20 my-1.5 mx-2" />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSignOut}
            className="w-full flex flex-col items-center gap-2 py-3 px-2 rounded-lg text-destructive hover:bg-destructive/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-xs font-medium uppercase">Sair</span>
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};
