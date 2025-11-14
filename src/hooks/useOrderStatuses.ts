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

  useEffect(() => {
    if (storeId) {
      fetchStatuses();
    }
  }, [storeId]);

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

  return {
    statuses,
    isLoading,
    refetch: fetchStatuses,
  };
};
