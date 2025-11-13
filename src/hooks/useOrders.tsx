import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { orderSchema, CreateOrderData } from '@/schema/orderSchema';
import { normalizePhone } from '@/lib/phone';

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
    mutationFn: async (orderInput: CreateOrderData) => {
      // 🧾 Valida entrada com Zod
      const validatedData = orderSchema.parse(orderInput);

      if (!user?.id) {
        throw new Error("Usuário não autenticado");
      }

      // 🧮 Calcular totais
      const subtotal = validatedData.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );
      const deliveryFee = validatedData.deliveryType === "pickup" ? 0 : 5;
      const total = subtotal + deliveryFee;

      // 🔢 Gerar número do pedido
      const orderNumber = `#${Date.now().toString().slice(-8)}`;

      console.log("🧾 Criando pedido diretamente via INSERT...");

      // 🟢 INSERT DIRETO - Sem RPC para evitar problemas com triggers!
      const { data: createdOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          store_id: validatedData.storeId,
          customer_id: user.id,
          customer_name: validatedData.customerName,
          customer_phone: normalizePhone(validatedData.customerPhone),
          delivery_type: validatedData.deliveryType,
          order_number: orderNumber,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          status: "pending",
          payment_method: validatedData.paymentMethod,
          delivery_street: validatedData.deliveryStreet || null,
          delivery_number: validatedData.deliveryNumber || null,
          delivery_neighborhood: validatedData.deliveryNeighborhood || null,
          delivery_complement: validatedData.deliveryComplement || null,
          change_amount: validatedData.changeAmount || null,
        })
        .select()
        .single();

      if (orderError) {
        console.error("❌ Order insert error:", orderError);
        throw orderError;
      }

      if (!createdOrder) {
        throw new Error("Falha ao criar pedido");
      }

      console.log("✅ Order created:", createdOrder.id);

      // 🟦 Inserir itens da ordem
      const itemsToInsert = validatedData.items.map((item) => ({
        order_id: createdOrder.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.unitPrice * item.quantity,
        observation: item.observation || null,
      }));

      const { data: createdItems, error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert)
        .select();

      if (itemsError) throw itemsError;

      // 🟧 Inserir addons
      const addonsToInsert: any[] = [];

      validatedData.items.forEach((item, index) => {
        const created = createdItems[index];
        item.addons?.forEach((addon) => {
          addonsToInsert.push({
            order_item_id: created.id,
            addon_name: addon.name,
            addon_price: addon.price,
          });
        });
      });

      if (addonsToInsert.length > 0) {
        const { error: addonsError } = await supabase
          .from("order_item_addons")
          .insert(addonsToInsert);

        if (addonsError) throw addonsError;
      }

      // ✅ Envio de WhatsApp é tratado pelo trigger do banco (notify_order_whatsapp)

      return createdOrder;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Pedido realizado!",
        description: "Seu pedido foi enviado com sucesso.",
      });
    },

    onError: (error: any) => {
      console.error("❌ Order creation failed:", error);

      const errorMessage = error instanceof z.ZodError 
        ? error.errors[0]?.message || 'Dados do pedido inválidos'
        : error?.details || error?.message || "Erro desconhecido ao criar pedido";

      toast({
        title: "Erro ao criar pedido",
        description: errorMessage,
        variant: "destructive",
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
