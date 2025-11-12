import { Home, BarChart3, MessageSquare, Mail, Bell, Settings, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const DashboardSidebar = ({ activeTab, onTabChange }: DashboardSidebarProps) => {
  const menuItems = [
    { id: 'home', label: 'home', icon: Home },
    { id: 'cadastros', label: 'cadastros', icon: FolderOpen },
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
      className="w-20 bg-background/95 backdrop-blur-xl border-r border-border/50 h-screen fixed left-0 top-0 flex flex-col items-center py-8 shadow-lg z-50"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-12 border border-primary/20">
        <span className="text-primary font-bold text-xl">U</span>
      </div>

      <nav className="flex-1 w-full space-y-1 px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <motion.button
              key={item.id}
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
                "text-[10px] relative z-10 transition-colors font-medium",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </motion.div>
  );
};
