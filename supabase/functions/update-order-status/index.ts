// Edge Function: update-order-status
// Validates the authenticated employee's permissions and updates an order status using service role
// Expects: { orderId: string, status: string }

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
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { orderId, status } = await req.json().catch(() => ({ orderId: null, status: null }));

    if (!orderId || !status) {
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
      return new Response(JSON.stringify({ error: 'Usuário não autenticado.' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Load order to get store_id
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders' as any)
      .select('id, store_id, status')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Pedido não encontrado.' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Check if user is store owner
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores' as any)
      .select('owner_id')
      .eq('id', order.store_id)
      .single();

    const isStoreOwner = !storeErr && store && store.owner_id === user.id;
    const statusKey = String(status);

    // If not store owner, check employee permissions
    if (!isStoreOwner) {
      const { data: employee, error: empErr } = await supabaseAdmin
        .from('store_employees' as any)
        .select('id, is_active, permissions')
        .eq('user_id', user.id)
        .eq('store_id', order.store_id)
        .single();

      if (empErr || !employee) {
        return new Response(JSON.stringify({ error: 'Você não tem permissão para gerenciar pedidos desta loja.' }), {
          status: 403,
          headers: corsHeaders,
        });
      }

      const perms = ((employee.permissions as any)?.orders || {}) as Record<string, boolean>;
      const dynamicPermission = `change_status_${statusKey}`;

      const canChange = Boolean(
        employee.is_active && (perms.change_any_status === true || perms[dynamicPermission] === true)
      );

      if (!canChange) {
        return new Response(
          JSON.stringify({ error: 'Você não tem permissão para alterar para este status.' }),
          { status: 403, headers: corsHeaders }
        );
      }
    }

    // Perform the update
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('orders' as any)
      .update({ status: statusKey })
      .eq('id', orderId)
      .select('id, status, updated_at')
      .single();

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ success: true, data: updated }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Erro interno ao atualizar status do pedido.', details: String(e) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
