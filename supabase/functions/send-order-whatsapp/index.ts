// Edge Function para enviar notificações via WhatsApp usando Evolution API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const EVOLUTION_API_URL = "https://evolu-evolution-buttons.12l3kp.easypanel.host";
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

if (!EVOLUTION_API_KEY) {
  console.error('EVOLUTION_API_KEY not configured');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema for webhook payload
const webhookPayloadSchema = z.object({
  type: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  record: z.object({
    id: z.string().uuid(),
    status: z.string().optional(),
  }),
  old_record: z.object({
    status: z.string().optional(),
  }).optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!EVOLUTION_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'EVOLUTION_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const rawPayload = await req.json();
    console.log('Webhook payload:', rawPayload);

    // Validate webhook payload
    const payload = webhookPayloadSchema.parse(rawPayload);

    const { type, record, old_record } = payload;
    const orderId = record.id;

    // Buscar dados completos do pedido
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          order_item_addons (*),
          order_item_flavors (*)
        ),
        stores (
          name,
          whatsapp_instance,
          whatsapp_phone
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const store = order.stores;
    if (!store?.whatsapp_instance || !store?.whatsapp_phone) {
      console.log('Store has no WhatsApp configured');
      return new Response(JSON.stringify({ message: 'No WhatsApp configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Formatar mensagem
    let message = '';
    
    if (type === 'INSERT') {
      message = `🛒 *Novo Pedido #${order.order_number}*\n\n`;
      message += `Olá *${order.customer_name}*!\n\n`;
      message += `Recebemos seu pedido na *${store.name}*\n\n`;
    } else if (type === 'UPDATE' && old_record?.status !== record.status) {
      message = `📦 *Atualização do Pedido #${order.order_number}*\n\n`;
      message += `Olá *${order.customer_name}*!\n\n`;
      
      const statusMap: Record<string, string> = {
        'pending': '⏳ Pendente',
        'confirmed': '✅ Confirmado',
        'preparing': '👨‍🍳 Em Preparo',
        'ready': '✅ Pronto',
        'in_delivery': '🚗 Saiu para Entrega',
        'delivered': '🎉 Entregue',
        'cancelled': '❌ Cancelado'
      };
      
      message += `Status atualizado: ${statusMap[order.status] || order.status}\n\n`;
    } else {
      // Não é uma mudança relevante
      return new Response(JSON.stringify({ message: 'No notification needed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Adicionar itens do pedido
    message += `*Itens do Pedido:*\n`;
    for (const item of order.order_items || []) {
      message += `\n• ${item.quantity}x ${item.product_name}`;
      
      // Adicionar sabores se houver
      if (item.order_item_flavors && item.order_item_flavors.length > 0) {
        const flavors = item.order_item_flavors.map((f: any) => f.flavor_name).join(', ');
        message += `\n  Sabores: ${flavors}`;
      }
      
      // Adicionar adicionais se houver
      if (item.order_item_addons && item.order_item_addons.length > 0) {
        const addons = item.order_item_addons.map((a: any) => a.addon_name).join(', ');
        message += `\n  Adicionais: ${addons}`;
      }
      
      // Adicionar observação se houver
      if (item.observation) {
        message += `\n  Obs: ${item.observation}`;
      }
      
      message += `\n  R$ ${Number(item.subtotal).toFixed(2)}`;
    }

    // Adicionar totais
    message += `\n\n*Subtotal:* R$ ${Number(order.subtotal).toFixed(2)}`;
    if (order.delivery_fee > 0) {
      message += `\n*Taxa de Entrega:* R$ ${Number(order.delivery_fee).toFixed(2)}`;
    }
    message += `\n*Total:* R$ ${Number(order.total).toFixed(2)}`;

    // Adicionar informações de pagamento e entrega
    message += `\n\n*Forma de Pagamento:* ${order.payment_method === 'pix' ? 'PIX' : order.payment_method === 'card' ? 'Cartão' : 'Dinheiro'}`;
    
    if (order.payment_method === 'cash' && order.change_amount) {
      message += `\n*Troco para:* R$ ${Number(order.change_amount).toFixed(2)}`;
    }

    if (order.delivery_type === 'delivery') {
      message += `\n\n*Entrega em:*\n${order.delivery_street}, ${order.delivery_number}\n${order.delivery_neighborhood}`;
      if (order.delivery_complement) {
        message += `\n${order.delivery_complement}`;
      }
    } else {
      message += `\n\n*Tipo:* Retirada no Local`;
    }

    if (order.notes) {
      message += `\n\n*Observações:* ${order.notes}`;
    }

    // Sanitize phone number (remove all non-digits)
    const sanitizedPhone = order.customer_phone.replace(/\D/g, '');
    
    // Validate phone number (must be 10 or 11 digits)
    if (sanitizedPhone.length < 10 || sanitizedPhone.length > 11) {
      throw new Error('Invalid phone number format');
    }

    // Enviar mensagem via Evolution API
    const sendResponse = await fetch(`${EVOLUTION_API_URL}/message/sendText/${store.whatsapp_instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: sanitizedPhone,
        text: message
      }),
    });

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      console.error('Evolution API Error:', errorText);
      throw new Error(`Failed to send message: ${errorText}`);
    }

    const sendData = await sendResponse.json();
    console.log('Message sent successfully:', sendData);

    return new Response(
      JSON.stringify({ success: true, message: 'WhatsApp sent', data: sendData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-order-whatsapp:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
