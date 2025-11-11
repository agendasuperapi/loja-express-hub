import { Home, BarChart3, MessageSquare, Mail, Bell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const DashboardSidebar = ({ activeTab, onTabChange }: DashboardSidebarProps) => {
  const menuItems = [
    { id: 'home', label: 'home', icon: Home },
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
      className="w-28 bg-gradient-to-b from-primary via-primary-hover to-accent h-screen fixed left-0 top-0 flex flex-col items-center py-8 shadow-xl z-50"
    >
      <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-12 shadow-lg">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden">
          <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-xl">U</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 w-full space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "w-full flex flex-col items-center gap-2 py-4 px-2 relative transition-all",
                isActive && "bg-white/20 shadow-lg"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white/20 rounded-r-xl"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon className={cn(
                "w-6 h-6 relative z-10 transition-colors",
                isActive ? "text-white" : "text-white/70"
              )} />
              <span className={cn(
                "text-xs relative z-10 transition-colors",
                isActive ? "text-white font-medium" : "text-white/70"
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
