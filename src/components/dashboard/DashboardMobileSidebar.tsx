import { Home, Package, ShoppingCart, MessageSquare, Settings, FolderOpen, FileBarChart, TrendingUp, Tag, FolderTree, UserCog, Users, Store, Truck, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { EmployeePermissions } from "@/hooks/useStoreEmployees";
import { cn } from "@/lib/utils";

interface DashboardMobileSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  storeLogo?: string;
  storeName?: string;
  isEmployee?: boolean;
  employeePermissions?: EmployeePermissions | null;
  onSignOut?: () => void;
}

export const DashboardMobileSidebar = ({
  activeTab,
  onTabChange,
  storeLogo,
  storeName,
  isEmployee,
  employeePermissions,
  onSignOut,
}: DashboardMobileSidebarProps) => {
  const [open, setOpen] = useState(false);
  const [cadastrosOpen, setCadastrosOpen] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(false);

  const hasPermission = (module: string, action: string = 'view'): boolean => {
    if (!isEmployee || !employeePermissions) return true;
    
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
    ...(!isEmployee ? [{ id: 'funcionarios', label: 'funcionários', icon: UserCog }] : []),
  ];

  const relatoriosSubItems = [
    ...(hasPermission('reports') ? [{ id: 'relatorio-clientes', label: 'clientes', icon: Users }] : []),
    ...(hasPermission('reports') ? [{ id: 'relatorio-produtos-vendidos', label: 'mais vendidos', icon: TrendingUp }] : []),
    ...(hasPermission('reports') ? [{ id: 'relatorio-produtos-cadastrados', label: 'produtos', icon: Package }] : []),
    ...(hasPermission('reports') ? [{ id: 'relatorio-pedidos', label: 'pedidos', icon: ShoppingCart }] : []),
  ];

  const handleNavigation = (tab: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onTabChange(tab);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed top-4 left-4 z-50"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <div className="flex flex-col h-full bg-background">
          {/* Logo */}
          <SheetHeader className="p-6 pb-4">
            <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden mx-auto mb-2">
              {storeLogo ? (
                <img 
                  src={storeLogo} 
                  alt={storeName || 'Logo da loja'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="w-10 h-10 text-primary" />
              )}
            </div>
            {storeName && (
              <SheetTitle className="text-center text-sm font-medium text-muted-foreground">
                {storeName}
              </SheetTitle>
            )}
          </SheetHeader>

          {/* Menu Items */}
          <nav className="flex-1 px-4 pb-4 space-y-2 overflow-y-auto">
            {/* Home */}
            <Button
              variant={activeTab === 'home' ? 'default' : 'ghost'}
              className="w-full justify-start gap-3 h-12"
              onClick={() => handleNavigation('home')}
            >
              <Home className="w-5 h-5" />
              <span className="capitalize">Home</span>
            </Button>

            {/* Métricas */}
            {hasPermission('reports') && (
              <Button
                variant={activeTab === 'metricas' ? 'default' : 'ghost'}
                className="w-full justify-start gap-3 h-12"
                onClick={() => handleNavigation('metricas')}
              >
                <TrendingUp className="w-5 h-5" />
                <span className="capitalize">Métricas</span>
              </Button>
            )}

            {/* Pedidos */}
            {hasPermission('orders') && (
              <Button
                variant={activeTab === 'pedidos' ? 'default' : 'ghost'}
                className="w-full justify-start gap-3 h-12"
                onClick={() => handleNavigation('pedidos')}
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="capitalize">Pedidos</span>
              </Button>
            )}

            {/* Relatórios */}
            {relatoriosSubItems.length > 0 && (
              <Collapsible open={relatoriosOpen} onOpenChange={setRelatoriosOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-12"
                  >
                    <div className="flex items-center gap-3">
                      <FileBarChart className="w-5 h-5" />
                      <span className="capitalize">Relatórios</span>
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform",
                      relatoriosOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 space-y-1 mt-1">
                  {relatoriosSubItems.map((item) => (
                    <Button
                      key={item.id}
                      variant={activeTab === item.id ? 'default' : 'ghost'}
                      className="w-full justify-start gap-3 h-10"
                      onClick={() => handleNavigation(item.id)}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="capitalize text-sm">{item.label}</span>
                    </Button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Cadastros */}
            {cadastrosSubItems.length > 0 && (
              <Collapsible open={cadastrosOpen} onOpenChange={setCadastrosOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-12"
                  >
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-5 h-5" />
                      <span className="capitalize">Cadastros</span>
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform",
                      cadastrosOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 space-y-1 mt-1">
                  {cadastrosSubItems.map((item) => (
                    <Button
                      key={item.id}
                      variant={activeTab === item.id ? 'default' : 'ghost'}
                      className="w-full justify-start gap-3 h-10"
                      onClick={() => handleNavigation(item.id)}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="capitalize text-sm">{item.label}</span>
                    </Button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* WhatsApp */}
            {hasPermission('settings', 'manage_whatsapp') && (
              <Button
                variant={activeTab === 'whatsapp' ? 'default' : 'ghost'}
                className="w-full justify-start gap-3 h-12"
                onClick={() => handleNavigation('whatsapp')}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="capitalize">WhatsApp</span>
              </Button>
            )}

            {/* Configurações */}
            {hasPermission('settings') && (
              <Button
                variant={activeTab === 'result' ? 'default' : 'ghost'}
                className="w-full justify-start gap-3 h-12"
                onClick={() => handleNavigation('result')}
              >
                <Settings className="w-5 h-5" />
                <span className="capitalize">Configurações</span>
              </Button>
            )}

            {/* Botão Sair */}
            {onSignOut && (
              <>
                <div className="h-px bg-border my-2" />
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    onSignOut();
                    setOpen(false);
                  }}
                >
                  <LogOut className="w-5 h-5" />
                  <span className="capitalize">Sair</span>
                </Button>
              </>
            )}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
};
