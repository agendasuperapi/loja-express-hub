import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// Som de notificação para comissão (mais suave que pedido)
const playCommissionSound = () => {
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

    // Som mais agudo e curto para comissão
    oscillator.frequency.value = 1000;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume * 0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Erro ao tocar som de comissão:', error);
  }
};

export const useAffiliateCommissionNotification = (storeId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);
  const lastProcessedRef = useRef<string>('');
  const toastRef = useRef(toast);
  const queryClientRef = useRef(queryClient);

  useEffect(() => {
    toastRef.current = toast;
    queryClientRef.current = queryClient;
  }, [toast, queryClient]);

  const invalidateQueries = useCallback(() => {
    queryClientRef.current.invalidateQueries({ queryKey: ['affiliates'] });
    queryClientRef.current.invalidateQueries({ queryKey: ['affiliate-earnings'] });
  }, []);

  useEffect(() => {
    if (!storeId) return;
    if (channelRef.current) return;

    console.log('🎯 Iniciando escuta de comissões de afiliados para loja:', storeId);

    const channel = supabase
      .channel('affiliate-commission-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'affiliate_earnings'
        },
        async (payload) => {
          const earning = payload.new as any;
          
          // Evitar duplicatas
          const eventId = `${earning.id}-${earning.created_at}`;
          if (lastProcessedRef.current === eventId) return;
          lastProcessedRef.current = eventId;

          // Verificar se é da loja correta buscando o store_affiliate
          if (earning.store_affiliate_id) {
            const { data: storeAffiliate } = await supabase
              .from('store_affiliates')
              .select('store_id, affiliate_account_id')
              .eq('id', earning.store_affiliate_id)
              .single();

            if (!storeAffiliate || storeAffiliate.store_id !== storeId) {
              return;
            }

            // Buscar nome do afiliado
            const { data: affiliateAccount } = await supabase
              .from('affiliate_accounts')
              .select('name')
              .eq('id', storeAffiliate.affiliate_account_id)
              .single();

            const affiliateName = affiliateAccount?.name || 'Afiliado';
            const commissionAmount = earning.commission_amount || 0;

            console.log('🎯 Nova comissão de afiliado:', {
              affiliateName,
              commissionAmount,
              orderId: earning.order_id
            });

            // Tocar som
            playCommissionSound();

            // Mostrar toast
            toastRef.current({
              title: '🎯 Nova Comissão Gerada!',
              description: `${affiliateName} - R$ ${commissionAmount.toFixed(2)}`,
              duration: 8000,
            });

            // Invalidar queries
            invalidateQueries();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da subscrição de comissões:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('🔕 Encerrando escuta de comissões');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [storeId, invalidateQueries]);
};
