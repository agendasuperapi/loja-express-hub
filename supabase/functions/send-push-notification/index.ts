import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

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

// Helper para converter Uint8Array para base64url
function base64urlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Gera JWT para VAPID authentication
async function generateVAPIDToken(
  privateKey: string,
  subject: string,
  endpoint: string
): Promise<string> {
  const audience = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp, sub: subject };

  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Importar chave privada VAPID
  const keyData = base64urlDecode(privateKey);
  // @ts-ignore: Deno type compatibility
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Assinar o token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = base64urlEncode(signature);
  return `${unsignedToken}.${signatureB64}`;
}

// Criptografa o payload usando ECDH
async function encryptPayload(
  payload: string,
  clientPublicKey: string,
  clientAuth: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  // Gerar par de chaves efêmero para ECDH
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Importar chave pública do cliente
  const clientPublicKeyData = base64urlDecode(clientPublicKey);
  // @ts-ignore: Deno type compatibility
  const importedClientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyData,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derivar chave compartilhada usando ECDH
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: importedClientPublicKey },
    serverKeyPair.privateKey,
    256
  );

  // Gerar salt aleatório
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Decodificar auth secret do cliente
  const authSecret = base64urlDecode(clientAuth);

  // Derivar PRK (Pseudo-Random Key) usando HKDF
  const prkInfoBuf = new TextEncoder().encode('Content-Encoding: auth\0');
  // @ts-ignore: Deno type compatibility
  const prkKey = await crypto.subtle.importKey(
    'raw',
    authSecret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  // @ts-ignore: Deno type compatibility
  const prk = await crypto.subtle.sign('HMAC', prkKey, new Uint8Array([...new Uint8Array(sharedSecret), ...prkInfoBuf]));

  // Derivar CEK (Content Encryption Key) e Nonce usando HKDF
  const cekInfo = new Uint8Array([
    ...new TextEncoder().encode('Content-Encoding: aesgcm\0P-256\0'),
    0, 65,
    ...clientPublicKeyData,
    0, 65,
    ...new Uint8Array(await crypto.subtle.exportKey('raw', serverKeyPair.publicKey))
  ]);

  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const keyInfo = new Uint8Array([...salt, ...cekInfo]);
  const ikm = await crypto.subtle.sign('HMAC', hkdfKey, keyInfo);
  
  const cek = new Uint8Array(ikm).slice(0, 16);
  const nonce = new Uint8Array(ikm).slice(16, 28);

  // Importar CEK como chave AES-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    cek,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Adicionar padding ao payload
  const paddingLength = 0; // Sem padding adicional
  const paddedPayload = new Uint8Array([
    ...new TextEncoder().encode(payload),
    2 // Delimiter
  ]);

  // Criptografar
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    aesKey,
    paddedPayload
  );

  // Exportar chave pública do servidor
  const serverPublicKey = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);

  return {
    ciphertext: new Uint8Array(ciphertext),
    salt,
    serverPublicKey: new Uint8Array(serverPublicKey)
  };
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

  console.log('[Push] Criptografando payload...');
  const { ciphertext, salt, serverPublicKey } = await encryptPayload(payload, p256dh, auth);

  const headers: Record<string, string> = {
    'TTL': '86400',
    'Content-Encoding': 'aesgcm',
    'Content-Type': 'application/octet-stream',
    'Authorization': `vapid t=${vapidToken}, k=${vapidPublicKey}`,
    'Crypto-Key': `dh=${base64urlEncode(serverPublicKey)}; p256ecdsa=${vapidPublicKey}`,
    'Encryption': `salt=${base64urlEncode(salt)}`,
  };

  console.log('[Push] Enviando notificação para:', endpoint.substring(0, 50) + '...');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    // @ts-ignore: Deno accepts Uint8Array as body
    body: ciphertext,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[Push] Falha:', response.status, text);
    throw new Error(`Push failed: ${response.status} - ${text}`);
  }

  console.log('[Push] ✅ Notificação enviada com sucesso');
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
          console.error('[Push] Stack trace:', error.stack);
          
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
    console.error('[Push] Stack trace:', error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
