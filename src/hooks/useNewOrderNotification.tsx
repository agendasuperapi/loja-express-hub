import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// Web Audio API para gerar bipe de notificação
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Frequência do bipe (Hz)
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Erro ao tocar som de notificação:', error);
  }
};

export const useNewOrderNotification = (storeId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!storeId) return;

    console.log('🔔 Iniciando escuta de novos pedidos para loja:', storeId);

    // Subscrever apenas a eventos INSERT de novos pedidos
    const channel = supabase
      .channel('new-orders-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`
        },
        async (payload) => {
          console.log('🆕 Novo pedido recebido:', payload.new);
          
          const order = payload.new as any;
          
          // Tocar som de notificação
          playNotificationSound();
          
          // Mostrar toast com informações do pedido
          toast({
            title: '🔔 Novo Pedido Recebido!',
            description: `Pedido #${order.order_number} - ${order.customer_name} - R$ ${order.total.toFixed(2)}`,
            duration: 10000,
          });
          
          // Invalidar queries para atualizar a lista automaticamente
          queryClient.invalidateQueries({ queryKey: ['store-orders'] });
          
          console.log('✅ Notificação processada e lista atualizada');
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da subscrição realtime:', status);
      });

    return () => {
      console.log('🔕 Encerrando escuta de novos pedidos');
      supabase.removeChannel(channel);
    };
  }, [storeId, toast, queryClient]);
};
