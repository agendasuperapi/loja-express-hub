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
      
      // Buscar endereço da loja
      const { data: storeData, error: storeError } = await (supabase as any)
        .from('stores')
        .select('store_street, store_street_number, store_neighborhood, store_city, store_complement, store_address_pickup_enabled')
        .eq('id', storeId)
        .single();

      if (storeError) throw storeError;

      // Buscar locais de retirada cadastrados
      const { data: locations, error } = await (supabase as any)
        .from('store_pickup_locations')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const pickupLocations = (locations || []) as PickupLocation[];

      // Adicionar endereço da loja se estiver habilitado e tiver dados
      const storeAddress = storeData && (storeData.store_street || storeData.store_city) && storeData.store_address_pickup_enabled ? {
        id: 'store-address',
        name: 'Endereço da Loja',
        address: [
          storeData.store_street,
          storeData.store_street_number,
          storeData.store_neighborhood,
          storeData.store_city,
          storeData.store_complement
        ].filter(Boolean).join(", "),
        is_active: true
      } : null;

      // Retornar endereço da loja primeiro, depois os outros locais
      return storeAddress ? [storeAddress, ...pickupLocations] : pickupLocations;
    },
    enabled: !!storeId,
  });
};
