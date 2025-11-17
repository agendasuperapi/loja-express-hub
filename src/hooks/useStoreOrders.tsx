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
          order_items!inner (
            *,
            order_item_addons (*),
            order_item_flavors (*)
          )
        `)
        .eq('store_id', storeId!)
        .is('order_items.deleted_at', null)
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
      console.log('[updateOrderStatus] Iniciando atualização:', { orderId, status });
      
      const { data, error } = await supabase.functions.invoke('update-order-status', {
        body: { orderId, status },
      });

      console.log('[updateOrderStatus] Resposta recebida:', { data, error });

      // Verifica erro de rede/conexão
      if (error) {
        console.error('[updateOrderStatus] Erro de rede:', error);
        const status = (error as any)?.context?.response?.status ?? (error as any)?.status ?? (error as any)?.cause?.status;
        if (status === 401) {
          throw new Error('Não autorizado. Sua sessão pode ter expirado. Faça login novamente.');
        }
        throw new Error(error.message || 'Falha na comunicação com o servidor');
      }

      // Verifica se a edge function retornou um erro
      if (data && typeof data === 'object' && 'error' in data) {
        console.error('[updateOrderStatus] Erro da edge function:', data.error);
        throw new Error(data.error || 'Falha ao atualizar status');
      }

      // Verifica se a resposta tem o formato esperado
      if (!data || typeof data !== 'object' || !('success' in data)) {
        console.error('[updateOrderStatus] Formato de resposta inválido:', data);
        throw new Error('Resposta inválida do servidor');
      }

      console.log('[updateOrderStatus] Status atualizado com sucesso:', data.data);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });
      toast({
        title: 'Status atualizado!',
        description: 'O status do pedido foi atualizado.',
      });
    },
    onError: (error: Error) => {
      console.error('[updateOrderStatus] Erro capturado:', error);
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
