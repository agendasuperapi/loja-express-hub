import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// Web Audio API para gerar bipe de notificação
const playNotificationSound = () => {
  // Verificar se o som está habilitado nas configurações
  const soundEnabled = localStorage.getItem('notification-sound-enabled');
  if (soundEnabled !== null && !JSON.parse(soundEnabled)) {
    return;
  }

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

// Solicitar permissão para notificações do navegador
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

export const useNewOrderNotification = (storeId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!storeId) return;

    // Solicitar permissão para notificações
    requestNotificationPermission();

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

          // Enviar notificação do navegador
          const browserNotificationEnabled = localStorage.getItem('browser-notification-enabled');
          const shouldShowBrowserNotification = browserNotificationEnabled !== null 
            ? JSON.parse(browserNotificationEnabled) 
            : true;

          if (shouldShowBrowserNotification && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('🔔 Novo Pedido Recebido!', {
              body: `Pedido #${order.order_number}\n${order.customer_name}\nR$ ${order.total.toFixed(2)}`,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: `order-${order.id}`,
              requireInteraction: true,
            });
          }
          
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
