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
    
    // ====== LOGS DETALHADOS PARA DEBUGGING ======
    console.log('=== SEND-ORDER-WHATSAPP INICIADO ===');
    console.log('EVOLUTION_API_KEY presente:', !!EVOLUTION_API_KEY);
    console.log('EVOLUTION_API_URL:', EVOLUTION_API_URL);
    console.log('Order ID:', record?.id || record?.order_id);
    console.log('Store ID:', record?.store_id);
    console.log('Status:', record?.status);
    console.log('Customer Phone:', record?.customer_phone);
    console.log('Customer Name:', record?.customer_name);
    
    // Verificar se a API key está configurada
    if (!EVOLUTION_API_KEY) {
      console.error('❌ EVOLUTION_API_KEY não configurada nos secrets do Supabase');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'EVOLUTION_API_KEY não configurada. Configure o secret no painel do Supabase.' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('✅ API key verificada com sucesso');
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
      console.log(`💬 IDEMPOTÊNCIA: Mensagem já enviada para order ${record.id || record.order_id} status ${orderStatus}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Message already sent', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Verificação de idempotência passou - nenhuma mensagem anterior encontrada');

    if (!record.customer_phone) {
      console.error('❌ TELEFONE AUSENTE: Pedido sem número de telefone do cliente');
      return new Response(
        JSON.stringify({ success: false, message: 'No phone number' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Telefone do cliente validado:', record.customer_phone);

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
      .select('name, phone, address, pickup_address, slug, pix_key, pix_message_enabled, pix_message_title, pix_message_description, pix_message_footer, pix_message_button_text, pix_copiacola_message_enabled, pix_copiacola_message_title, pix_copiacola_message_description, pix_copiacola_message_footer, pix_copiacola_message_button_text, pix_copiacola_button_text')
      .eq('id', order.store_id)
      .single();
 
     if (storeError || !store) {
       console.error('❌ LOJA NÃO ENCONTRADA:', storeError);
       console.error('Store ID buscado:', order.store_id);
       return new Response(
         JSON.stringify({ success: false, message: 'Store not found' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
     
     console.log('✅ Loja encontrada:', store.name);
 
     // Get WhatsApp instance from store_instances table
     const { data: storeInstance, error: instanceError } = await supabaseClient
       .from('store_instances')
       .select('evolution_instance_id')
       .eq('store_id', order.store_id)
       .single();

    if (instanceError || !storeInstance?.evolution_instance_id) {
      console.error('❌ INSTÂNCIA WHATSAPP NÃO CONFIGURADA');
      console.error('Erro ao buscar instância:', instanceError);
      console.error('Store ID:', order.store_id);
      console.error('Dados retornados:', storeInstance);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'WhatsApp não configurado para esta loja. Configure a instância no painel Evolution API.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Instância WhatsApp encontrada:', storeInstance.evolution_instance_id);

    // Normaliza o status do banco (enum) para a chave usada nas configurações da loja
    const normalizeStatusForConfig = (dbStatus: string): string => {
      // Mapeamentos padrão entre enum do banco e chaves personalizadas mais comuns
      const statusMap: Record<string, string> = {
        // Enum -> chaves em português usadas nas configs
        'pending': 'pendente',
        'confirmed': 'confirmado',
        'preparing': 'separação',
        'ready': 'pronto',
        'in_delivery': 'a_caminho',
        'delivered': 'entregue',
        'cancelled': 'cancelado',
        'out_for_delivery': 'a_caminho', // compatibilidade
      };
      return statusMap[dbStatus] || dbStatus;
    };

    const statusKeyToSearch = normalizeStatusForConfig(record.status);
    console.log(`Buscando configuração para status: ${record.status} -> ${statusKeyToSearch}`);

    // Get status configuration and message
    const { data: statusConfig, error: statusError } = await supabaseClient
      .from('order_status_configs')
      .select('whatsapp_message, is_active')
      .eq('store_id', order.store_id)
      .eq('status_key', statusKeyToSearch)
      .single();

    if (statusError || !statusConfig || !statusConfig.is_active) {
      console.error('❌ CONFIGURAÇÃO DE STATUS NÃO ENCONTRADA OU INATIVA');
      console.error('Status original:', record.status);
      console.error('Status buscado:', statusKeyToSearch);
      console.error('Store ID:', order.store_id);
      console.error('Erro:', statusError);
      console.error('Config encontrada:', statusConfig);
      console.error('is_active:', statusConfig?.is_active);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Status "${record.status}" não está configurado ou ativo no painel de configurações de status da loja.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Configuração de status encontrada e ativa');

    if (!statusConfig.whatsapp_message) {
      console.error('❌ MENSAGEM WHATSAPP NÃO CONFIGURADA para status:', record.status);
      console.error('Configure uma mensagem no painel de configurações de status');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Mensagem WhatsApp não configurada para o status "${record.status}". Configure no painel.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Mensagem WhatsApp configurada para o status');

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
    message = message.replace(/\{\{store_url\}\}/g, store.slug ? `https://ofertas.app/${store.slug}` : '');
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

    console.log('=== PREPARANDO ENVIO ===');
    console.log('Telefone destino:', phone);
    console.log('Instância Evolution:', storeInstance.evolution_instance_id);
    console.log('Tamanho da mensagem:', message.length, 'caracteres');
    console.log('Prévia da mensagem (100 primeiros chars):', message.substring(0, 100));

    // Check instance connection status first
    console.log('Verificando status de conexão da instância...');
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
        console.error('❌ INSTÂNCIA WHATSAPP NÃO CONECTADA');
        console.error('Estado atual:', state);
        console.error('Estados válidos: "open" ou "connected"');
        console.error('Instância:', storeInstance.evolution_instance_id);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'WhatsApp não está conectado. Por favor, conecte o WhatsApp escaneando o QR Code no painel da loja.',
            state: state,
            instance: storeInstance.evolution_instance_id
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.log('✅ WhatsApp conectado (state:', state + '), prosseguindo com envio');
    } else {
      console.warn('⚠️ Não foi possível verificar status da conexão, prosseguindo com envio');
      console.warn('Status HTTP:', statusResponse.status);
    }

    // Send message via Evolution API
    console.log('=== ENVIANDO MENSAGEM VIA EVOLUTION API ===');
    console.log('URL:', `${EVOLUTION_API_URL}/message/sendText/${storeInstance.evolution_instance_id}`);
    
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
      console.error('❌ ERRO NA EVOLUTION API');
      console.error('Status HTTP:', evolutionResponse.status);
      console.error('Status Text:', evolutionResponse.statusText);
      console.error('Resposta completa:', errorText);
      console.error('Instância:', storeInstance.evolution_instance_id);
      console.error('Telefone:', phone);
      
      // Check if it's a connection closed error
      if (errorText.includes('Connection Closed')) {
        console.error('Erro específico: Conexão fechada - WhatsApp desconectado');
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'WhatsApp não está conectado. Por favor, conecte o WhatsApp escaneando o QR Code no painel da loja.',
            error: 'Connection closed',
            details: errorText
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw new Error(`Failed to send WhatsApp message (${evolutionResponse.status}): ${errorText}`);
    }

    const evolutionData = await evolutionResponse.json();
    console.log('✅ MENSAGEM ENVIADA COM SUCESSO');
    console.log('Resposta Evolution API:', JSON.stringify(evolutionData, null, 2));

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

    // 💳 ENVIAR MENSAGEM COM BOTÃO PIX CHAVE FIXA (apenas na primeira mensagem - pending)
    if (
      store.pix_message_enabled &&
      store.pix_key &&
      order.payment_method === 'pix' &&
      orderStatus === 'pending'
    ) {
      console.log('💳 Enviando mensagem PIX chave fixa com botão...');
      
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
              id: 'pix_chave_fixa',
              displayText: store.pix_message_button_text || '📋 COPIAR CHAVE PIX',
              copyCode: store.pix_key,
            },
          ],
        };

        console.log('Enviando botão PIX chave fixa:', JSON.stringify(pixButtonMessage, null, 2));

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
          console.log('✅ Mensagem PIX chave fixa enviada com sucesso:', pixData);
          
          // Registrar mensagem PIX no log
          try {
            await supabaseClient
              .from('whatsapp_message_log')
              .insert({
                order_id: record.id || record.order_id,
                order_status: 'pix_key_button_sent',
                phone_number: phone,
                message_content: JSON.stringify(pixButtonMessage),
              });
            console.log('✅ Mensagem PIX chave fixa registrada no log');
          } catch (logError) {
            console.warn('⚠️ Erro ao registrar mensagem PIX no log:', logError);
          }
        } else {
          const errorText = await pixResponse.text();
          console.error('❌ Erro ao enviar mensagem PIX chave fixa:', errorText);
        }
      } catch (pixError) {
        console.error('❌ Erro ao enviar botão PIX chave fixa:', pixError);
        // Não interromper o fluxo principal se o botão PIX falhar
      }
    }

    // 💳 ENVIAR MENSAGEM COM PIX COPIA E COLA GERADO (apenas na primeira mensagem - pending)
    if (
      store.pix_copiacola_message_enabled &&
      store.pix_key &&
      order.payment_method === 'pix' &&
      orderStatus === 'pending'
    ) {
      console.log('💳 Gerando e enviando código PIX Copia e Cola...');
      
      // Aguardar 2 segundos após a mensagem anterior
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        // Função para gerar código PIX Copia e Cola (EMV)
        const generatePixCopiaCola = (pixKey: string, amount: number, merchantName: string, txId: string): string => {
          const formatEMV = (id: string, value: string): string => {
            const length = value.length.toString().padStart(2, '0');
            return `${id}${length}${value}`;
          };

          const crc16 = (data: string): string => {
            const CRC16_TABLE = [
              0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
              0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
              0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
              0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de,
              0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485,
              0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
              0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4,
              0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc,
              0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
              0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
              0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12,
              0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
              0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41,
              0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
              0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
              0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
              0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
              0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
              0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e,
              0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256,
              0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
              0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
              0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
              0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
              0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab,
              0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3,
              0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
              0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92,
              0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9,
              0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
              0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8,
              0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0,
            ];
            let crc = 0xFFFF;
            for (let i = 0; i < data.length; i++) {
              const byte = data.charCodeAt(i);
              crc = ((crc << 8) ^ CRC16_TABLE[((crc >> 8) ^ byte) & 0xFF]) & 0xFFFF;
            }
            return crc.toString(16).toUpperCase().padStart(4, '0');
          };

          const cleanMerchantName = merchantName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Z0-9 ]/gi, '')
            .toUpperCase()
            .substring(0, 25);

          let payload = formatEMV('00', '01');
          let merchantAccount = formatEMV('00', 'BR.GOV.BCB.PIX');
          merchantAccount += formatEMV('01', pixKey);
          merchantAccount += formatEMV('02', `Pedido ${txId}`);
          payload += formatEMV('26', merchantAccount);
          payload += formatEMV('52', '0000');
          payload += formatEMV('53', '986');
          payload += formatEMV('54', amount.toFixed(2));
          payload += formatEMV('58', 'BR');
          payload += formatEMV('59', cleanMerchantName);
          payload += formatEMV('60', 'SAO PAULO');
          payload += formatEMV('62', formatEMV('05', txId));
          payload += '6304';
          payload += crc16(payload);
          
          return payload;
        };

        // Gerar código PIX Copia e Cola
        const pixCopiaCola = generatePixCopiaCola(
          store.pix_key,
          order.total,
          store.name || 'Comerciante',
          order.order_number.replace('#', '')
        );

        console.log('Código PIX Copia e Cola gerado:', pixCopiaCola);

        const pixCopiaColaMessage = {
          number: phone,
          title: store.pix_copiacola_message_title || '💳 Código PIX Gerado',
          description: store.pix_copiacola_message_description || 'Use o código PIX Copia e Cola gerado automaticamente para este pedido. Clique no botão abaixo para copiar.',
          footer: store.pix_copiacola_message_footer || 'Código válido para este pedido específico.',
          buttons: [
            {
              type: 'copy',
              id: 'pix_copia_cola_gerado',
              displayText: store.pix_copiacola_message_button_text || '📋 COPIAR CÓDIGO PIX',
              copyCode: pixCopiaCola,
            },
          ],
        };

        console.log('Enviando mensagem PIX Copia e Cola:', JSON.stringify(pixCopiaColaMessage, null, 2));

        const pixCopiaColaResponse = await fetch(
          `${EVOLUTION_API_URL}/message/sendButtons/${storeInstance.evolution_instance_id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY || '',
            },
            body: JSON.stringify(pixCopiaColaMessage),
          }
        );

        if (pixCopiaColaResponse.ok) {
          const pixData = await pixCopiaColaResponse.json();
          console.log('✅ Mensagem PIX Copia e Cola enviada com sucesso:', pixData);
          
          // Registrar mensagem PIX Copia e Cola no log
          try {
            await supabaseClient
              .from('whatsapp_message_log')
              .insert({
                order_id: record.id || record.order_id,
                order_status: 'pix_copiacola_sent',
                phone_number: phone,
                message_content: JSON.stringify(pixCopiaColaMessage),
              });
            console.log('✅ Mensagem PIX Copia e Cola registrada no log');
          } catch (logError) {
            console.warn('⚠️ Erro ao registrar mensagem PIX Copia e Cola no log:', logError);
          }
        } else {
          const errorText = await pixCopiaColaResponse.text();
          console.error('❌ Erro ao enviar mensagem PIX Copia e Cola:', errorText);
        }
      } catch (pixError) {
        console.error('❌ Erro ao gerar/enviar PIX Copia e Cola:', pixError);
        // Não interromper o fluxo principal se o PIX Copia e Cola falhar
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
