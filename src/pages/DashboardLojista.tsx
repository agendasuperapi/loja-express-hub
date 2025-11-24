import { Navigation } from "@/components/layout/Navigation";
import { StoreOwnerDashboard } from "@/components/dashboard/StoreOwnerDashboard";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const DashboardLojista = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/20">
      {/* Header com botão de sair */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/60 dark:bg-gray-950/60 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm"
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between md:justify-end">
          {/* Espaço vazio em mobile para o menu hambúrguer (renderizado pelo DashboardMobileSidebar) */}
          <div className="w-10 md:hidden"></div>
          
          <Button
            onClick={signOut}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </motion.header>

      <main className="container mx-auto w-full md:w-[90%] px-2 sm:px-4 pb-24 md:pb-32 pt-20 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <StoreOwnerDashboard />
        </motion.div>
      </main>
    </div>
  );
};

export default DashboardLojista;
