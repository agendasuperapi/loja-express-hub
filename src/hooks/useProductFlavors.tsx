import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ProductFlavor {
  id: string;
  product_id: string;
  name: string;
  description?: string;
  price: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlavorFormData {
  name: string;
  description?: string;
  price: number;
  is_available: boolean;
  product_id: string;
}

export const useProductFlavors = (productId?: string) => {
  const queryClient = useQueryClient();

  const flavorsQuery = useQuery({
    queryKey: ['product-flavors', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_flavors')
        .select('*')
        .eq('product_id', productId!)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as ProductFlavor[];
    },
    enabled: !!productId,
  });

  const createFlavorMutation = useMutation({
    mutationFn: async (flavorData: FlavorFormData) => {
      const { data, error } = await supabase
        .from('product_flavors')
        .insert(flavorData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-flavors'] });
      toast({
        title: 'Sabor criado!',
        description: 'O sabor foi adicionado ao produto.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar sabor',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateFlavorMutation = useMutation({
    mutationFn: async ({ id, ...flavorData }: Partial<FlavorFormData> & { id: string }) => {
      const { data, error } = await supabase
        .from('product_flavors')
        .update(flavorData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-flavors'] });
      toast({
        title: 'Sabor atualizado!',
        description: 'O sabor foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar sabor',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteFlavorMutation = useMutation({
    mutationFn: async (flavorId: string) => {
      const { error } = await supabase
        .from('product_flavors')
        .delete()
        .eq('id', flavorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-flavors'] });
      toast({
        title: 'Sabor removido!',
        description: 'O sabor foi removido do produto.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover sabor',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    flavors: flavorsQuery.data,
    isLoading: flavorsQuery.isLoading,
    createFlavor: createFlavorMutation.mutate,
    updateFlavor: updateFlavorMutation.mutate,
    deleteFlavor: deleteFlavorMutation.mutate,
    isCreating: createFlavorMutation.isPending,
    isUpdating: updateFlavorMutation.isPending,
    isDeleting: deleteFlavorMutation.isPending,
  };
};
