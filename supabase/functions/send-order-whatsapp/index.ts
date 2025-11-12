import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const EVOLUTION_API_URL = "https://evolu-evolution-buttons.12l3kp.easypanel.host";
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderData {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  delivery_type: string;
  status: string;
  store_id: string;
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

    // Use order data from realtime payload
    const order = record;

    // Get store details
    const { data: store, error: storeError } = await supabaseClient
      .from('stores')
      .select('name, whatsapp_instance')
      .eq('id', order.store_id)
      .single();

    if (storeError || !store || !store.whatsapp_instance) {
      console.error('Store or WhatsApp instance not found:', storeError);
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

    // Replace variables in message
    let message = statusConfig.whatsapp_message;
    message = message.replace(/\{\{customer_name\}\}/g, order.customer_name || 'Cliente');
    message = message.replace(/\{\{order_number\}\}/g, order.order_number || '');
    message = message.replace(/\{\{total\}\}/g, order.total?.toFixed(2) || '0.00');
    message = message.replace(/\{\{delivery_type\}\}/g, order.delivery_type === 'delivery' ? 'Entrega' : 'Retirada');
    message = message.replace(/\{\{store_name\}\}/g, store.name || '');

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

    console.log('Sending message to:', phone, 'via instance:', store.whatsapp_instance);

    // Send message via Evolution API
    const evolutionResponse = await fetch(`${EVOLUTION_API_URL}/message/sendText/${store.whatsapp_instance}`, {
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
