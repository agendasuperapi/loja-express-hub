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
  external_code?: string;
  is_featured?: boolean;
  has_sizes?: boolean;
}

export const useProductManagement = (storeId?: string) => {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['my-products', storeId],
    queryFn: async () => {
      console.log('[useProductManagement] Fetching products for store:', storeId);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId!)
        .order('category', { ascending: true })
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useProductManagement] Error fetching products:', error);
        throw error;
      }
      
      // Filter out soft-deleted products if deleted_at column exists
      const filteredData = data?.filter(p => !(p as any).deleted_at) || [];
      console.log('[useProductManagement] Products fetched:', filteredData.length);
      return filteredData;
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-products', storeId] });
      await queryClient.refetchQueries({ queryKey: ['my-products', storeId] });
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
      queryClient.invalidateQueries({ queryKey: ['my-products', storeId] });
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
      queryClient.invalidateQueries({ queryKey: ['my-products', storeId] });
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

  const reorderProductsMutation = useMutation({
    mutationFn: async (products: { id: string; display_order: number }[]) => {
      const updates = products.map(({ id, display_order }) => 
        supabase
          .from('products')
          .update({ display_order })
          .eq('id', id)
      );
      
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error('Erro ao reordenar produtos');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products', storeId] });
      toast({
        title: 'Ordem atualizada!',
        description: 'A ordem dos produtos foi salva.',
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

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      // Soft delete - set deleted_at instead of actually deleting
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString(), is_available: false })
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products', storeId] });
      toast({
        title: 'Produto ocultado!',
        description: 'O produto foi ocultado do cardápio mas mantém seu histórico.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao ocultar produto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Restore a soft-deleted product
  const restoreProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { data, error } = await supabase
        .from('products')
        .update({ deleted_at: null, is_available: false })
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products', storeId] });
      toast({
        title: 'Produto restaurado!',
        description: 'O produto foi restaurado e está desativado. Ative-o quando desejar.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao restaurar produto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Check for soft-deleted product with same external code
  const checkDeletedProductByExternalCode = async (externalCode: string, storeId: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .eq('external_code', externalCode.trim())
      .not('deleted_at', 'is', null)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking deleted product:', error);
      return null;
    }
    
    return data;
  };

  const toggleProductFeaturedMutation = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { data, error } = await supabase
        .from('products')
        .update({ is_featured } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['my-products', storeId] });
      queryClient.invalidateQueries({ queryKey: ['featured-products'] });
      toast({
        title: data.is_featured ? 'Adicionado aos destaques!' : 'Removido dos destaques!',
        description: data.is_featured 
          ? 'O produto agora aparece no carrossel de destaques.' 
          : 'O produto foi removido do carrossel.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao alterar destaque',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    products: productsQuery.data,
    isLoading: productsQuery.isLoading,
    refetchProducts: productsQuery.refetch,
    createProduct: createProductMutation.mutate,
    updateProduct: updateProductMutation.mutate,
    toggleProductAvailability: toggleProductAvailabilityMutation.mutate,
    toggleProductFeatured: toggleProductFeaturedMutation.mutate,
    reorderProducts: reorderProductsMutation.mutate,
    deleteProduct: deleteProductMutation.mutate,
    restoreProduct: restoreProductMutation.mutate,
    checkDeletedProductByExternalCode,
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isTogglingAvailability: toggleProductAvailabilityMutation.isPending,
    isTogglingFeatured: toggleProductFeaturedMutation.isPending,
    isReordering: reorderProductsMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
    isRestoring: restoreProductMutation.isPending,
  };
};
