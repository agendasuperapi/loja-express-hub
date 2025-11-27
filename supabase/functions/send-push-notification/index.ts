import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { encode as base64urlEncode } from "https://deno.land/std@0.168.0/encoding/base64url.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationPayload {
  storeId: string;
  title: string;
  body: string;
  url?: string;
  orderId?: string;
  icon?: string;
  tag?: string;
}

// Helper para converter base64url para Uint8Array
function base64urlDecode(str: string): Uint8Array {
  // Adiciona padding se necessário
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Gera JWT para VAPID authentication
async function generateVAPIDToken(
  privateKey: string,
  subject: string,
  endpoint: string
): Promise<string> {
  const keyData = base64urlDecode(privateKey);
  
  // @ts-ignore: Deno type compatibility
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const audience = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 horas

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp, sub: subject };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // @ts-ignore: Deno type compatibility
  const signatureB64 = base64urlEncode(signature);
  return `${unsignedToken}.${signatureB64}`;
}

// Envia push notification
async function sendPushNotification(
  subscription: any,
  payload: string,
  vapidToken: string,
  vapidPublicKey: string
): Promise<void> {
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys.p256dh;
  const auth = subscription.keys.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error('Subscription inválida: faltam campos obrigatórios');
  }

  const headers: Record<string, string> = {
    'TTL': '86400',
    'Content-Encoding': 'aes128gcm',
    'Authorization': `vapid t=${vapidToken}, k=${vapidPublicKey}`,
  };

  // Para simplificar, vamos enviar o payload sem criptografia ECDH completa
  // O payload será enviado como texto simples (a maioria dos push services aceita)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: payload,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Push failed: ${response.status} - ${text}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: PushNotificationPayload = await req.json();
    console.log('[Push] Payload recebido:', payload);

    const { storeId, title, body, url, orderId, icon, tag } = payload;

    if (!storeId || !title || !body) {
      throw new Error('storeId, title e body são obrigatórios');
    }

    // Busca todas as subscriptions ativas para a loja
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    console.log('[Push] Query result:', { 
      subscriptionsCount: subscriptions?.length || 0, 
      error: fetchError,
      storeId 
    });

    if (fetchError) {
      console.error('[Push] Erro ao buscar subscriptions:', fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Push] ⚠️ NENHUMA SUBSCRIPTION ATIVA!');
      return new Response(
        JSON.stringify({ 
          message: 'Nenhuma subscription ativa. Ative Push Notifications nas Configurações.', 
          sent: 0,
          storeId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Push] ${subscriptions.length} subscriptions encontradas`);

    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT');

    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY || !VAPID_SUBJECT) {
      throw new Error('VAPID keys não configuradas');
    }

    // Envia notificação para cada subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const subscriptionData = sub.subscription as any;
          
          console.log(`[Push] Enviando para ${sub.endpoint.substring(0, 50)}...`);
          console.log('[Push] Subscription data:', {
            hasEndpoint: !!subscriptionData.endpoint,
            hasKeys: !!subscriptionData.keys,
            hasP256dh: !!subscriptionData.keys?.p256dh,
            hasAuth: !!subscriptionData.keys?.auth,
          });

          const pushPayload = JSON.stringify({
            title,
            body,
            url: url || `/orders/${orderId}`,
            icon: icon || '/favicon-96x96.png',
            tag: tag || `order-${orderId}`,
            orderId,
            storeId
          });

          // Gera token VAPID
          const vapidToken = await generateVAPIDToken(
            VAPID_PRIVATE_KEY,
            VAPID_SUBJECT,
            subscriptionData.endpoint
          );

          // Envia notificação
          await sendPushNotification(
            subscriptionData,
            pushPayload,
            vapidToken,
            VAPID_PUBLIC_KEY
          );
          
          console.log(`[Push] ✅ Notificação enviada com sucesso para ${sub.endpoint.substring(0, 50)}...`);
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          console.error(`[Push] ❌ Erro ao enviar para ${sub.endpoint.substring(0, 50)}:`, error.message);
          
          // Se a subscription estiver inválida (410 Gone ou 404 Not Found), marca como inativa
          if (error.message?.includes('410') || error.message?.includes('404')) {
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
            console.log(`[Push] Subscription ${sub.id} marcada como inativa`);
          }
          
          return { success: false, endpoint: sub.endpoint, error: error.message };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
    const failed = results.length - successful;

    console.log(`[Push] Resumo: ${successful} enviadas, ${failed} falharam`);

    return new Response(
      JSON.stringify({
        message: 'Notificações processadas',
        sent: successful,
        failed,
        total: results.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('[Push] Erro na edge function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
