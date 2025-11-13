import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStoreManagement } from "@/hooks/useStoreManagement";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { toast } from "@/hooks/use-toast";

const DashboardLojista = () => {
  const { signOut } = useAuth();
  const { myStore } = useStoreManagement();
  const [activeTab, setActiveTab] = useState('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'cupons':
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Sistema de cupons em manutenção
            </p>
            <p className="text-sm text-muted-foreground">
              Execute o arquivo create_coupons_system.sql no Supabase SQL Editor para ativar esta funcionalidade
            </p>
          </div>
        );
      default:
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Selecione uma opção no menu lateral
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Sidebar */}
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        storeLogo={myStore?.logo_url}
        storeName={myStore?.name}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm"
        >
          <div className="container mx-auto px-4 h-16 flex items-center justify-end">
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

        {/* Content */}
        <main className="flex-1 container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {renderContent()}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLojista;
