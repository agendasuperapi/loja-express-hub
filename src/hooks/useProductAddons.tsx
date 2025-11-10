import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ProductAddon {
  id: string;
  product_id: string;
  name: string;
  price: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddonFormData {
  name: string;
  price: number;
  is_available: boolean;
}

export const useProductAddons = (productId?: string) => {
  const queryClient = useQueryClient();

  const addonsQuery = useQuery({
    queryKey: ['product-addons', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_addons')
        .select('*')
        .eq('product_id', productId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ProductAddon[];
    },
    enabled: !!productId,
  });

  const createAddonMutation = useMutation({
    mutationFn: async (addonData: AddonFormData & { product_id: string }) => {
      const { data, error } = await supabase
        .from('product_addons')
        .insert(addonData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-addons'] });
      toast({
        title: 'Adicional criado!',
        description: 'O adicional foi adicionado ao produto.',
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-addons'] });
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
      queryClient.invalidateQueries({ queryKey: ['product-addons'] });
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

  return {
    addons: addonsQuery.data,
    isLoading: addonsQuery.isLoading,
    createAddon: createAddonMutation.mutate,
    updateAddon: updateAddonMutation.mutate,
    deleteAddon: deleteAddonMutation.mutate,
    isCreating: createAddonMutation.isPending,
    isUpdating: updateAddonMutation.isPending,
    isDeleting: deleteAddonMutation.isPending,
  };
};
