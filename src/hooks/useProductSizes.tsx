import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ProductSize {
  id: string;
  product_id: string;
  name: string;
  price: number;
  description?: string;
  display_order: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface SizeFormData {
  name: string;
  price: number;
  description?: string;
  is_available: boolean;
}

export const useProductSizes = (productId?: string) => {
  const queryClient = useQueryClient();

  const sizesQuery = useQuery({
    queryKey: ['product-sizes', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sizes')
        .select('*')
        .eq('product_id', productId!)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });

  const createSizeMutation = useMutation({
    mutationFn: async (sizeData: SizeFormData & { product_id: string }) => {
      const { data, error } = await supabase
        .from('product_sizes')
        .insert(sizeData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      // Update product to has_sizes = true
      await supabase
        .from('products')
        .update({ has_sizes: true })
        .eq('id', data.product_id);

      queryClient.invalidateQueries({ queryKey: ['product-sizes'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Tamanho criado!',
        description: 'O tamanho foi adicionado ao produto.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar tamanho',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateSizeMutation = useMutation({
    mutationFn: async ({ id, ...sizeData }: SizeFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('product_sizes')
        .update(sizeData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-sizes'] });
      toast({
        title: 'Tamanho atualizado!',
        description: 'As informações do tamanho foram atualizadas.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar tamanho',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteSizeMutation = useMutation({
    mutationFn: async (sizeId: string) => {
      // Get the product_id before deleting
      const { data: sizeData } = await supabase
        .from('product_sizes')
        .select('product_id')
        .eq('id', sizeId)
        .single();

      const { error } = await supabase
        .from('product_sizes')
        .delete()
        .eq('id', sizeId);

      if (error) throw error;
      return sizeData?.product_id;
    },
    onSuccess: async (productId) => {
      if (productId) {
        // Check if there are any remaining sizes for this product
        const { data: remainingSizes } = await supabase
          .from('product_sizes')
          .select('id')
          .eq('product_id', productId);

        // If no more sizes, update has_sizes to false
        if (!remainingSizes || remainingSizes.length === 0) {
          await supabase
            .from('products')
            .update({ has_sizes: false })
            .eq('id', productId);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['product-sizes'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Tamanho removido!',
        description: 'O tamanho foi removido do produto.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover tamanho',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const reorderSizesMutation = useMutation({
    mutationFn: async (sizes: { id: string; display_order: number }[]) => {
      const updates = sizes.map(({ id, display_order }) => 
        supabase
          .from('product_sizes')
          .update({ display_order })
          .eq('id', id)
      );
      
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error('Erro ao reordenar tamanhos');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-sizes'] });
      toast({
        title: 'Ordem atualizada!',
        description: 'A ordem dos tamanhos foi salva.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao reordenar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleSizeAvailabilityMutation = useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { data, error } = await supabase
        .from('product_sizes')
        .update({ is_available })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product-sizes'] });
      toast({
        title: data.is_available ? 'Tamanho ativado!' : 'Tamanho desativado!',
        description: data.is_available 
          ? 'O tamanho está disponível.' 
          : 'O tamanho foi desativado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao alterar disponibilidade',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    sizes: sizesQuery.data,
    isLoading: sizesQuery.isLoading,
    createSize: createSizeMutation.mutate,
    updateSize: updateSizeMutation.mutate,
    deleteSize: deleteSizeMutation.mutate,
    toggleSizeAvailability: toggleSizeAvailabilityMutation.mutate,
    reorderSizes: reorderSizesMutation.mutate,
    isCreating: createSizeMutation.isPending,
    isUpdating: updateSizeMutation.isPending,
    isDeleting: deleteSizeMutation.isPending,
    isTogglingAvailability: toggleSizeAvailabilityMutation.isPending,
    isReordering: reorderSizesMutation.isPending,
  };
};
