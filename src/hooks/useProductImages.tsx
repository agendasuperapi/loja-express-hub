import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export const useProductImages = (productId?: string) => {
  const queryClient = useQueryClient();

  const imagesQuery = useQuery({
    queryKey: ['product-images', productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as ProductImage[];
    },
    enabled: !!productId,
  });

  const invalidateImages = () => {
    queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
  };

  return {
    images: imagesQuery.data || [],
    isLoading: imagesQuery.isLoading,
    invalidateImages,
  };
};
