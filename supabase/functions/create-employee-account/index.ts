import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Não autorizado');
    }

    const { 
      email, 
      password, 
      employee_name, 
      employee_phone,
      position,
      store_id,
      permissions,
      notes
    } = await req.json();

    // Validar dados
    if (!email || !password || !employee_name || !store_id) {
      throw new Error('Dados obrigatórios faltando');
    }

    // Verificar se o usuário atual é dono da loja
    const { data: store, error: storeError } = await supabaseClient
      .from('stores')
      .select('owner_id')
      .eq('id', store_id)
      .single();

    if (storeError || !store || store.owner_id !== user.id) {
      throw new Error('Você não tem permissão para adicionar funcionários a esta loja');
    }

    // Criar usuário no auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: employee_name,
        phone: employee_phone
      }
    });

    if (createError || !newUser.user) {
      console.error('Erro ao criar usuário:', createError);
      throw new Error(`Erro ao criar conta: ${createError?.message || 'Erro desconhecido'}`);
    }

    // Criar profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name: employee_name,
        phone: employee_phone
      });

    if (profileError) {
      console.error('Erro ao criar profile:', profileError);
      // Não vamos falhar se o profile não for criado, pois pode já existir por trigger
    }

    // Adicionar role de customer (role padrão)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'customer'
      });

    if (roleError) {
      console.error('Erro ao adicionar role:', roleError);
      // Continuar mesmo se der erro, pois pode já existir
    }

    // Criar registro de funcionário
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('store_employees')
      .insert({
        store_id,
        user_id: newUser.user.id,
        employee_name,
        employee_email: email,
        employee_phone,
        position,
        permissions: permissions || {
          orders: { view: true, create: true, update: true, delete: false },
          products: { view: true, create: false, update: false, delete: false },
          categories: { view: true, create: false, update: false, delete: false },
          coupons: { view: true, create: false, update: false, delete: false },
          employees: { view: false, create: false, update: false, delete: false },
          reports: { view: false },
          settings: { view: false, update: false }
        },
        notes,
        created_by: user.id,
        is_active: true
      })
      .select()
      .single();

    if (employeeError) {
      console.error('Erro ao criar funcionário:', employeeError);
      throw new Error(`Erro ao criar registro de funcionário: ${employeeError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        employee,
        user_id: newUser.user.id 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro na function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
