import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { CartProvider } from "./contexts/CartContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { StoreAccessRoute } from "./components/auth/StoreAccessRoute";
import { MobileBottomNav } from "./components/layout/MobileBottomNav";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import DashboardLojista from "./pages/DashboardLojista";
import Profile from "./pages/Profile";
import StoreDetails from "./pages/StoreDetails";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import BecomePartner from "./pages/BecomePartner";
import LoginLojista from "./pages/LoginLojista";
import AdminDashboard from "./pages/AdminDashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProductPage from "./pages/ProductPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <CartProvider>
          <div className="pb-20 md:pb-0">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard-lojista" 
                element={
                  // Permite acesso para dono da loja OU funcionário ativo
                  <StoreAccessRoute redirectPath="/login-lojista">
                    <DashboardLojista />
                  </StoreAccessRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route path="/cart" element={<Cart />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/become-partner" element={<BecomePartner />} />
              <Route path="/login-lojista" element={<LoginLojista />} />
              <Route
                path="/admin" 
                element={
                  <ProtectedRoute requireAuth={true} requireRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              {/* Rotas específicas devem vir ANTES das rotas genéricas */}
              <Route path="/p/:shortId" element={<ProductPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "/:slug" ROUTE */}
              <Route path="/:slug" element={<StoreDetails />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <MobileBottomNav />
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
