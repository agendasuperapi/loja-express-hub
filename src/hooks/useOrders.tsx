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

      // 🎯 Calcular taxa de entrega respeitando zonas e configuração da loja
      let deliveryFee = 0;
      const isDelivery = validatedData.deliveryType === "delivery";

      if (isDelivery) {
        // Buscar configurações da loja (taxa padrão e restrição por zona)
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('delivery_fee, require_delivery_zone')
          .eq('id', validatedData.storeId)
          .single();

        if (storeError) {
          console.error("❌ Store fetch error:", storeError);
          throw storeError;
        }

        const baseDeliveryFee = Number(store?.delivery_fee ?? 0);

        if (store?.require_delivery_zone) {
          // Buscar zonas ativas da loja
          const { data: zones, error: zonesError } = await supabase
            .from('delivery_zones')
            .select('*')
            .eq('store_id', validatedData.storeId)
            .eq('is_active', true);

          if (zonesError) {
            console.error("❌ Delivery zones fetch error:", zonesError);
            throw zonesError;
          }

          if (!zones || zones.length === 0) {
            throw new Error("A loja não possui zonas de entrega configuradas. Entre em contato com a loja.");
          }

          const deliveryCity = (validatedData as any).deliveryCity as string | undefined;
          const normalizedCity = deliveryCity ? deliveryCity.toLowerCase().trim() : '';
          const normalizedNeighborhood = validatedData.deliveryNeighborhood
            ? validatedData.deliveryNeighborhood.toLowerCase().trim()
            : '';

          // Tenta casar primeiro zona específica de bairro
          const neighborhoodZone = zones.find((zone: any) =>
            zone.city.toLowerCase().trim() === normalizedCity &&
            zone.neighborhood &&
            zone.neighborhood.toLowerCase().trim() === normalizedNeighborhood
          );

          // Se não houver zona específica, tenta zona genérica da cidade
          const cityZone = zones.find((zone: any) =>
            zone.city.toLowerCase().trim() === normalizedCity &&
            !zone.neighborhood
          );

          const matchedZone = neighborhoodZone || cityZone;

          if (!matchedZone) {
            throw new Error(
              `Fora da área de entrega para ${deliveryCity || 'sua cidade'}${
                validatedData.deliveryNeighborhood ? ` - ${validatedData.deliveryNeighborhood}` : ''
              }.`
            );
          }

          deliveryFee = Number(matchedZone.delivery_fee) || 0;
        } else {
          // Sem restrição por zona: usa taxa padrão da loja
          deliveryFee = baseDeliveryFee;
        }
      }

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
          delivery_city: (validatedData as any).deliveryCity || null,
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

      // 🎯 Registrar comissão de afiliado se o pedido tiver cupom vinculado a um afiliado
      if (validatedData.couponCode) {
        try {
          // Buscar cupom pelo código
          const { data: coupon } = await supabase
            .from('coupons')
            .select('id, discount_type, discount_value')
            .eq('store_id', validatedData.storeId)
            .ilike('code', validatedData.couponCode)
            .single();

          if (coupon) {
            // 1. Primeiro buscar na junction table store_affiliate_coupons
            let storeAffiliate: any = null;
            const { data: sacData } = await supabase
              .from('store_affiliate_coupons')
              .select(`
                store_affiliate_id,
                store_affiliates!inner(
                  id, store_id, default_commission_type, default_commission_value, is_active
                )
              `)
              .eq('coupon_id', coupon.id)
              .single();

            if (sacData?.store_affiliates && (sacData.store_affiliates as any).store_id === validatedData.storeId && (sacData.store_affiliates as any).is_active) {
              storeAffiliate = sacData.store_affiliates;
            } else {
              // 2. Fallback: buscar pelo coupon_id direto em store_affiliates (legacy)
              const { data: saData } = await supabase
                .from('store_affiliates')
                .select('id, default_commission_type, default_commission_value')
                .eq('store_id', validatedData.storeId)
                .eq('coupon_id', coupon.id)
                .eq('is_active', true)
                .maybeSingle();
              storeAffiliate = saData;
            }

            // 3. Buscar affiliate legado (para regras de comissão e compatibilidade)
            const { data: legacyAffiliate } = await supabase
              .from('affiliates')
              .select('id, default_commission_type, default_commission_value')
              .eq('store_id', validatedData.storeId)
              .eq('coupon_id', coupon.id)
              .eq('is_active', true)
              .maybeSingle();

            // 4. Buscar regras de comissão específicas (se existir affiliate legado)
            let commissionRules: any[] = [];
            if (legacyAffiliate) {
              const { data: rules } = await supabase
                .from('affiliate_commission_rules')
                .select('*')
                .eq('affiliate_id', legacyAffiliate.id)
                .eq('is_active', true);
              commissionRules = rules || [];
            }

            if (storeAffiliate || legacyAffiliate) {
              let totalCommission = 0;
              const commissionType = storeAffiliate?.default_commission_type || legacyAffiliate?.default_commission_type || 'percentage';
              const commissionValue = storeAffiliate?.default_commission_value || legacyAffiliate?.default_commission_value || 0;

              // 5. Se há regras específicas, calcular por item
              if (commissionRules.length > 0) {
                for (const item of validatedData.items) {
                  const itemSubtotal = item.unitPrice * item.quantity;
                  
                  // Buscar produto para obter categoria
                  const { data: product } = await supabase
                    .from('products')
                    .select('category')
                    .eq('id', item.productId)
                    .maybeSingle();
                  
                  // Verificar regra por produto (maior prioridade)
                  const productRule = commissionRules.find((r: any) => 
                    r.applies_to === 'product' && r.product_id === item.productId
                  );
                  
                  // Verificar regra por categoria
                  const categoryRule = commissionRules.find((r: any) => 
                    r.applies_to === 'category' && r.category_name === product?.category
                  );
                  
                  // Usar regra específica ou default
                  const rule = productRule || categoryRule;
                  
                  if (rule) {
                    if (rule.commission_type === 'percentage') {
                      totalCommission += (itemSubtotal * rule.commission_value) / 100;
                    } else {
                      totalCommission += rule.commission_value;
                    }
                  } else {
                    // Usar comissão default
                    if (commissionType === 'percentage') {
                      totalCommission += (itemSubtotal * commissionValue) / 100;
                    } else {
                      totalCommission += commissionValue;
                    }
                  }
                }
              } else {
                // 6. Sem regras específicas, calcular sobre o subtotal (sem taxa de entrega)
                if (commissionType === 'percentage') {
                  totalCommission = (subtotal * commissionValue) / 100;
                } else {
                  totalCommission = commissionValue;
                }
              }

              // 7. Registrar comissão
              const { error: earningsError } = await supabase
                .from('affiliate_earnings')
                .insert({
                  affiliate_id: legacyAffiliate?.id || storeAffiliate.id,
                  store_affiliate_id: storeAffiliate?.id || null,
                  order_id: createdOrder.id,
                  order_total: total,
                  commission_type: commissionType,
                  commission_value: commissionValue,
                  commission_amount: totalCommission,
                  status: 'pending'
                });

              if (earningsError) {
                console.warn('⚠️ Erro ao registrar comissão de afiliado:', earningsError);
              } else {
                console.log('✅ Comissão de afiliado registrada:', {
                  affiliateId: legacyAffiliate?.id,
                  storeAffiliateId: storeAffiliate?.id,
                  commissionType,
                  commissionValue,
                  commissionAmount: totalCommission,
                  rulesApplied: commissionRules.length,
                  orderId: createdOrder.id
                });
              }
            }
          }
        } catch (affiliateError) {
          console.warn('⚠️ Erro ao processar afiliado:', affiliateError);
          // Não falhar o pedido por causa de erro de afiliado
        }
      }

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
