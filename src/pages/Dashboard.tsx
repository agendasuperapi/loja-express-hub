import { Navigation } from "@/components/layout/Navigation";
import { CustomerDashboard } from "@/components/dashboard/CustomerDashboard";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

const Dashboard = () => {
  const navigate = useNavigate();
  const { hasRole, loading } = useUserRole();

  useEffect(() => {
    if (!loading && hasRole('store_owner')) {
      navigate('/dashboard-lojista');
    }
  }, [loading, hasRole, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <CustomerDashboard />
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
