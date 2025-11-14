import { Home, ShoppingCart, Plus, Settings, TrendingUp, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface DashboardMobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  ordersCount?: number;
}

export const DashboardMobileNav = ({ activeTab, onTabChange, ordersCount = 0 }: DashboardMobileNavProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (tab: string) => activeTab === tab;

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setIsMenuOpen(false);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg">
      <div className="flex items-center justify-around h-20 px-2">
        {/* Home */}
        <button
          onClick={() => handleTabChange('home')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors",
            isActive('home')
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs font-medium">Home</span>
        </button>

        {/* Pedidos */}
        <button
          onClick={() => handleTabChange('pedidos')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors relative",
            isActive('pedidos')
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="w-6 h-6" />
          {ordersCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary"
            >
              {ordersCount}
            </Badge>
          )}
          <span className="text-xs font-medium">Pedidos</span>
        </button>

        {/* Botão Central - Menu Principal */}
        <div className="flex flex-col items-center -mt-2">
          <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center justify-center w-16 h-16 -mt-6 rounded-full bg-gradient-primary shadow-elegant hover:shadow-glow transition-all">
                <Plus className="w-8 h-8 text-primary-foreground" />
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
                  onClick={() => handleTabChange('cadastros')}
                >
                  <Plus className="w-5 h-5" />
                  <span>Cadastros</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => handleTabChange('relatorios')}
                >
                  <TrendingUp className="w-5 h-5" />
                  <span>Relatórios</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => handleTabChange('whatsapp')}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>WhatsApp</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <span className="text-xs font-semibold text-foreground mt-1">Menu</span>
        </div>

        {/* Métricas */}
        <button
          onClick={() => handleTabChange('metricas')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors",
            isActive('metricas')
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp className="w-6 h-6" />
          <span className="text-xs font-medium">Métricas</span>
        </button>

        {/* Configurações */}
        <button
          onClick={() => handleTabChange('result')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors",
            isActive('result')
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings className="w-6 h-6" />
          <span className="text-xs font-medium">Config</span>
        </button>
      </div>
    </nav>
  );
};
