import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useStoreOrders = (storeId?: string) => {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['store-orders', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            order_item_addons (*)
          )
        `)
        .eq('store_id', storeId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!storeId,
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { 
      orderId: string; 
      status: string
    }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: status as any }) // Cast needed until Supabase types are regenerated
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });
      toast({
        title: 'Status atualizado!',
        description: 'O status do pedido foi atualizado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    orders: ordersQuery.data,
    isLoading: ordersQuery.isLoading,
    updateOrderStatus: updateOrderStatusMutation.mutate,
    isUpdating: updateOrderStatusMutation.isPending,
  };
};
