import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const useOrderStatusNotification = (
  storeId: string | undefined, 
  options?: { pauseInvalidations?: boolean }
) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const invalidateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastProcessedEventRef = useRef<string>('');

  // Função debounced para invalidar queries (evita múltiplas invalidações rápidas)
  const debouncedInvalidateQueries = () => {
    if (invalidateTimeoutRef.current) {
      clearTimeout(invalidateTimeoutRef.current);
    }
    
    invalidateTimeoutRef.current = setTimeout(() => {
      // Não invalidar se estiver pausado (modal aberto)
      if (options?.pauseInvalidations) {
        console.log('⏸️ Invalidação pausada - modal aberto');
        return;
      }
      
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });
      console.log('✅ Lista de pedidos atualizada após mudança de status');
    }, 2000); // Debounce de 2 segundos
  };

  useEffect(() => {
    if (!storeId) return;

    // Subscribe to order status changes to invalidate queries only
    const channel = supabase
      .channel('order-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`
        },
        async (payload) => {
          // Skip if it's a new insert (payload.old is null)
          if (!payload.old) {
            return;
          }

          // Only invalidate if status actually changed
          if (payload.old.status === payload.new.status) return;

          // Prevenir processamento duplicado do mesmo evento
          const eventId = `${payload.new.id}-${payload.new.status}-${payload.new.updated_at}`;
          if (lastProcessedEventRef.current === eventId) {
            console.log('⏭️ Evento duplicado ignorado:', eventId);
            return;
          }
          lastProcessedEventRef.current = eventId;

          console.log('Order status changed:', payload.old.status, '->', payload.new.status);
          
          // Invalidar queries com debounce para atualizar a lista automaticamente
          debouncedInvalidateQueries();
        }
      )
      .subscribe();

    return () => {
      if (invalidateTimeoutRef.current) {
        clearTimeout(invalidateTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [storeId, toast, queryClient]);
};
