import { Navigation } from "@/components/layout/Navigation";
import { CustomerDashboard } from "@/components/dashboard/CustomerDashboard";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const navigate = useNavigate();
  const { hasRole, loading } = useUserRole();
  const { user } = useAuth();

  useEffect(() => {
    const checkAccessAndRedirect = async () => {
      if (loading) return;
      
      if (hasRole('store_owner')) {
        navigate('/dashboard-lojista');
        return;
      }
      
      // Verificar se é funcionário ativo
      if (user) {
        const { data } = await supabase
          .from('store_employees' as any)
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        
        if (data) {
          navigate('/dashboard-lojista');
        }
      }
    };
    
    checkAccessAndRedirect();
  }, [loading, hasRole, user, navigate]);

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
