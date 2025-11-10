// Edge Function to migrate product images to Supabase Storage
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all products
    const { data: products, error: fetchError } = await supabaseClient
      .from('products')
      .select('id, image_url');

    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch products' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const product of products || []) {
      try {
        // Skip if already using Supabase storage
        if (product.image_url?.includes('supabase.co/storage')) {
          results.push({
            id: product.id,
            status: 'skipped',
            message: 'Already using Supabase storage'
          });
          continue;
        }

        // Skip if no image URL
        if (!product.image_url) {
          results.push({
            id: product.id,
            status: 'skipped',
            message: 'No image URL'
          });
          continue;
        }

        // Download the image
        const imageResponse = await fetch(product.image_url);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.statusText}`);
        }

        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();

        // Extract file extension from URL
        const urlParts = product.image_url.split('.');
        const extension = urlParts[urlParts.length - 1].split('?')[0] || 'jpg';
        const fileName = `${product.id}.${extension}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from('product-images')
          .upload(fileName, imageBuffer, {
            contentType: imageBlob.type || 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient
          .storage
          .from('product-images')
          .getPublicUrl(fileName);

        // Update product with new URL
        const { error: updateError } = await supabaseClient
          .from('products')
          .update({ image_url: publicUrl })
          .eq('id', product.id);

        if (updateError) {
          throw updateError;
        }

        results.push({
          id: product.id,
          status: 'success',
          oldUrl: product.image_url,
          newUrl: publicUrl
        });

      } catch (error: any) {
        console.error(`Error migrating product ${product.id}:`, error);
        results.push({
          id: product.id,
          status: 'error',
          message: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: products?.length || 0,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in migrate-product-images:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
