import { Navigation } from "@/components/layout/Navigation";
import { StoreOwnerDashboard } from "@/components/dashboard/StoreOwnerDashboard";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const DashboardLojista = () => {
  const { signOut } = useAuth();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/20">
      {/* Header sem botão de sair */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex-shrink-0 w-full z-50 bg-white/60 dark:bg-gray-950/60 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm"
      >
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-end">
        </div>
      </motion.header>

      <main className="flex-1 w-full overflow-y-auto overflow-x-hidden">
        <div className="w-[88%] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full"
          >
            <StoreOwnerDashboard onSignOut={signOut} />
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLojista;
