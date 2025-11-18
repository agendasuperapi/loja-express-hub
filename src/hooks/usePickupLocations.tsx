import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PickupLocation {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
}

export const usePickupLocations = (storeId?: string) => {
  return useQuery({
    queryKey: ['pickup-locations', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      
      const { data, error } = await (supabase as any)
        .from('store_pickup_locations')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as PickupLocation[];
    },
    enabled: !!storeId,
  });
};
