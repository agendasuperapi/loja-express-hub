import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export const FloatingCartButton = () => {
  const { cart, getItemCount, getTotal, validateAndSyncCart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const controls = useAnimation();
  const isMobile = useIsMobile();
  const [shouldAnimate, setShouldAnimate] = useState(false);
  
  const itemCount = getItemCount();
  const total = getTotal();

  const handleCartClick = async () => {
    await validateAndSyncCart();
    navigate('/cart');
  };

  // Hide on cart page
  if (location.pathname === '/cart') {
    return null;
  }

  console.log('🎨 FloatingCartButton:', { itemCount, total, cartItems: cart.items.length });

  useEffect(() => {
    if (cart.items.length > 0) {
      console.log('✨ Animating button - forcing zoom');
      setShouldAnimate(true);
      
      // Trigger framer-motion animation
      controls.start({
        scale: [1, 1.3, 1],
        transition: { duration: 0.6, ease: "easeInOut" }
      });

      // Remove CSS animation class after it completes
      const timer = setTimeout(() => {
        setShouldAnimate(false);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [cart.items.length, controls]);

  if (itemCount === 0) {
    console.log('❌ FloatingCartButton: hidden (no items)');
    return null;
  }

  console.log('✅ FloatingCartButton: visible');

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-2 md:bottom-3 inset-x-0 z-50 flex justify-center px-4"
        >
          <motion.div animate={controls} className="w-full max-w-md">
            <Button
              onClick={handleCartClick}
              className={`w-full bg-gradient-primary hover:opacity-90 shadow-lg h-12 sm:h-14 text-sm sm:text-base font-semibold rounded-full border border-orange-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.6)] transition-all duration-500 ${shouldAnimate ? 'animate-pulse-cart' : ''}`}
              size="lg"
            >
              <div className="flex items-center justify-between w-full px-2 sm:px-4">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="relative">
                    <ShoppingCart className={`w-8 h-8 sm:w-6 sm:h-6 ${isMobile ? 'animate-pulse-slow' : ''}`} />
                    <motion.span
                      key={itemCount}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 bg-white text-primary text-xs font-bold rounded-full w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center"
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
    </>
  );
};
