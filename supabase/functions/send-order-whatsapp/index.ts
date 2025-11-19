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

    // ⏳ Aguardar 3s antes de enviar para evitar duplicidade e garantir itens na view
    await new Promise((resolve) => setTimeout(resolve, 3000));


    // 🔒 IDEMPOTÊNCIA: Verificar se já enviamos mensagem para este pedido+status
    const orderStatus = record.status || 'pending';
    const { data: existingLog } = await supabaseClient
      .from('whatsapp_message_log')
      .select('id')
      .eq('order_id', record.id || record.order_id)
      .eq('order_status', orderStatus)
      .single();

    if (existingLog) {
      console.log(`💬 Mensagem já enviada para order ${record.id || record.order_id} status ${orderStatus}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Message already sent', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!record.customer_phone) {
      console.log('No customer phone provided');
      return new Response(
        JSON.stringify({ success: false, message: 'No phone number' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch complete order data from view (with retry logic for items)
    let order: any = null;
    let retryCount = 0;
    const maxRetries = 5;
    
    while (retryCount < maxRetries && !order) {
      const { data: orderData, error: orderError } = await supabaseClient
        .from('order_complete_view')
        .select('*')
        .eq('id', record.id || record.order_id)
        .single();

      if (orderError) {
        console.error(`Order fetch attempt ${retryCount + 1} failed:`, orderError);
        retryCount++;
        if (retryCount < maxRetries) {
          // Wait 1 second before retry to allow items to be inserted
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else if (orderData && Array.isArray(orderData.items) && orderData.items.length > 0) {
        // Successfully got order with items
        order = {
          ...orderData,
          order_items: orderData.items
        };
        console.log('Order fetched successfully with items:', orderData.items.length);
      } else if (orderData) {
        // Got order but no items yet, retry
        console.warn(`Order fetched but no items yet (attempt ${retryCount + 1})`);
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Use order data even without items on last attempt
          order = {
            ...orderData,
            order_items: []
          };
        }
      }
    }

    // If still no order data after retries, use record as fallback
    if (!order) {
      console.warn('Using fallback record data (no order_items available)');
      order = { ...record, order_items: [] };
    }

    const { data: store, error: storeError } = await supabaseClient
      .from('stores')
      .select('name, phone, address, pickup_address, slug, pix_key, pix_message_enabled, pix_message_title, pix_message_description, pix_message_footer, pix_message_button_text, pix_copiacola_message_button_text')
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
      itemsList = order.order_items.map((item: any) => {
        let itemText = `${item.quantity}x ${item.product_name}`;
        
        // Add flavors if any
        if (item.flavors && Array.isArray(item.flavors) && item.flavors.length > 0) {
          const flavors = item.flavors.map((f: any) => f.flavor_name).join(', ');
          itemText += ` (${flavors})`;
        }
        
        // Add addons if any
        if (item.addons && Array.isArray(item.addons) && item.addons.length > 0) {
          const addons = item.addons.map((a: any) => 
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

    // Format delivery address (for delivery orders)
    let deliveryAddress = '';
    if (order.delivery_type === 'delivery' && order.delivery_street) {
      deliveryAddress = order.delivery_street;
      if (order.delivery_number) deliveryAddress += `, ${order.delivery_number}`;
      if (order.delivery_neighborhood) deliveryAddress += ` - ${order.delivery_neighborhood}`;
      if (order.delivery_complement) deliveryAddress += `\nComplemento: ${order.delivery_complement}`;
    }
 
    // Determine pickup address (for retirada)
    let pickupAddress = store.pickup_address || '';
    if (order.delivery_type === 'pickup' && !pickupAddress) {
      const { data: pickupLocation } = await supabaseClient
        .from('store_pickup_locations')
        .select('address')
        .eq('store_id', order.store_id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .maybeSingle();
 
      if (pickupLocation?.address) {
        pickupAddress = pickupLocation.address;
      }
    }
 
    // Format unified address (delivery or pickup)
    let unifiedAddress = '';
    if (order.delivery_type === 'delivery') {
      unifiedAddress = deliveryAddress;
    } else {
      unifiedAddress = pickupAddress;
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
    message = message.replace(/\{\{delivery_location_label\}\}/g, order.delivery_type === 'delivery' ? 'LOCAL DE ENTREGA' : 'LOCAL DE RETIRADA');
    message = message.replace(/\{\{store_name\}\}/g, store.name || '');
    message = message.replace(/\{\{store_phone\}\}/g, store.phone || '');
    message = message.replace(/\{\{store_address\}\}/g, store.address || '');
    message = message.replace(/\{\{store_url\}\}/g, store.slug ? `https://nuvenshop.app/${store.slug}` : '');
    message = message.replace(/\{\{pickup_address\}\}/g, pickupAddress || '');
    message = message.replace(/\{\{address\}\}/g, unifiedAddress);
    message = message.replace(/\{\{items\}\}/g, itemsList);
    message = message.replace(/\{\{delivery_address\}\}/g, deliveryAddress);
    message = message.replace(/\{\{payment_method\}\}/g, paymentMethod);
    message = message.replace(/\{\{change_amount\}\}/g, order.change_amount?.toFixed(2) || '0.00');
    message = message.replace(/\{\{botao_pix_copiacola\}\}/g, store.pix_copiacola_message_button_text || '📋 COPIAR CÓDIGO PIX');
    message = message.replace(/\{\{notes\}\}/g, order.notes || '');

    // Handle conditional blocks
    const deliveryConditionRegex = /\{\{#if_delivery\}\}(.*?)\{\{else\}\}(.*?)\{\{\/if_delivery\}\}/gs;
    message = message.replace(deliveryConditionRegex, (_match: string, ifContent: string, elseContent: string) => {
      return order.delivery_type === 'delivery' ? ifContent : elseContent;
    });

    // Phone is already normalized in database (includes 55)
    const phone = order.customer_phone;

    console.log('Sending message to:', phone, 'via instance:', storeInstance.evolution_instance_id);

    // Check instance connection status first
    const statusResponse = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${storeInstance.evolution_instance_id}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY || '',
      },
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('Instance connection status:', statusData);
      
      // Extract state from response (can be at root or nested in instance object)
      const state = statusData.state || statusData.instance?.state;
      console.log('Extracted state:', state);
      
      // Check if instance is connected
      if (state !== 'open' && state !== 'connected') {
        console.error('WhatsApp instance not connected. State:', state);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'WhatsApp não está conectado. Por favor, conecte o WhatsApp no painel da loja.',
            state: state
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.log('WhatsApp instance is connected, proceeding with message send');
    } else {
      console.warn('Could not check instance status, proceeding with message send');
    }

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
      
      // Check if it's a connection closed error
      if (errorText.includes('Connection Closed')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'WhatsApp não está conectado. Por favor, conecte o WhatsApp no painel da loja.',
            error: 'Connection closed'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw new Error(`Failed to send WhatsApp message: ${errorText}`);
    }

    const evolutionData = await evolutionResponse.json();
    console.log('Message sent successfully:', evolutionData);

    // 📝 REGISTRAR mensagem enviada no log (idempotência)
    try {
      await supabaseClient
        .from('whatsapp_message_log')
        .insert({
          order_id: record.id || record.order_id,
          order_status: record.status || 'pending',
          phone_number: phone,
          message_content: message
        });
      console.log('✅ Mensagem registrada no log de idempotência');
    } catch (logError) {
      console.warn('⚠️ Erro ao registrar no log (não crítico):', logError);
    }

    // 💳 ENVIAR MENSAGEM COM BOTÃO PIX (se configurado e método for PIX)
    if (
      store.pix_message_enabled &&
      store.pix_key &&
      order.payment_method === 'pix'
    ) {
      console.log('💳 Enviando mensagem PIX com botão...');
      
      // Aguardar 2 segundos após a primeira mensagem
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const pixButtonMessage = {
          number: phone,
          title: store.pix_message_title || '💳 Pagamento via PIX',
          description: store.pix_message_description || 'Clique no botão abaixo para copiar o código PIX, favor enviar o comprovante após o pagamento.',
          footer: store.pix_message_footer || 'Obrigado pela preferência!',
          buttons: [
            {
              type: 'copy',
              id: 'pix_copia_cola',
              displayText: store.pix_message_button_text || '📋 COPIAR CHAVE PIX',
              copyCode: store.pix_key,
            },
          ],
        };

        console.log('Enviando botão PIX:', JSON.stringify(pixButtonMessage, null, 2));

        const pixResponse = await fetch(
          `${EVOLUTION_API_URL}/message/sendButtons/${storeInstance.evolution_instance_id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY || '',
            },
            body: JSON.stringify(pixButtonMessage),
          }
        );

        if (pixResponse.ok) {
          const pixData = await pixResponse.json();
          console.log('✅ Mensagem PIX com botão enviada com sucesso:', pixData);
          
          // Registrar mensagem PIX no log
          try {
            await supabaseClient
              .from('whatsapp_message_log')
              .insert({
                order_id: record.id || record.order_id,
                order_status: 'pix_button_sent',
                phone_number: phone,
                message_content: JSON.stringify(pixButtonMessage),
              });
            console.log('✅ Mensagem PIX registrada no log');
          } catch (logError) {
            console.warn('⚠️ Erro ao registrar mensagem PIX no log:', logError);
          }
        } else {
          const errorText = await pixResponse.text();
          console.error('❌ Erro ao enviar mensagem PIX:', errorText);
        }
      } catch (pixError) {
        console.error('❌ Erro ao enviar botão PIX:', pixError);
        // Não interromper o fluxo principal se o botão PIX falhar
      }
    }

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
