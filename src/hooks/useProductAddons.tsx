import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface ProductAddon {
  id: string;
  product_id: string;
  name: string;
  price: number;
  is_available: boolean;
  category_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  allow_quantity?: boolean;
}

export interface AddonFormData {
  name: string;
  price: number;
  is_available: boolean;
  category_id?: string | null;
  allow_quantity?: boolean;
}

export const useProductAddons = (productId?: string) => {
  const queryClient = useQueryClient();

  const addonsQuery = useQuery({
    queryKey: ['product-addons', productId],
    queryFn: async () => {
      console.log('[useProductAddons] 🔍 Fetching addons for product:', productId);
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from('product_addons')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[useProductAddons] ❌ Error fetching:', error);
        throw error;
      }
      
      console.log('[useProductAddons] ✅ Fetched addons:', data?.length || 0, 'items');
      return data as ProductAddon[];
    },
    enabled: !!productId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 3000, // 🔥 Atualização automática a cada 3 segundos
    refetchIntervalInBackground: false,
  });

  // 🔥 REALTIME: Escutar mudanças na tabela product_addons em tempo real
  useEffect(() => {
    if (!productId) return;

    console.log('[useProductAddons] 🎧 Configurando listener realtime para product_id:', productId);

    const channel = supabase
      .channel(`product-addons-${productId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'product_addons',
          filter: `product_id=eq.${productId}`
        },
        (payload) => {
          console.log('[useProductAddons] 🔔 Realtime event received:', {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          });

          // Invalidar e refetch automaticamente quando houver mudanças
          queryClient.invalidateQueries({ 
            queryKey: ['product-addons', productId],
            exact: true 
          });
          
          console.log('[useProductAddons] 🔄 Query invalidated due to realtime event');
        }
      )
      .subscribe((status) => {
        console.log('[useProductAddons] 📡 Realtime subscription status:', status);
      });

    return () => {
      console.log('[useProductAddons] 🔌 Unsubscribing from realtime channel');
      supabase.removeChannel(channel);
    };
  }, [productId, queryClient]);

  const createAddonMutation = useMutation({
    mutationFn: async (addonData: AddonFormData & { product_id: string }) => {
      console.log('[useProductAddons] 🔵 Iniciando criação de adicional:', addonData);
      
      const { data, error } = await supabase
        .from('product_addons')
        .insert(addonData)
        .select()
        .single();

      if (error) {
        console.error('[useProductAddons] ❌ Erro ao inserir:', error);
        throw error;
      }
      
      console.log('[useProductAddons] ✅ Adicional inserido com sucesso:', data);
      return data;
    },
    onSuccess: async (data) => {
      console.log('[useProductAddons] 🔄 onSuccess - Forçando atualização imediata');
      
      // Invalidar todas as queries relacionadas
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['product-addons', productId] }),
        queryClient.invalidateQueries({ queryKey: ['store-addons'] }),
        queryClient.invalidateQueries({ queryKey: ['store-all-addons'] })
      ]);
      
      // Refetch imediato e forçado
      await queryClient.refetchQueries({ 
        queryKey: ['product-addons', productId],
        type: 'active'
      });
      
      console.log('[useProductAddons] ✅ Queries atualizadas com sucesso');
      
      toast({
        title: 'Adicional criado!',
        description: 'O adicional foi adicionado ao produto.',
      });
    },
    onError: (error: Error) => {
      console.error('[useProductAddons] ❌ Erro:', error);
      toast({
        title: 'Erro ao criar adicional',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateAddonMutation = useMutation({
    mutationFn: async ({ id, ...addonData }: AddonFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('product_addons')
        .update(addonData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['product-addons', productId] });
      await queryClient.invalidateQueries({ queryKey: ['store-addons'] });
      await queryClient.invalidateQueries({ queryKey: ['store-all-addons'] });
      await queryClient.refetchQueries({ queryKey: ['product-addons', productId] });
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

  const deleteAddonMutation = useMutation({
    mutationFn: async (addonId: string) => {
      const { error } = await supabase
        .from('product_addons')
        .delete()
        .eq('id', addonId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-addons', productId] });
      queryClient.invalidateQueries({ queryKey: ['store-addons'] });
      queryClient.invalidateQueries({ queryKey: ['store-all-addons'] });
      toast({
        title: 'Adicional removido!',
        description: 'O adicional foi removido do produto.',
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

  const reorderAddonsMutation = useMutation({
    mutationFn: async (reorderedAddons: { id: string; display_order: number }[]) => {
      const updates = reorderedAddons.map(({ id, display_order }) =>
        supabase
          .from('product_addons')
          .update({ display_order } as any)
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-addons', productId] });
      queryClient.invalidateQueries({ queryKey: ['store-addons'] });
      queryClient.invalidateQueries({ queryKey: ['store-all-addons'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao reordenar adicionais',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const duplicateAddonMutation = useMutation({
    mutationFn: async (addonId: string) => {
      // Get the original addon
      const { data: originalAddon, error: fetchError } = await supabase
        .from('product_addons')
        .select('*')
        .eq('id', addonId)
        .single();

      if (fetchError) throw fetchError;

      // Create duplicate with modified name
      const { data, error } = await supabase
        .from('product_addons')
        .insert({
          product_id: originalAddon.product_id,
          name: `${originalAddon.name} (Cópia)`,
          price: originalAddon.price,
          is_available: originalAddon.is_available,
          category_id: originalAddon.category_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-addons', productId] });
      queryClient.invalidateQueries({ queryKey: ['store-addons'] });
      queryClient.invalidateQueries({ queryKey: ['store-all-addons'] });
      toast({
        title: 'Adicional duplicado!',
        description: 'O adicional foi duplicado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao duplicar adicional',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    addons: addonsQuery.data,
    isLoading: addonsQuery.isLoading,
    createAddon: createAddonMutation.mutate,
    createAddonAsync: createAddonMutation.mutateAsync,
    updateAddon: updateAddonMutation.mutate,
    updateAddonAsync: updateAddonMutation.mutateAsync,
    deleteAddon: deleteAddonMutation.mutate,
    reorderAddons: reorderAddonsMutation.mutate,
    duplicateAddon: duplicateAddonMutation.mutate,
    isCreating: createAddonMutation.isPending,
    isUpdating: updateAddonMutation.isPending,
    isDeleting: deleteAddonMutation.isPending,
    isReordering: reorderAddonsMutation.isPending,
    isDuplicating: duplicateAddonMutation.isPending,
  };
};
