import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Detect if request is from a social media crawler
const isCrawler = (userAgent: string): boolean => {
  const crawlerPatterns = [
    'facebookexternalhit',
    'Facebot',
    'Twitterbot',
    'WhatsApp',
    'LinkedInBot',
    'Slackbot',
    'TelegramBot',
    'Googlebot',
    'bingbot',
  ];
  
  return crawlerPatterns.some(pattern => 
    userAgent.toLowerCase().includes(pattern.toLowerCase())
  );
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const userAgent = req.headers.get('user-agent') || '';
    
    console.log('Request received:', { url: url.toString(), userAgent });

    // Extract store slug and product ID from query params
    const storeSlug = url.searchParams.get('store') || '';
    const productId = url.searchParams.get('product');
    
    console.log('Processing request:', { storeSlug, productId, userAgent, isCrawler: isCrawler(userAgent) });

    if (!storeSlug) {
      return new Response('Store slug is required', { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get store
    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('slug', storeSlug)
      .single();

    if (!store) {
      return new Response('Store not found', { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    let product = null;

    // Get product if productId is provided
    if (productId) {
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('store_id', store.id)
        .single();

      product = productData;
    }

    // Determine the app URL (where users will be redirected)
    const appOrigin = 'https://ofertasapp.lovable.app';
    
    // This is the friendly URL that will be shown in WhatsApp preview
    const redirectUrl = `${appOrigin}/${store.slug}${product ? `?product=${product.id}` : ''}`;
    
    // Use product image with proper dimensions for social media
    // Ensure image URLs are absolute and properly formatted
    let pageImage = product?.image_url || store.banner_url || store.logo_url;
    
    // Ensure the image URL is absolute
    if (pageImage) {
      if (!pageImage.startsWith('http://') && !pageImage.startsWith('https://')) {
        // If it's a relative URL or just a domain, make it absolute
        if (pageImage.startsWith('//')) {
          pageImage = `https:${pageImage}`;
        } else if (pageImage.startsWith('/')) {
          pageImage = `${appOrigin}${pageImage}`;
        } else if (!pageImage.includes('://')) {
          pageImage = `https://${pageImage}`;
        }
      }
      
      // Log the final image URL for debugging
      console.log('Final image URL:', pageImage);
    }
    
    // Generate meta tags
    const pageTitle = product 
      ? `${product.name} - ${store.name}` 
      : `${store.name} - Cardápio`;
    
    const pageDescription = product
      ? `${product.description || product.name} - R$ ${Number(product.promotional_price || product.price).toFixed(2)} - Peça agora em ${store.name}`
      : store.description || `Confira o cardápio completo de ${store.name}`;
    
    console.log('Meta tags prepared:', { pageTitle, pageDescription, pageImage, redirectUrl });
    
    // If it's a crawler, serve full HTML with meta tags
    // If it's a user, redirect them to the app
    if (isCrawler(userAgent)) {
      console.log('Serving HTML for crawler:', userAgent);
      
      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- Primary Meta Tags -->
  <title>${pageTitle}</title>
  <meta name="title" content="${pageTitle}" />
  <meta name="description" content="${pageDescription}" />
  
  <!-- Canonical URL - A URL amigável que será mostrada -->
  <link rel="canonical" href="${redirectUrl}" />
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="${product ? 'product' : 'website'}" />
  <meta property="og:url" content="${redirectUrl}" />
  <meta property="og:title" content="${pageTitle}" />
  <meta property="og:description" content="${pageDescription}" />
  <meta property="og:site_name" content="App Delivery" />
  <meta property="og:locale" content="pt_BR" />
  ${pageImage ? `
  <meta property="og:image" content="${pageImage}" />
  <meta property="og:image:secure_url" content="${pageImage}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${pageTitle}" />` : ''}
  ${product ? `
  <meta property="product:price:amount" content="${product.promotional_price || product.price}" />
  <meta property="product:price:currency" content="BRL" />
  <meta property="product:availability" content="${product.is_available ? 'in stock' : 'out of stock'}" />
  <meta property="product:condition" content="new" />` : ''}
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${redirectUrl}" />
  <meta name="twitter:title" content="${pageTitle}" />
  <meta name="twitter:description" content="${pageDescription}" />
  ${pageImage ? `<meta name="twitter:image" content="${pageImage}" />` : ''}
  ${pageImage ? `<meta name="twitter:image:alt" content="${pageTitle}" />` : ''}
  
  <meta http-equiv="refresh" content="0; url=${redirectUrl}" />
</head>
<body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
  <h1>${pageTitle}</h1>
  ${pageImage ? `<img src="${pageImage}" alt="${pageTitle}" style="max-width: 400px; border-radius: 8px; margin: 20px 0;" />` : ''}
  <p>${pageDescription}</p>
  <p>Redirecionando para o app...</p>
  <a href="${redirectUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 8px;">Ir para o App</a>
</body>
</html>`;

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
          ...corsHeaders
        }
      });
    } else {
      // For regular users, redirect directly to the app
      console.log('Redirecting user to app:', redirectUrl);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': redirectUrl,
          'Cache-Control': 'no-cache'
        }
      });
    }

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
