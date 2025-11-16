import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollableTableProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export const ScrollableTable = ({ children, className, maxHeight = "h-[400px] sm:h-[600px]" }: ScrollableTableProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  const checkScroll = () => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollLeft, scrollWidth, clientWidth } = element;
    
    setShowLeftShadow(scrollLeft > 0);
    setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    checkScroll();
    
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(element);

    element.addEventListener("scroll", checkScroll);

    return () => {
      resizeObserver.disconnect();
      element.removeEventListener("scroll", checkScroll);
    };
  }, []);

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
