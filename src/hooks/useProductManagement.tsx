import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ProductFormData {
  name: string;
  description?: string;
  category: string;
  price: number;
  promotional_price?: number;
  stock_quantity?: number;
  is_available: boolean;
  image_url?: string;
  is_pizza?: boolean;
  max_flavors?: number;
}

export const useProductManagement = (storeId?: string) => {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['my-products', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!storeId,
  });

  const createProductMutation = useMutation({
    mutationFn: async (productData: ProductFormData & { store_id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
      toast({
        title: 'Produto criado!',
        description: 'O produto foi adicionado ao seu cardápio.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar produto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...productData }: ProductFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
      toast({
        title: 'Produto atualizado!',
        description: 'As informações do produto foram atualizadas.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar produto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleProductAvailabilityMutation = useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { data, error } = await supabase
        .from('products')
        .update({ is_available })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
      toast({
        title: data.is_available ? 'Produto ativado!' : 'Produto desativado!',
        description: data.is_available 
          ? 'O produto está disponível no cardápio.' 
          : 'O produto foi desativado mas mantém seu histórico.',
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

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
      toast({
        title: 'Produto removido!',
        description: 'O produto foi removido permanentemente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover produto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    products: productsQuery.data,
    isLoading: productsQuery.isLoading,
    createProduct: createProductMutation.mutate,
    updateProduct: updateProductMutation.mutate,
    toggleProductAvailability: toggleProductAvailabilityMutation.mutate,
    deleteProduct: deleteProductMutation.mutate,
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isTogglingAvailability: toggleProductAvailabilityMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
  };
};
