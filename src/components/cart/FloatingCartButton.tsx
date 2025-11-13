import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export const FloatingCartButton = () => {
  const { cart, getItemCount, getTotal } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const controls = useAnimation();
  const isMobile = useIsMobile();
  
  const itemCount = getItemCount();
  const total = getTotal();

  // Hide on cart page
  if (location.pathname === '/cart') {
    return null;
  }

  console.log('🎨 FloatingCartButton:', { itemCount, total, cartItems: cart.items.length });

  useEffect(() => {
    if (itemCount > 0) {
      console.log('✨ Animating button');
      controls.start({
        scale: [1, 1.1, 1],
        transition: { duration: 0.3 }
      });
    }
  }, [itemCount, controls]);

  if (itemCount === 0) {
    console.log('❌ FloatingCartButton: hidden (no items)');
    return null;
  }

  console.log('✅ FloatingCartButton: visible');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-2 md:bottom-3 inset-x-0 z-50 flex justify-center px-4"
      >
        <motion.div animate={controls} className={`w-full max-w-md ${isMobile ? 'animate-pulse' : ''}`}>
          <Button
            onClick={() => navigate('/cart')}
            className="w-full bg-gradient-primary hover:opacity-90 shadow-lg h-12 sm:h-14 text-sm sm:text-base font-semibold rounded-full border-2 border-orange-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.6)] transition-all duration-500"
            size="lg"
          >
            <div className="flex items-center justify-between w-full px-2 sm:px-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="relative">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-white text-primary text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"
                  >
                    {itemCount}
                  </motion.span>
                </div>
                <span className="whitespace-nowrap">Ver Carrinho</span>
              </div>
              <motion.span
                key={total}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-bold whitespace-nowrap"
              >
                R$ {total.toFixed(2)}
              </motion.span>
            </div>
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
