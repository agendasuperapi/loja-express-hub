import { useEffect, useRef, useCallback } from 'react';
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

  // Obter o volume configurado (0-100)
  const volumeString = localStorage.getItem('notification-volume');
  const volume = volumeString !== null ? JSON.parse(volumeString) / 100 : 1.0;

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Frequência do bipe (Hz)
    oscillator.type = 'sine';

    // Som mais longo com padrão de dois bipes
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime + 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.9);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1.5);
  } catch (error) {
    console.error('Erro ao tocar som de notificação:', error);
  }
};

// Solicitar permissão para notificações do navegador
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('⚠️ Este navegador não suporta notificações');
    return false;
  }

  if (Notification.permission === 'granted') {
    console.log('✅ Permissão de notificação já concedida');
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('❌ Permissão de notificação negada pelo usuário');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('🔔 Resultado da solicitação de permissão:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('❌ Erro ao solicitar permissão de notificação:', error);
    return false;
  }
};

export const useNewOrderNotification = (
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
  const toastRef = useRef(toast);
  const queryClientRef = useRef(queryClient);
  
  useEffect(() => {
    toastRef.current = toast;
    queryClientRef.current = queryClient;
  }, [toast, queryClient]);

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
      console.log('✅ Lista de pedidos atualizada após novo pedido');
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
          const timeSinceVisible = Date.now() - lastVisibilityChangeRef.current;
          
          console.log('[NewOrderNotification] 📡 Evento realtime recebido:', {
            eventType: 'INSERT',
            orderId: payload.new.id,
            orderNumber: payload.new.order_number,
            timeSinceVisible,
            willProcess: timeSinceVisible >= 2000,
            timestamp: Date.now()
          });
          
          // Ignorar eventos logo após voltar ao foco (janela de 2 segundos)
          if (timeSinceVisible < 2000) {
            console.log('[NewOrderNotification] ⏭️ Evento ignorado - janela de estabilização após foco');
            return;
          }
          
          const order = payload.new as any;
          
          // Prevenir processamento duplicado
          const eventId = `${order.id}-${order.created_at}`;
          if (lastProcessedEventRef.current === eventId) {
            console.log('[NewOrderNotification] ⏭️ Evento duplicado ignorado:', eventId);
            return;
          }
          lastProcessedEventRef.current = eventId;
          
          console.log('🆕 Novo pedido recebido:', payload.new);
          
          // Tocar som de notificação
          playNotificationSound();
          
          // Mostrar toast com informações do pedido
          toastRef.current({
            title: '🔔 Novo Pedido Recebido!',
            description: `Pedido #${order.order_number} - ${order.customer_name} - R$ ${order.total.toFixed(2)}`,
            duration: 10000,
          });

          // Enviar notificação do navegador
          const browserNotificationEnabled = localStorage.getItem('browser-notification-enabled');
          const shouldShowBrowserNotification = browserNotificationEnabled !== null 
            ? JSON.parse(browserNotificationEnabled) 
            : true;

          console.log('🔔 Verificação de notificação do navegador:', {
            browserNotificationEnabled,
            shouldShowBrowserNotification,
            hasNotificationAPI: 'Notification' in window,
            permission: 'Notification' in window ? Notification.permission : 'N/A'
          });

          if (shouldShowBrowserNotification && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              try {
                const notification = new Notification('🔔 Novo Pedido Recebido!', {
                  body: `Pedido #${order.order_number}\n${order.customer_name}\nR$ ${order.total.toFixed(2)}`,
                  icon: '/favicon.ico',
                  badge: '/favicon.ico',
                  tag: `order-${order.id}`,
                  requireInteraction: true,
                  silent: false,
                });

                notification.onclick = () => {
                  window.focus();
                  notification.close();
                };

                console.log('✅ Notificação do navegador enviada com sucesso');
              } catch (error) {
                console.error('❌ Erro ao criar notificação do navegador:', error);
              }
            } else {
              console.warn('⚠️ Permissão de notificação não concedida. Status:', Notification.permission);
              if (Notification.permission === 'denied') {
                console.warn('💡 O usuário negou as notificações. Elas podem ser reativadas nas configurações do navegador.');
              }
            }
          } else {
            console.log('ℹ️ Notificações do navegador desabilitadas nas configurações ou não suportadas');
          }
          
          console.log('[NewOrderNotification] ⏱️ Agendando invalidação de queries (debounced)');
          
          // Invalidar queries com debounce para atualizar a lista automaticamente
          debouncedInvalidateQueries();
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da subscrição realtime:', status);
      });
    
    channelRef.current = channel;

    return () => {
      console.log('🔕 Encerrando escuta de novos pedidos');
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
