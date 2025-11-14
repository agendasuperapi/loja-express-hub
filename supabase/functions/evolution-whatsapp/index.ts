import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const EVOLUTION_API_URL = "https://evolu-evolution-buttons.12l3kp.easypanel.host";
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

if (!EVOLUTION_API_KEY) {
  console.error('EVOLUTION_API_KEY not configured');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Validation schemas for different actions
const createInstanceSchema = z.object({
  action: z.literal('create_instance'),
  storeId: z.string().uuid('Invalid store ID'),
  instanceName: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Instance name must contain only letters, numbers, hyphens, and underscores'),
  phoneNumber: z.string().optional(),
});

const checkStatusSchema = z.object({
  action: z.literal('check_status'),
  storeId: z.string().uuid('Invalid store ID'),
  instanceName: z.string().trim().min(1).max(100),
});

const disconnectSchema = z.object({
  action: z.literal('disconnect'),
  storeId: z.string().uuid('Invalid store ID'),
  instanceName: z.string().trim().min(1).max(100),
});

const requestSchema = z.discriminatedUnion('action', [
  createInstanceSchema,
  checkStatusSchema,
  disconnectSchema,
]);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  if (!EVOLUTION_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'EVOLUTION_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Initialize Supabase client with service role for database operations
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Extract user ID from JWT (already validated by Supabase when verify_jwt = true)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('No Authorization header provided');
    return new Response(
      JSON.stringify({ error: 'Unauthorized - No Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Decode JWT to extract user_id (JWT already validated by Supabase)
  let user;
  try {
    const jwt = authHeader.replace('Bearer ', '');
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    console.log('JWT payload decoded:', { sub: payload.sub, exp: payload.exp });
    
    if (!payload.sub) {
      throw new Error('No user ID in JWT');
    }
    
    user = { id: payload.sub };
    console.log('Authenticated user:', user.id);
  } catch (decodeError) {
    console.error('Failed to decode JWT:', decodeError);
    const errorMessage = decodeError instanceof Error ? decodeError.message : 'Invalid token';
    return new Response(
      JSON.stringify({ 
        error: 'Unauthorized - Invalid token format',
        details: errorMessage
      }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    let rawData;
    
    try {
      const text = await req.text();
      console.log('Request body text:', text);
      
      if (!text || text.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'Request body is empty' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      rawData = JSON.parse(text);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate request data
    const validatedData = requestSchema.parse(rawData);
    const { action, instanceName, storeId } = validatedData as any;

    console.log('Evolution API Request:', { action, instanceName, storeId, userId: user.id });

    // Check if user has admin role
    const { data: isAdmin } = await supabaseClient.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    });

    // Check if user has store_owner role
    const { data: isStoreOwner } = await supabaseClient.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'store_owner' 
    });

    // Check if user is an active employee with WhatsApp permission
    const { data: employeeData } = await supabaseClient
      .from('store_employees')
      .select('id, permissions, is_active')
      .eq('user_id', user.id)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .maybeSingle();

    const hasWhatsAppView = employeeData && 
      (employeeData as any).permissions?.whatsapp?.view === true;
    
    const hasWhatsAppEdit = employeeData && 
      (employeeData as any).permissions?.whatsapp?.edit === true;

    // Verify store ownership for store_owner role (not admin or employee)
    let ownsStore = false;
    if (isStoreOwner && !isAdmin) {
      const { data: store } = await supabaseClient
        .from('stores')
        .select('id')
        .eq('id', storeId)
        .eq('owner_id', user.id)
        .maybeSingle();
      
      ownsStore = !!store;
    }

    // Authorization: 
    // - 'check_status' requires view permission
    // - 'create_instance' and 'disconnect' require edit permission
    const isAuthorizedForAction = Boolean(
      isAdmin ||
      ownsStore ||
      (action === 'check_status' && hasWhatsAppView) ||
      ((action === 'create_instance' || action === 'disconnect') && hasWhatsAppEdit)
    );

    if (!isAuthorizedForAction) {
      console.error('Authorization failed: insufficient permission', { 
        userId: user.id, 
        storeId,
        action,
        isAdmin,
        ownsStore,
        hasWhatsAppView,
        hasWhatsAppEdit
      });
      return new Response(
        JSON.stringify({ 
          error: 'Forbidden - You do not have permission to access this store',
          details: action === 'check_status' 
            ? 'Viewing WhatsApp status requires store ownership or employee view permission' 
            : 'Managing WhatsApp connection requires store ownership or employee edit permission'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authorization successful', { 
      userId: user.id, 
      isAdmin, 
      ownsStore,
      hasWhatsAppView,
      hasWhatsAppEdit 
    });

    if (action === 'create_instance') {
      // Create instance
      const createResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          instanceName: instanceName,
          token: EVOLUTION_API_KEY,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Evolution API Error:', errorText);

        // If the instance name is already in use, try to connect to it and return QR code
        const lowerError = errorText.toLowerCase();
        const nameInUse =
          createResponse.status === 403 ||
          createResponse.status === 409 ||
          lowerError.includes('already in use') ||
          lowerError.includes('is already in use');

        if (nameInUse) {
          const connectResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers: {
              'apikey': EVOLUTION_API_KEY,
            },
          });

          if (!connectResponse.ok) {
            const connectErr = await connectResponse.text();
            console.error('Evolution API Connect Error (existing):', connectErr);
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to connect existing instance', details: connectErr }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const connectData = await connectResponse.json();
          console.log('QR Code generated for existing instance:', connectData);

          return new Response(
            JSON.stringify({
              success: true,
              instance: { reused: true, name: instanceName },
              qrcode: connectData
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        throw new Error(`Failed to create instance: ${errorText}`);
      }

      const createData = await createResponse.json();
      console.log('Instance created:', createData);

      // Connect to get QR code
      const connectResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      });

      if (!connectResponse.ok) {
        throw new Error('Failed to connect instance');
      }

      const connectData = await connectResponse.json();
      console.log('QR Code generated:', connectData);

      return new Response(
        JSON.stringify({
          success: true,
          instance: createData,
          qrcode: connectData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check_status') {
      const statusResponse = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Failed to check status:', {
          status: statusResponse.status,
          statusText: statusResponse.statusText,
          error: errorText,
          instanceName
        });
        
        // If instance not found, return disconnected status instead of error
        if (statusResponse.status === 404) {
          return new Response(
            JSON.stringify({
              success: true,
              status: 'disconnected'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to check status',
            details: errorText,
            statusCode: statusResponse.status
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const statusData = await statusResponse.json();
      console.log('Status checked - Full response:', JSON.stringify(statusData, null, 2));
      console.log('Status data structure:', {
        hasState: !!statusData?.state,
        hasInstanceState: !!statusData?.instance?.state,
        hasConnectionState: !!statusData?.connection?.state,
        hasResultState: !!statusData?.result?.state,
        hasDataState: !!statusData?.data?.state,
      });

      const finalStatus = (statusData?.state ??
        statusData?.instance?.state ??
        statusData?.connection?.state ??
        statusData?.result?.state ??
        statusData?.data?.state ??
        'disconnected');
        
      console.log('Final status determined:', finalStatus);

      return new Response(
        JSON.stringify({
          success: true,
          status: finalStatus
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect') {
      const logoutResponse = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      });

      if (!logoutResponse.ok) {
        throw new Error('Failed to disconnect');
      }

      // Delete instance
      const deleteResponse = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Instance disconnected and deleted'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Error in evolution-whatsapp function:', error);
    return new Response(
      JSON.stringify({ 
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
