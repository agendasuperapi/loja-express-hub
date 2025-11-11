import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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
  instanceName: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Instance name must contain only letters, numbers, hyphens, and underscores'),
  phoneNumber: z.string().optional(),
});

const checkStatusSchema = z.object({
  action: z.literal('check_status'),
  instanceName: z.string().trim().min(1).max(100),
});

const disconnectSchema = z.object({
  action: z.literal('disconnect'),
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
    const { action, instanceName } = validatedData;

    console.log('Evolution API Request:', { action, instanceName });

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
      console.log('Status checked:', statusData);

      return new Response(
        JSON.stringify({
          success: true,
          status:
            (statusData?.state ??
              statusData?.instance?.state ??
              statusData?.connection?.state ??
              statusData?.result?.state ??
              statusData?.data?.state ??
              'disconnected')
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
