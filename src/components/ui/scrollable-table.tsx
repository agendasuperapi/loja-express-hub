import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { MoveHorizontal } from "lucide-react";

interface ScrollableTableProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export const ScrollableTable = ({ children, className, maxHeight = "h-[400px] sm:h-[600px]" }: ScrollableTableProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);
  const [showSwipeIndicator, setShowSwipeIndicator] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);
  const isMobile = useIsMobile();

  const checkScroll = () => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollLeft, scrollWidth, clientWidth } = element;
    
    setShowLeftShadow(scrollLeft > 0);
    setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1);
    
    // Hide swipe indicator after user scrolls
    if (scrollLeft > 0 && !hasScrolled) {
      setHasScrolled(true);
      setShowSwipeIndicator(false);
    }
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    checkScroll();
    
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(element);

    element.addEventListener("scroll", checkScroll);

    // Auto-hide swipe indicator after 4 seconds
    const timer = setTimeout(() => {
      setShowSwipeIndicator(false);
    }, 4000);

    return () => {
      resizeObserver.disconnect();
      element.removeEventListener("scroll", checkScroll);
      clearTimeout(timer);
    };
  }, []);

  // Show swipe indicator only on mobile and when there's horizontal scroll
  const shouldShowSwipeIndicator = isMobile && showSwipeIndicator && showRightShadow;

  return (
    <div className="relative">
      {/* Sombra esquerda */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-10 transition-opacity duration-300",
          "bg-gradient-to-r from-background to-transparent",
          showLeftShadow ? "opacity-100" : "opacity-0"
        )}
      />
      
      {/* Sombra direita */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10 transition-opacity duration-300",
          "bg-gradient-to-l from-background to-transparent",
          showRightShadow ? "opacity-100" : "opacity-0"
        )}
      />
      
      {/* Indicador de swipe para mobile */}
      {shouldShowSwipeIndicator && (
        <div className="absolute bottom-4 right-4 z-20 pointer-events-none animate-fade-in">
          <div className="bg-primary text-primary-foreground px-3 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
            <MoveHorizontal className="h-4 w-4" />
            <span className="text-xs font-medium">Deslize</span>
          </div>
        </div>
      )}
      
      <div
        ref={scrollRef}
        className={cn("overflow-auto", maxHeight, className)}
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain'
        }}
      >
        {children}
      </div>
    </div>
  );
};
