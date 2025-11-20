import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StoreAddon {
  id: string;
  name: string;
  price: number;
  product_name?: string;
  category_name?: string;
}

export interface StoreFlavor {
  id: string;
  name: string;
  description?: string;
  price: number;
  product_name?: string;
}

export const useStoreAddonsAndFlavors = (storeId?: string) => {
  // Buscar todos os adicionais da loja
  const addonsQuery = useQuery({
    queryKey: ['store-all-addons', storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data, error } = await supabase
        .from('product_addons')
        .select(`
          id,
          name,
          price,
          product:products!inner(
            name,
            store_id
          ),
          category:addon_categories(
            name
          )
        `)
        .eq('product.store_id', storeId);

      if (error) throw error;

      // Agrupar adicionais únicos por nome
      const uniqueAddons = new Map<string, StoreAddon>();
      
      data?.forEach((addon: any) => {
        const key = addon.name.toLowerCase();
        if (!uniqueAddons.has(key)) {
          uniqueAddons.set(key, {
            id: addon.id,
            name: addon.name,
            price: addon.price,
            product_name: addon.product?.name,
            category_name: addon.category?.name,
          });
        }
      });

      return Array.from(uniqueAddons.values());
    },
    enabled: !!storeId,
  });

  // Buscar todos os sabores da loja
  const flavorsQuery = useQuery({
    queryKey: ['store-all-flavors', storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data, error } = await supabase
        .from('product_flavors')
        .select(`
          id,
          name,
          description,
          price,
          product:products!inner(
            name,
            store_id
          )
        `)
        .eq('product.store_id', storeId);

      if (error) throw error;

      // Agrupar sabores únicos por nome
      const uniqueFlavors = new Map<string, StoreFlavor>();
      
      data?.forEach((flavor: any) => {
        const key = flavor.name.toLowerCase();
        if (!uniqueFlavors.has(key)) {
          uniqueFlavors.set(key, {
            id: flavor.id,
            name: flavor.name,
            description: flavor.description,
            price: flavor.price,
            product_name: flavor.product?.name,
          });
        }
      });

      return Array.from(uniqueFlavors.values());
    },
    enabled: !!storeId,
  });

  return {
    addons: addonsQuery.data || [],
    flavors: flavorsQuery.data || [],
    isLoading: addonsQuery.isLoading || flavorsQuery.isLoading,
    refetch: () => {
      addonsQuery.refetch();
      flavorsQuery.refetch();
    },
  };
};
