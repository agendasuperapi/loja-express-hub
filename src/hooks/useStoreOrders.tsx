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
            order_item_addons (*),
            order_item_flavors (*)
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
      const { data, error } = await supabase.functions.invoke('update-order-status', {
        body: { orderId, status },
      });

      if (error) {
        throw new Error(error.message || 'Falha ao atualizar status');
      }
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

  const updateOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const { data, error } = await supabase
        .from('orders')
        .update(orderData)
        .eq('id', orderData.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });
      toast({
        title: 'Pedido atualizado!',
        description: 'As alterações do pedido foram salvas.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar pedido',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    orders: ordersQuery.data,
    isLoading: ordersQuery.isLoading,
    updateOrderStatus: updateOrderStatusMutation.mutate,
    updateOrder: updateOrderMutation.mutate,
    isUpdating: updateOrderStatusMutation.isPending || updateOrderMutation.isPending,
  };
};
