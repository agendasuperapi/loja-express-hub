import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

// Validation schema for order data
const orderSchema = z.object({
  storeId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    productName: z.string().trim().min(1).max(200),
    quantity: z.number().int().positive().max(1000),
    unitPrice: z.number().positive().max(100000),
    observation: z.string().trim().max(500).optional(),
    addons: z.array(z.object({
      id: z.string(),
      name: z.string().trim().min(1).max(200),
      price: z.number().positive().max(10000),
    })).optional(),
  })).min(1),
  customerName: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  customerPhone: z.string()
    .transform(val => val.replace(/\D/g, ''))
    .refine(val => val.length === 10 || val.length === 11, {
      message: 'Telefone deve ter 10 ou 11 dígitos'
    }),
  deliveryType: z.enum(['delivery', 'pickup']),
  deliveryStreet: z.string().trim().max(200, 'Nome da rua muito longo').optional(),
  deliveryNumber: z.string().trim().max(20, 'Número muito longo').optional(),
  deliveryNeighborhood: z.string().trim().max(100, 'Nome do bairro muito longo').optional(),
  deliveryComplement: z.string().trim().max(100, 'Complemento muito longo').optional(),
  notes: z.string().trim().max(500, 'Observações muito longas').optional(),
  paymentMethod: z.enum(['pix', 'dinheiro', 'cartao'], { errorMap: () => ({ message: 'Método de pagamento inválido' }) }),
  changeAmount: z.number().positive().max(100000).optional(),
}).refine((data) => {
  if (data.deliveryType === 'delivery') {
    return data.deliveryStreet && data.deliveryStreet.length >= 3 && 
           data.deliveryNumber && data.deliveryNumber.length >= 1 && 
           data.deliveryNeighborhood && data.deliveryNeighborhood.length >= 2;
  }
  return true;
}, {
  message: 'Endereço completo é obrigatório para entrega',
  path: ['deliveryStreet'],
});

export interface CreateOrderData {
  storeId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    observation?: string;
    addons?: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  }>;
  customerName: string;
  customerPhone: string;
  deliveryType: 'delivery' | 'pickup';
  deliveryStreet?: string;
  deliveryNumber?: string;
  deliveryNeighborhood?: string;
  deliveryComplement?: string;
  notes?: string;
  paymentMethod: 'pix' | 'dinheiro' | 'cartao';
  changeAmount?: number;
}

export const useOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            order_item_addons (*)
          ),
          stores (
            name,
            slug
          )
        `)
        .eq('customer_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: CreateOrderData) => {
      // Validate input data
      const validatedData = orderSchema.parse(orderData);
      
      // Calculate totals
      const subtotal = validatedData.items.reduce(
        (sum, item) => sum + (item.unitPrice * item.quantity),
        0
      );
      const deliveryFee = validatedData.deliveryType === 'pickup' ? 0 : 5;
      const total = subtotal + deliveryFee;

      // Generate order number
      const orderNumber = `#${Date.now().toString().slice(-8)}`;

      // Create order with validated data
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          store_id: validatedData.storeId,
          customer_id: user!.id,
          customer_name: validatedData.customerName,
          customer_phone: validatedData.customerPhone,
          delivery_type: validatedData.deliveryType,
          delivery_street: validatedData.deliveryStreet || null,
          delivery_number: validatedData.deliveryNumber || null,
          delivery_neighborhood: validatedData.deliveryNeighborhood || null,
          delivery_complement: validatedData.deliveryComplement || null,
          order_number: orderNumber,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          status: 'pending',
          payment_method: validatedData.paymentMethod,
          change_amount: validatedData.changeAmount,
        })
        .select()
        .single();

      if (orderError) {
        throw orderError;
      }

      // Create order items with validated data
      const { data: createdItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(
          validatedData.items.map(item => ({
            order_id: order.id,
            product_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            subtotal: item.unitPrice * item.quantity,
            observation: item.observation,
          }))
        )
        .select();

      if (itemsError) {
        throw itemsError;
      }

      // Create order item addons if any
      const addonsToInsert: any[] = [];
      validatedData.items.forEach((item, index) => {
        if (item.addons && item.addons.length > 0 && createdItems && createdItems[index]) {
          item.addons.forEach(addon => {
            addonsToInsert.push({
              order_item_id: createdItems[index].id,
              addon_name: addon.name,
              addon_price: addon.price,
            });
          });
        }
      });

      if (addonsToInsert.length > 0) {
        const { error: addonsError } = await supabase
          .from('order_item_addons')
          .insert(addonsToInsert);

        if (addonsError) {
          console.error('Error inserting addons:', addonsError);
          // Don't throw - the order is already created
        }
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: 'Pedido realizado!',
        description: 'Seu pedido foi enviado com sucesso.',
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof z.ZodError 
        ? error.errors[0]?.message || 'Dados do pedido inválidos'
        : error.message;
      
      toast({
        title: 'Erro ao criar pedido',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  return {
    orders: ordersQuery.data,
    isLoading: ordersQuery.isLoading,
    createOrder: (data: CreateOrderData) => createOrderMutation.mutateAsync(data),
    isCreating: createOrderMutation.isPending,
  };
};
