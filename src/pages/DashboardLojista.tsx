import { Navigation } from "@/components/layout/Navigation";
import { StoreOwnerDashboard } from "@/components/dashboard/StoreOwnerDashboard";
import { motion } from "framer-motion";

const DashboardLojista = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pb-32">
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
