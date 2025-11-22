import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useStores = (category?: string, searchTerm?: string) => {
  return useQuery({
    queryKey: ['stores', category, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('stores')
        .select('*')
        .eq('status', 'active')
        .order('rating', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });
};

export const useStore = (slug: string) => {
  return useQuery({
    queryKey: ['store', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*, require_delivery_zone')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
};
