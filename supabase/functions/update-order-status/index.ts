// Edge Function: update-order-status
// Validates the authenticated employee's permissions and updates an order status using service role
// Expects: { orderId: string, status: string, skipNotification?: boolean }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[update-order-status] Requisição recebida');
    
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      console.error('[update-order-status] Header de autorização ausente');
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { orderId, status, skipNotification = false } = await req.json().catch(() => ({ orderId: null, status: null, skipNotification: false }));
    console.log('[update-order-status] Parâmetros recebidos:', { orderId, status, skipNotification });

    if (!orderId || !status) {
      console.error('[update-order-status] Parâmetros inválidos:', { orderId, status });
      return new Response(JSON.stringify({ error: 'Parâmetros inválidos: orderId e status são obrigatórios.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Variáveis de ambiente do Supabase não configuradas.' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Client with user JWT to identify the requester
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client to perform privileged reads/writes after our own permission check
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[update-order-status] Usuário não autenticado:', userError);
      return new Response(JSON.stringify({ error: 'Usuário não autenticado.' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    console.log('[update-order-status] Usuário autenticado:', user.id);

    // Load order to get store_id
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders' as any)
      .select('id, store_id, status')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      console.error('[update-order-status] Pedido não encontrado:', orderErr);
      return new Response(JSON.stringify({ error: 'Pedido não encontrado.' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    console.log('[update-order-status] Pedido encontrado:', { orderId: order.id, storeId: order.store_id });

    // Check if user is store owner
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores' as any)
      .select('owner_id')
      .eq('id', order.store_id)
      .single();

    const isStoreOwner = !storeErr && store && store.owner_id === user.id;

    // Normalize and validate status - map custom status keys to database enum values
    const rawStatus = String(status);
    
    // Map custom status keys to valid database enum values
    const statusMap: Record<string, string> = {
      out_for_delivery: 'in_delivery',
    };
    
    const statusKey = statusMap[rawStatus] || rawStatus;
    const allowedStatuses = new Set(['pending','confirmed','preparing','ready','in_delivery','delivered','cancelled']);
    
    if (!allowedStatuses.has(statusKey)) {
      console.error('[update-order-status] Status inválido recebido:', { rawStatus, statusKey });
      return new Response(JSON.stringify({ error: 'Status inválido.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // If not store owner, check employee permissions
    if (!isStoreOwner) {
      console.log('[update-order-status] Usuário não é proprietário, verificando permissões de funcionário');
      
      const { data: employee, error: empErr } = await supabaseAdmin
        .from('store_employees' as any)
        .select('id, is_active, permissions')
        .eq('user_id', user.id)
        .eq('store_id', order.store_id)
        .single();

      if (empErr || !employee) {
        console.error('[update-order-status] Funcionário não encontrado:', empErr);
        return new Response(JSON.stringify({ error: 'Você não tem permissão para gerenciar pedidos desta loja.' }), {
          status: 403,
          headers: corsHeaders,
        });
      }

      console.log('[update-order-status] Funcionário encontrado:', { employeeId: employee.id, isActive: employee.is_active });

      const perms = ((employee.permissions as any)?.orders || {}) as Record<string, boolean>;
      const dynamicPermission = `change_status_${statusKey}`;

      const canChange = Boolean(
        employee.is_active && (perms.change_any_status === true || perms[dynamicPermission] === true)
      );

      console.log('[update-order-status] Verificação de permissão:', { 
        canChange, 
        dynamicPermission, 
        hasChangeAnyStatus: perms.change_any_status,
        hasSpecificPermission: perms[dynamicPermission]
      });

      if (!canChange) {
        console.error('[update-order-status] Permissão negada para alterar status');
        return new Response(
          JSON.stringify({ error: 'Você não tem permissão para alterar para este status.' }),
          { status: 403, headers: corsHeaders }
        );
      }
    } else {
      console.log('[update-order-status] Usuário é proprietário da loja');
    }

    console.log('[update-order-status] Atualizando pedido:', { orderId, newStatus: statusKey, skipNotification });
    
    let updated;
    let updateErr;

    // Se skipNotification for true, usa a RPC que define a flag de sessão
    if (skipNotification) {
      console.log('[update-order-status] Usando RPC para pular notificação WhatsApp');
      
      const { data: rpcData, error: rpcError } = await supabaseAdmin
        .rpc('update_order_status_skip_notification', {
          p_order_id: orderId,
          p_new_status: statusKey
        });

      if (rpcError) {
        console.error('[update-order-status] Erro ao chamar RPC:', rpcError);
        updateErr = rpcError;
      } else {
        updated = rpcData;
      }
    } else {
      // Senão, faz o UPDATE normal (que acionará o trigger de WhatsApp)
      console.log('[update-order-status] Atualizando com notificação WhatsApp');
      
      const { data, error } = await supabaseAdmin
        .from('orders' as any)
        .update({ status: statusKey })
        .eq('id', orderId)
        .select('id, status, updated_at')
        .single();

      updated = data;
      updateErr = error;
    }

    if (updateErr) {
      console.error('[update-order-status] Erro ao atualizar pedido:', updateErr);
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log('[update-order-status] Pedido atualizado com sucesso:', updated);
    
    return new Response(JSON.stringify({ success: true, data: updated }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    console.error('[update-order-status] Erro não tratado:', e);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao atualizar status do pedido.', details: String(e) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
