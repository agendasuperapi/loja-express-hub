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
    'Instagram',
    'LinkedInBot',
    'Slackbot',
    'TelegramBot',
    'Discordbot',
    'Googlebot',
    'bingbot',
  ];
  return crawlerPatterns.some((pattern) =>
    userAgent.toLowerCase().includes(pattern.toLowerCase())
  );
};

// Try to extract shortId from multiple possible sources to be robust to proxies
const extractShortId = (url: URL, req: Request): string | null => {
  // 1) Standard query param
  const qp = url.searchParams.get('short_id')
    || url.searchParams.get('id')
    || url.searchParams.get('s');
  if (qp) return qp;

  // 2) From known proxy query parameters carrying original path/url
  const originalUrl =
    url.searchParams.get('url') ||
    url.searchParams.get('original_url') ||
    url.searchParams.get('path') ||
    url.searchParams.get('originalPath');
  if (originalUrl) {
    const m = originalUrl.match(/\/p\/([A-Za-z0-9_-]+)/);
    if (m && m[1]) return m[1];
  }

  // 3) From custom forwarded headers (if any)
  const headerPaths = [
    req.headers.get('x-original-path'),
    req.headers.get('x-forwarded-uri'),
    req.headers.get('x-lovable-original-url'),
    req.headers.get('referer'),
  ].filter(Boolean) as string[];
  for (const p of headerPaths) {
    const m = p.match(/\/p\/([A-Za-z0-9_-]+)/);
    if (m && m[1]) return m[1];
  }

  // 4) As a last resort, try pathname in case the runtime passes it through
  const m = url.pathname.match(/\/p\/([A-Za-z0-9_-]+)/);
  if (m && m[1]) return m[1];

  return null;
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const userAgent = req.headers.get('user-agent') || '';
    
    console.log('Request received:', { url: url.toString(), userAgent });

    // Extract short_id robustly (query, forwarded path, etc.)
    const productShortId = extractShortId(url, req);
    
    console.log('Processing request:', { productShortId, userAgent, isCrawler: isCrawler(userAgent) });

    if (!productShortId) {
      const fallbackHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Produto - Ofertas App</title>
  <meta name="title" content="Produto - Ofertas App" />
  <meta name="description" content="Faça seu pedido online" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Produto - Ofertas App" />
  <meta property="og:description" content="Faça seu pedido online" />
  <meta property="og:site_name" content="Ofertas App" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0; url=https://ofertasapp.lovable.app" />
</head>
<body>
  <h1>Produto não encontrado</h1>
  <p>Redirecionando...</p>
</body>
</html>`;
      
      return new Response(fallbackHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Robots-Tag': 'all',
          ...corsHeaders
        }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get product by short_id with store info
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*, stores(name, slug)')
      .eq('short_id', productShortId)
      .single();

    console.log('Product query result:', { product, error: productError });

    if (!product || productError) {
      console.error('Product not found for short_id:', productShortId);
      
      // Fallback meta-tags
      const fallbackHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Produto - Ofertas App</title>
  <meta name="title" content="Produto - Ofertas App" />
  <meta name="description" content="Faça seu pedido online" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Produto - Ofertas App" />
  <meta property="og:description" content="Faça seu pedido online" />
  <meta property="og:site_name" content="Ofertas App" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0; url=https://ofertasapp.lovable.app" />
</head>
<body>
  <h1>Produto não encontrado</h1>
  <p>Redirecionando...</p>
</body>
</html>`;
      
      return new Response(fallbackHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Robots-Tag': 'all',
          ...corsHeaders
        }
      });
    }

    const store = product.stores;

    // Determine the app URL (where users will be redirected)
    const appOrigin = 'https://ofertasapp.lovable.app';
    const redirectUrl = `${appOrigin}/p/${product.short_id}`;
    
    // Product image URL - directly from bucket
    const pageImage = product.image_url;
    
    console.log('Product image URL:', pageImage);
    
    // Generate meta tags
    const storeName = store?.name || 'Ofertas App';
    const pageTitle = product.name;
    const pageDescription = product.description || 'Pedido online';
    
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
  <meta property="og:type" content="product" />
  <meta property="og:url" content="${redirectUrl}" />
  <meta property="og:title" content="${pageTitle}" />
  <meta property="og:description" content="${pageDescription}" />
  <meta property="og:site_name" content="${storeName}" />
  <meta property="og:locale" content="pt_BR" />
  ${pageImage ? `
  <meta property="og:image" content="${pageImage}" />
  <meta property="og:image:secure_url" content="${pageImage}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${pageTitle}" />` : ''}
  <meta property="product:price:amount" content="${product.promotional_price || product.price}" />
  <meta property="product:price:currency" content="BRL" />
  <meta property="product:availability" content="${product.is_available ? 'in stock' : 'out of stock'}" />
  <meta property="product:condition" content="new" />
  
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
          'Cache-Control': 'no-cache',
          'X-Robots-Tag': 'all',
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
