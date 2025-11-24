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
  });

  // 🔥 REALTIME: Sistema de atualização em tempo real
  useEffect(() => {
    if (!productId) return;

    console.log('[useProductAddons] 🎧 Configurando REALTIME para product_id:', productId);

    const channel = supabase
      .channel(`product-addons-realtime-${productId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'product_addons',
          filter: `product_id=eq.${productId}`
        },
        async (payload) => {
          console.log('[useProductAddons] 🔔 REALTIME INSERT:', payload.new);
          
          // Atualização OTIMISTA: adiciona imediatamente sem esperar refetch
          queryClient.setQueryData(['product-addons', productId], (old: ProductAddon[] | undefined) => {
            if (!old) return [payload.new as ProductAddon];
            return [...old, payload.new as ProductAddon];
          });
          
          // Refetch completo para garantir ordem correta
          await queryClient.refetchQueries({ 
            queryKey: ['product-addons', productId],
            exact: true,
            type: 'active'
          });
          
          console.log('[useProductAddons] ✅ Novo adicional adicionado via REALTIME!');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'product_addons',
          filter: `product_id=eq.${productId}`
        },
        async (payload) => {
          console.log('[useProductAddons] 🔔 REALTIME UPDATE:', payload.new);
          
          // Atualização OTIMISTA
          queryClient.setQueryData(['product-addons', productId], (old: ProductAddon[] | undefined) => {
            if (!old) return [payload.new as ProductAddon];
            return old.map(addon => 
              addon.id === payload.new.id ? payload.new as ProductAddon : addon
            );
          });
          
          console.log('[useProductAddons] ✅ Adicional atualizado via REALTIME!');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'product_addons',
          filter: `product_id=eq.${productId}`
        },
        async (payload) => {
          console.log('[useProductAddons] 🔔 REALTIME DELETE:', payload.old);
          
          // Atualização OTIMISTA
          queryClient.setQueryData(['product-addons', productId], (old: ProductAddon[] | undefined) => {
            if (!old) return [];
            return old.filter(addon => addon.id !== payload.old.id);
          });
          
          console.log('[useProductAddons] ✅ Adicional removido via REALTIME!');
        }
      )
      .subscribe((status) => {
        console.log('[useProductAddons] 📡 REALTIME status:', status, 'para produto:', productId);
        
        if (status === 'SUBSCRIBED') {
          console.log('[useProductAddons] ✅ REALTIME ATIVO para produto:', productId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useProductAddons] ❌ ERRO no canal REALTIME');
        } else if (status === 'TIMED_OUT') {
          console.error('[useProductAddons] ⏱️ TIMEOUT no canal REALTIME');
        }
      });

    return () => {
      console.log('[useProductAddons] 🔌 Desconectando REALTIME para produto:', productId);
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
