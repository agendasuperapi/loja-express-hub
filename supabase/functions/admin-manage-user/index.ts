import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { action, userId } = await req.json();

    // Verify admin access
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Unauthorized: Admin access required');
    }

    let result;

    switch (action) {
      case 'delete':
        // Delete user from auth.users (this will cascade to other tables)
        const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId);
        if (deleteError) throw deleteError;
        result = { success: true, message: 'Usuário deletado com sucesso' };
        break;

      case 'deactivate':
        // Update user in auth.users to ban them
        const { error: banError } = await supabaseClient.auth.admin.updateUserById(
          userId,
          { ban_duration: '876000h' } // Ban for 100 years (effectively permanent)
        );
        if (banError) throw banError;
        result = { success: true, message: 'Usuário inativado com sucesso' };
        break;

      case 'activate':
        // Remove ban from user
        const { error: unbanError } = await supabaseClient.auth.admin.updateUserById(
          userId,
          { ban_duration: 'none' }
        );
        if (unbanError) throw unbanError;
        result = { success: true, message: 'Usuário ativado com sucesso' };
        break;

      default:
        throw new Error('Invalid action');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
