import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Som de notificação para ganhos do afiliado
const playEarningsSound = () => {
  const soundEnabled = localStorage.getItem('notification-sound-enabled');
  if (soundEnabled !== null && !JSON.parse(soundEnabled)) {
    return;
  }

  const volumeString = localStorage.getItem('notification-volume');
  const volume = volumeString !== null ? JSON.parse(volumeString) / 100 : 0.7;

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Som de "dinheiro" - dois toques ascendentes
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.15);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume * 0.6, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Erro ao tocar som de ganhos:', error);
  }
};

interface UseAffiliateEarningsNotificationOptions {
  storeAffiliateIds: string[];
  onNewEarning?: () => void;
}

export const useAffiliateEarningsNotification = ({
  storeAffiliateIds,
  onNewEarning
}: UseAffiliateEarningsNotificationOptions) => {
  const channelRef = useRef<any>(null);
  const lastProcessedRef = useRef<string>('');
  const onNewEarningRef = useRef(onNewEarning);

  useEffect(() => {
    onNewEarningRef.current = onNewEarning;
  }, [onNewEarning]);

  useEffect(() => {
    if (!storeAffiliateIds.length) return;
    if (channelRef.current) return;

    console.log('💰 Iniciando escuta de ganhos para afiliado:', storeAffiliateIds);

    const channel = supabase
      .channel('affiliate-earnings-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'affiliate_earnings'
        },
        async (payload) => {
          const earning = payload.new as any;
          
          // Verificar se é para este afiliado
          if (!earning.store_affiliate_id || !storeAffiliateIds.includes(earning.store_affiliate_id)) {
            return;
          }

          // Evitar duplicatas
          const eventId = `${earning.id}-${earning.created_at}`;
          if (lastProcessedRef.current === eventId) return;
          lastProcessedRef.current = eventId;

          // Buscar nome da loja
          const { data: storeAffiliate } = await supabase
            .from('store_affiliates')
            .select('store_id')
            .eq('id', earning.store_affiliate_id)
            .single();

          let storeName = 'Loja';
          if (storeAffiliate) {
            const { data: store } = await supabase
              .from('stores')
              .select('name')
              .eq('id', storeAffiliate.store_id)
              .single();
            storeName = store?.name || 'Loja';
          }

          const commissionAmount = earning.commission_amount || 0;

          console.log('💰 Nova comissão recebida:', {
            storeName,
            commissionAmount,
            orderId: earning.order_id
          });

          // Tocar som
          playEarningsSound();

          // Mostrar toast com sonner
          toast.success('💰 Nova Comissão Recebida!', {
            description: `${storeName} - R$ ${commissionAmount.toFixed(2)}`,
            duration: 8000,
          });

          // Callback para atualizar dados
          if (onNewEarningRef.current) {
            onNewEarningRef.current();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da subscrição de ganhos:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('🔕 Encerrando escuta de ganhos');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [storeAffiliateIds]);
};
