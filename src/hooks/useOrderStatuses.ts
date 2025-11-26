import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OrderStatusConfig {
  id: string;
  store_id: string;
  status_key: string;
  status_label: string;
  status_color: string;
  display_order: number;
  is_active: boolean;
  whatsapp_message?: string;
}

/**
 * Hook para buscar status de pedidos configurados no banco de dados
 * Permite que novos status apareçam automaticamente no sistema
 */
export const useOrderStatuses = (storeId?: string) => {
  const [statuses, setStatuses] = useState<OrderStatusConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatuses = async () => {
    if (!storeId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_status_configs')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setStatuses(data || []);
    } catch (error) {
      console.error('Error fetching order statuses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchStatuses();
    }
  }, [storeId]);

  // Refetch quando houver mudanças no banco (polling leve)
  useEffect(() => {
    if (!storeId) return;

    const intervalId = setInterval(() => {
      fetchStatuses();
    }, 10000); // Atualiza a cada 10 segundos

    return () => clearInterval(intervalId);
  }, [storeId]);

  // Subscription em tempo real para mudanças
  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel(`order_status_configs_${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_status_configs',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          console.log('[useOrderStatuses] Mudança detectada, atualizando...');
          fetchStatuses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId]);

  return {
    statuses,
    isLoading,
    refetch: fetchStatuses,
  };
};
