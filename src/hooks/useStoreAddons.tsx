import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StoreAddon {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  product_id: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  allow_quantity?: boolean;
  category?: {
    id: string;
    name: string;
  };
}

export const useStoreAddons = (storeId?: string) => {
  const queryClient = useQueryClient();

  // Buscar todos os adicionais da loja
  const addonsQuery = useQuery({
    queryKey: ['store-addons', storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', storeId);

      if (productsError) throw productsError;
      if (!products || products.length === 0) return [];

      const productIds = products.map(p => p.id);

      const { data, error } = await supabase
        .from('product_addons')
        .select(`
          *,
          category:addon_categories(id, name)
        `)
        .in('product_id', productIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // De-duplicar adicionais por nome e categoria
      // Se houver adicionais com mesmo nome e categoria em produtos diferentes,
      // mantém apenas o mais recente
      const uniqueAddons = new Map<string, StoreAddon>();
      (data || []).forEach((addon: StoreAddon) => {
        const key = `${addon.name}-${addon.category_id || 'null'}`;
        if (!uniqueAddons.has(key)) {
          uniqueAddons.set(key, addon);
        }
      });
      
      return Array.from(uniqueAddons.values());
    },
    enabled: !!storeId,
  });

  // Criar adicional global
  const createAddonMutation = useMutation({
    mutationFn: async (addonData: {
      name: string;
      price: number;
      is_available: boolean;
      product_id: string;
      category_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('product_addons')
        .insert(addonData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-addons'] });
      queryClient.invalidateQueries({ queryKey: ['store-all-addons'] });
      toast({
        title: 'Adicional criado!',
        description: 'O adicional foi adicionado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar adicional',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar adicional
  const updateAddonMutation = useMutation({
    mutationFn: async ({ id, ...addonData }: Partial<StoreAddon> & { id: string }) => {
      const { data, error } = await supabase
        .from('product_addons')
        .update(addonData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-addons'] });
      queryClient.invalidateQueries({ queryKey: ['store-all-addons'] });
      toast({
        title: 'Adicional atualizado!',
        description: 'As informações do adicional foram atualizadas.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar adicional',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Deletar adicional
  const deleteAddonMutation = useMutation({
    mutationFn: async (addonId: string) => {
      const { error } = await supabase
        .from('product_addons')
        .delete()
        .eq('id', addonId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-addons'] });
      queryClient.invalidateQueries({ queryKey: ['store-all-addons'] });
      toast({
        title: 'Adicional removido!',
        description: 'O adicional foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover adicional',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualização em massa
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<StoreAddon> }) => {
      const promises = ids.map(id =>
        supabase
          .from('product_addons')
          .update(updates)
          .eq('id', id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`Falha ao atualizar ${errors.length} adicionais`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-addons'] });
      queryClient.invalidateQueries({ queryKey: ['store-all-addons'] });
      toast({
        title: 'Adicionais atualizados!',
        description: 'Os adicionais foram atualizados em massa.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar adicionais',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    addons: addonsQuery.data,
    isLoading: addonsQuery.isLoading,
    createAddon: createAddonMutation.mutate,
    updateAddon: updateAddonMutation.mutate,
    deleteAddon: deleteAddonMutation.mutate,
    bulkUpdate: bulkUpdateMutation.mutate,
    isCreating: createAddonMutation.isPending,
    isUpdating: updateAddonMutation.isPending,
    isDeleting: deleteAddonMutation.isPending,
    isBulkUpdating: bulkUpdateMutation.isPending,
  };
};
