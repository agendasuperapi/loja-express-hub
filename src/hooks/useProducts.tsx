import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProducts = (storeId: string) => {
  return useQuery({
    queryKey: ['products', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_available', true)
        .order('display_order', { ascending: true })
        .order('category')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!storeId,
  });
};
