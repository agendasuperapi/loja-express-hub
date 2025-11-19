import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { orderSchema, CreateOrderData } from '@/schema/orderSchema';
import { normalizePhone } from '@/lib/phone';
import { useEffect } from 'react';

export const useOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Realtime subscription para atualizações automáticas
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[Realtime] Order change detected:', payload);
          // Invalidar query para recarregar os dados
          queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const ordersQuery = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items!inner (
            *,
            order_item_addons (*),
            order_item_flavors (*)
          ),
          stores (
            name,
            slug,
            pickup_address,
            address,
            pix_key,
            show_pix_key_to_customer,
            pix_message_enabled,
            pix_message_title,
            pix_message_description,
            pix_message_footer,
            pix_message_button_text,
            pix_copiacola_message_enabled,
            pix_copiacola_message_title,
            pix_copiacola_message_description,
            pix_copiacola_message_footer,
            pix_copiacola_message_button_text,
            pix_copiacola_button_text,
            operating_hours,
            allow_orders_when_closed
          )
        `)
        .eq('customer_id', user!.id)
        .is('order_items.deleted_at', null)
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
      const couponDiscount = validatedData.couponDiscount || 0;
      const total = subtotal + deliveryFee - couponDiscount;

      // 🔢 Gerar número do pedido
      const orderNumber = `#${Date.now().toString().slice(-8)}`;

      console.log("🧾 Criando pedido diretamente via INSERT...");

      // 🟢 INSERT DIRETO com cupom incluso
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
          coupon_code: validatedData.couponCode || null,
          coupon_discount: couponDiscount,
          notes: validatedData.notes || null,
        } as any)
        .select()
        .single();

      if (orderError) {
        console.error("❌ Order insert error:", orderError);
        throw orderError;
      }

      if (!createdOrder) {
        throw new Error("Falha ao criar pedido");
      }

      console.log("✅ Order created:", {
        id: createdOrder.id,
        coupon: validatedData.couponCode || 'nenhum',
        discount: couponDiscount
      });

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

      // 🍕 Inserir sabores
      const flavorsToInsert: any[] = [];

      validatedData.items.forEach((item, index) => {
        const created = createdItems[index];
        item.flavors?.forEach((flavor) => {
          flavorsToInsert.push({
            order_item_id: created.id,
            flavor_name: flavor.name,
            flavor_price: flavor.price,
          });
        });
      });

      if (flavorsToInsert.length > 0) {
        const { error: flavorsError } = await supabase
          .from("order_item_flavors")
          .insert(flavorsToInsert);

        if (flavorsError) throw flavorsError;
      }

      // 📵 Envio de WhatsApp pelo cliente desativado: será enviado automaticamente via banco de dados (trigger)
      console.log("📵 Envio de WhatsApp via cliente desativado. Banco de dados fará o envio automático após 3s.");


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
        ? error.issues[0]?.message || 'Dados do pedido inválidos'
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
