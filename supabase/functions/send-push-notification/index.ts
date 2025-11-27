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
      console.log('[Push] ⚠️ NENHUMA SUBSCRIPTION ATIVA! Usuário precisa ativar Push em Configurações → Notificações');
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
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT');

    if (!VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
      throw new Error('VAPID keys não configuradas');
    }

    // Envia notificação para cada subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const subscriptionData = sub.subscription as any;
          
          const pushPayload = JSON.stringify({
            title,
            body,
            url: url || `/orders/${orderId}`,
            icon: icon || '/favicon-96x96.png',
            tag: tag || `order-${orderId}`,
            orderId,
            storeId
          });

          // Importa web-push dinamicamente
          const webpush = await import('https://esm.sh/web-push@3.6.7');
          
          webpush.setVapidDetails(
            VAPID_SUBJECT,
            'BIxJGwVZm_CUeyqY4s8OCEUr9FfMqBb7667JL4jtwNyrL_Q7XN3nKTIPSDzx6Pa0W-ZOimvZUvRNTnxtSGVAFY4',
            VAPID_PRIVATE_KEY
          );

          await webpush.sendNotification(subscriptionData, pushPayload);
          
          console.log(`[Push] Notificação enviada com sucesso para ${sub.endpoint.substring(0, 50)}...`);
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          console.error(`[Push] Erro ao enviar para ${sub.endpoint.substring(0, 50)}:`, error);
          
          // Se a subscription estiver inválida, marca como inativa
          if (error.statusCode === 410 || error.statusCode === 404) {
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
