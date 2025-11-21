import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ComboItem {
  id?: string;
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
  };
}

export interface Combo {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  image_url?: string;
  combo_price: number;
  is_available: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  combo_items?: ComboItem[];
}

export interface ComboFormData {
  name: string;
  description?: string;
  image_url?: string;
  combo_price: number;
  is_available: boolean;
  items: {
    product_id: string;
    quantity: number;
  }[];
}

export const useCombos = (storeId?: string) => {
  const queryClient = useQueryClient();

  // Fetch combos with items
  const { data: combos, isLoading } = useQuery({
    queryKey: ['combos', storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data, error } = await supabase
        .from('product_combos')
        .select(`
          *,
          combo_items (
            id,
            product_id,
            quantity,
            products (
              id,
              name,
              price,
              image_url
            )
          )
        `)
        .eq('store_id', storeId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as Combo[];
    },
    enabled: !!storeId,
  });

  // Create combo
  const createComboMutation = useMutation({
    mutationFn: async (formData: ComboFormData) => {
      if (!storeId) throw new Error('Store ID is required');

      // Create combo
      const { data: combo, error: comboError } = await supabase
        .from('product_combos')
        .insert({
          store_id: storeId,
          name: formData.name,
          description: formData.description,
          image_url: formData.image_url,
          combo_price: formData.combo_price,
          is_available: formData.is_available,
        })
        .select()
        .single();

      if (comboError) throw comboError;

      // Create combo items
      if (formData.items.length > 0 && combo) {
        const { error: itemsError } = await supabase
          .from('combo_items')
          .insert(
            formData.items.map(item => ({
              combo_id: combo.id,
              product_id: item.product_id,
              quantity: item.quantity,
            }))
          );

        if (itemsError) throw itemsError;
      }

      return combo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos', storeId] });
      toast({
        title: 'Sucesso',
        description: 'Combo criado com sucesso!',
      });
    },
    onError: (error) => {
      console.error('Error creating combo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o combo.',
        variant: 'destructive',
      });
    },
  });

  // Update combo
  const updateComboMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: ComboFormData }) => {
      // Update combo
      const { error: comboError } = await supabase
        .from('product_combos')
        .update({
          name: formData.name,
          description: formData.description,
          image_url: formData.image_url,
          combo_price: formData.combo_price,
          is_available: formData.is_available,
        })
        .eq('id', id);

      if (comboError) throw comboError;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from('combo_items')
        .delete()
        .eq('combo_id', id);

      if (deleteError) throw deleteError;

      // Create new items
      if (formData.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('combo_items')
          .insert(
            formData.items.map(item => ({
              combo_id: id,
              product_id: item.product_id,
              quantity: item.quantity,
            }))
          );

        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos', storeId] });
      toast({
        title: 'Sucesso',
        description: 'Combo atualizado com sucesso!',
      });
    },
    onError: (error) => {
      console.error('Error updating combo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o combo.',
        variant: 'destructive',
      });
    },
  });

  // Toggle combo availability
  const toggleComboAvailabilityMutation = useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { error } = await supabase
        .from('product_combos')
        .update({ is_available })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos', storeId] });
      toast({
        title: 'Sucesso',
        description: 'Disponibilidade atualizada!',
      });
    },
    onError: (error) => {
      console.error('Error toggling combo availability:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a disponibilidade.',
        variant: 'destructive',
      });
    },
  });

  // Delete combo
  const deleteComboMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_combos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos', storeId] });
      toast({
        title: 'Sucesso',
        description: 'Combo removido com sucesso!',
      });
    },
    onError: (error) => {
      console.error('Error deleting combo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o combo.',
        variant: 'destructive',
      });
    },
  });

  return {
    combos: combos || [],
    isLoading,
    createCombo: createComboMutation.mutateAsync,
    updateCombo: updateComboMutation.mutateAsync,
    toggleComboAvailability: toggleComboAvailabilityMutation.mutateAsync,
    deleteCombo: deleteComboMutation.mutateAsync,
    isCreating: createComboMutation.isPending,
    isUpdating: updateComboMutation.isPending,
    isDeleting: deleteComboMutation.isPending,
  };
};
