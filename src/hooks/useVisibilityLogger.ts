import { useEffect, useRef } from 'react';

export const useVisibilityLogger = (componentName: string) => {
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    console.log(`[${componentName}] 🚀 Montado, render #${renderCount.current}`);
    
    const handleVisibility = () => {
      console.log(`[${componentName}] 👁️ Visibilidade: ${document.visibilityState}, render #${renderCount.current}, timestamp: ${Date.now()}`);
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      console.log(`[${componentName}] 💀 Desmontado`);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [componentName]);

  return renderCount.current;
};
