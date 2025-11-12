import { Navigation } from "@/components/layout/Navigation";
import { StoreOwnerDashboard } from "@/components/dashboard/StoreOwnerDashboard";
import { CustomerDashboard } from "@/components/dashboard/CustomerDashboard";
import { useUserRole } from "@/hooks/useUserRole";
import { motion } from "framer-motion";

const Dashboard = () => {
  const { hasRole, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pb-12">
          <p>Carregando...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {hasRole('store_owner') ? (
            <StoreOwnerDashboard />
          ) : hasRole('admin') ? (
            <>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <h1 className="text-5xl font-bold gradient-text mb-2">Dashboard Administrativo</h1>
                <p className="text-muted-foreground text-lg">Painel de controle do sistema</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-8 rounded-xl"
              >
                <h2 className="text-2xl font-bold mb-4">Área Administrativa</h2>
                <p>Bem-vindo à área administrativa!</p>
              </motion.div>
            </>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <h1 className="text-5xl font-bold gradient-text mb-2">Minha Dashboard</h1>
                <p className="text-muted-foreground text-lg">Acompanhe seus pedidos e favoritos</p>
              </motion.div>
              <CustomerDashboard />
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
