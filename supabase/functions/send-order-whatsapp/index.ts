import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const EVOLUTION_API_URL = "https://evolu-evolution-buttons.12l3kp.easypanel.host";
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  observation?: string;
  order_item_addons?: Array<{
    addon_name: string;
    addon_price: number;
  }>;
  order_item_flavors?: Array<{
    flavor_name: string;
    flavor_price: number;
  }>;
}

interface OrderData {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  delivery_type: string;
  delivery_street?: string;
  delivery_number?: string;
  delivery_neighborhood?: string;
  delivery_complement?: string;
  payment_method: string;
  change_amount?: number;
  notes?: string;
  status: string;
  store_id: string;
  order_items?: OrderItem[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { record } = await req.json();
    console.log('Processing order:', record);

    if (!record.customer_phone) {
      console.log('No customer phone provided');
      return new Response(
        JSON.stringify({ success: false, message: 'No phone number' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch complete order data with items
    const { data: orderData, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_name,
          quantity,
          unit_price,
          subtotal,
          observation,
          order_item_addons (
            addon_name,
            addon_price
          ),
          order_item_flavors (
            flavor_name,
            flavor_price
          )
        )
      `)
      .eq('id', record.id || record.order_id)
      .single();

    if (orderError || !orderData) {
      console.error('Order not found:', orderError);
      // Fallback to record data if full fetch fails
      var order = record;
    } else {
      var order = orderData;
    }

    // Get store details
    const { data: store, error: storeError } = await supabaseClient
      .from('stores')
      .select('name, phone, address')
      .eq('id', order.store_id)
      .single();

    if (storeError || !store) {
      console.error('Store not found:', storeError);
      return new Response(
        JSON.stringify({ success: false, message: 'Store not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get WhatsApp instance from store_instances table
    const { data: storeInstance, error: instanceError } = await supabaseClient
      .from('store_instances')
      .select('evolution_instance_id')
      .eq('store_id', order.store_id)
      .single();

    if (instanceError || !storeInstance?.evolution_instance_id) {
      console.error('WhatsApp instance not found:', instanceError);
      return new Response(
        JSON.stringify({ success: false, message: 'WhatsApp not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get status configuration and message
    const { data: statusConfig, error: statusError } = await supabaseClient
      .from('order_status_configs')
      .select('whatsapp_message, is_active')
      .eq('store_id', order.store_id)
      .eq('status_key', record.status)
      .single();

    if (statusError || !statusConfig || !statusConfig.is_active) {
      console.log('No active status config found for:', record.status);
      return new Response(
        JSON.stringify({ success: false, message: 'Status not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!statusConfig.whatsapp_message) {
      console.log('No WhatsApp message configured for status:', record.status);
      return new Response(
        JSON.stringify({ success: false, message: 'No message configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format order items list
    let itemsList = '';
    if (order.order_items && order.order_items.length > 0) {
      itemsList = order.order_items.map((item: OrderItem) => {
        let itemText = `${item.quantity}x ${item.product_name}`;
        
        // Add flavors if any
        if (item.order_item_flavors && item.order_item_flavors.length > 0) {
          const flavors = item.order_item_flavors.map(f => f.flavor_name).join(', ');
          itemText += ` (${flavors})`;
        }
        
        // Add addons if any
        if (item.order_item_addons && item.order_item_addons.length > 0) {
          const addons = item.order_item_addons.map(a => 
            `+ ${a.addon_name} (R$ ${a.addon_price.toFixed(2)})`
          ).join('\n  ');
          itemText += `\n  ${addons}`;
        }
        
        itemText += ` - R$ ${item.subtotal.toFixed(2)}`;
        
        // Add observation if any
        if (item.observation) {
          itemText += `\n  Obs: ${item.observation}`;
        }
        
        return itemText;
      }).join('\n\n');
    }

    // Format delivery address
    let deliveryAddress = '';
    if (order.delivery_type === 'delivery' && order.delivery_street) {
      deliveryAddress = order.delivery_street;
      if (order.delivery_number) deliveryAddress += `, ${order.delivery_number}`;
      if (order.delivery_neighborhood) deliveryAddress += ` - ${order.delivery_neighborhood}`;
      if (order.delivery_complement) deliveryAddress += `\nComplemento: ${order.delivery_complement}`;
    }

    // Format payment method
    const paymentMethodMap: { [key: string]: string } = {
      'pix': 'PIX',
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'money': 'Dinheiro',
      'voucher': 'Vale Refeição'
    };
    const paymentMethod = paymentMethodMap[order.payment_method] || order.payment_method;

    // Replace variables in message
    let message = statusConfig.whatsapp_message;
    message = message.replace(/\{\{customer_name\}\}/g, order.customer_name || 'Cliente');
    message = message.replace(/\{\{order_number\}\}/g, order.order_number || '');
    message = message.replace(/\{\{total\}\}/g, order.total?.toFixed(2) || '0.00');
    message = message.replace(/\{\{subtotal\}\}/g, order.subtotal?.toFixed(2) || '0.00');
    message = message.replace(/\{\{delivery_fee\}\}/g, order.delivery_fee?.toFixed(2) || '0.00');
    message = message.replace(/\{\{delivery_type\}\}/g, order.delivery_type === 'delivery' ? 'Entrega' : 'Retirada');
    message = message.replace(/\{\{store_name\}\}/g, store.name || '');
    message = message.replace(/\{\{store_phone\}\}/g, store.phone || '');
    message = message.replace(/\{\{store_address\}\}/g, store.address || '');
    message = message.replace(/\{\{items\}\}/g, itemsList);
    message = message.replace(/\{\{delivery_address\}\}/g, deliveryAddress);
    message = message.replace(/\{\{payment_method\}\}/g, paymentMethod);
    message = message.replace(/\{\{change_amount\}\}/g, order.change_amount?.toFixed(2) || '0.00');
    message = message.replace(/\{\{notes\}\}/g, order.notes || '');

    // Handle conditional blocks
    const deliveryConditionRegex = /\{\{#if_delivery\}\}(.*?)\{\{else\}\}(.*?)\{\{\/if_delivery\}\}/gs;
    message = message.replace(deliveryConditionRegex, (_match: string, ifContent: string, elseContent: string) => {
      return order.delivery_type === 'delivery' ? ifContent : elseContent;
    });

    // Clean phone number
    let phone = order.customer_phone.replace(/\D/g, '');
    if (!phone.startsWith('55')) {
      phone = '55' + phone;
    }

    console.log('Sending message to:', phone, 'via instance:', storeInstance.evolution_instance_id);

    // Send message via Evolution API
    const evolutionResponse = await fetch(`${EVOLUTION_API_URL}/message/sendText/${storeInstance.evolution_instance_id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY || '',
      },
      body: JSON.stringify({
        number: phone,
        text: message,
        delay: 1000
      }),
    });

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text();
      console.error('Evolution API Error:', errorText);
      throw new Error(`Failed to send WhatsApp message: ${errorText}`);
    }

    const evolutionData = await evolutionResponse.json();
    console.log('Message sent successfully:', evolutionData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'WhatsApp message sent',
        data: evolutionData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-order-whatsapp:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
