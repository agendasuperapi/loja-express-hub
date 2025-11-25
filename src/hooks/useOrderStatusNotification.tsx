import { useEffect, useRef, useCallback } from 'react';
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
  const lastVisibilityChangeRef = useRef<number>(0);
  const channelRef = useRef<any>(null);
  
  // Usar refs para evitar recriação do canal
  const queryClientRef = useRef(queryClient);
  
  useEffect(() => {
    queryClientRef.current = queryClient;
  }, [queryClient]);

  // Função debounced para invalidar queries (evita múltiplas invalidações rápidas)
  const debouncedInvalidateQueries = useCallback(() => {
    if (invalidateTimeoutRef.current) {
      clearTimeout(invalidateTimeoutRef.current);
    }
    
    invalidateTimeoutRef.current = setTimeout(() => {
      // Não invalidar se estiver pausado (modal aberto)
      if (options?.pauseInvalidations) {
        console.log('⏸️ Invalidação pausada - modal aberto');
        return;
      }
      
      queryClientRef.current.invalidateQueries({ queryKey: ['store-orders'] });
      console.log('✅ Lista de pedidos atualizada após mudança de status');
    }, 2000);
  }, [options?.pauseInvalidations]);
  
  // Rastrear mudanças de visibilidade
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        lastVisibilityChangeRef.current = Date.now();
        console.log('👁️ Página voltou ao foco, aguardando estabilização...');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!storeId) return;
    
    // Evitar recriação do canal se já existe
    if (channelRef.current) {
      console.log('📡 Canal já existe, não recriando');
      return;
    }

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
          const timeSinceVisible = Date.now() - lastVisibilityChangeRef.current;
          
          // Skip if it's a new insert (payload.old is null)
          if (!payload.old) {
            return;
          }

          console.log('[OrderStatusNotification] 📡 Evento realtime recebido:', {
            eventType: 'UPDATE',
            orderId: payload.new.id,
            orderNumber: payload.new.order_number,
            oldStatus: payload.old.status,
            newStatus: payload.new.status,
            statusChanged: payload.old.status !== payload.new.status,
            timeSinceVisible,
            willProcess: payload.old.status !== payload.new.status && timeSinceVisible >= 2000,
            timestamp: Date.now()
          });

          // Only invalidate if status actually changed
          if (payload.old.status === payload.new.status) {
            console.log('[OrderStatusNotification] ⏭️ Status não mudou, ignorando');
            return;
          }
          
          // Ignorar eventos logo após voltar ao foco (janela de 2 segundos)
          if (timeSinceVisible < 2000) {
            console.log('[OrderStatusNotification] ⏭️ Evento ignorado - janela de estabilização após foco');
            return;
          }

          // Prevenir processamento duplicado do mesmo evento
          const eventId = `${payload.new.id}-${payload.new.status}-${payload.new.updated_at}`;
          if (lastProcessedEventRef.current === eventId) {
            console.log('[OrderStatusNotification] ⏭️ Evento duplicado ignorado:', eventId);
            return;
          }
          lastProcessedEventRef.current = eventId;

          console.log('[OrderStatusNotification] ✅ Status mudou:', payload.old.status, '->', payload.new.status);
          console.log('[OrderStatusNotification] ⏱️ Agendando invalidação de queries (debounced)');
          
          // Invalidar queries com debounce para atualizar a lista automaticamente
          debouncedInvalidateQueries();
        }
      )
      .subscribe();
    
    channelRef.current = channel;

    return () => {
      if (invalidateTimeoutRef.current) {
        clearTimeout(invalidateTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [storeId, debouncedInvalidateQueries]);
};
