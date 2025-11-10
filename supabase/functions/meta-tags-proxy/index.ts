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

    // Build the actual product URL
    const productUrl = productShortId ? `https://ofertas.app/p/${productShortId}` : 'https://ofertas.app';

    // If not a crawler and no shortId, redirect to home
    if (!productShortId) {
      if (!isCrawler(userAgent)) {
        return new Response(null, {
          status: 302,
          headers: {
            'Location': productUrl,
            ...corsHeaders
          }
        });
      }
      
      // Crawler without shortId - serve fallback HTML
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
  <meta http-equiv="refresh" content="0; url=https://ofertas.app" />
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get product by short_id with store info
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*, stores(name, slug)')
      .eq('short_id', productShortId)
      .single();

    console.log('Product query result:', { product, error: productError });

    // If not a crawler, redirect to the app immediately
    if (!isCrawler(userAgent)) {
      console.log('Not a crawler, redirecting to React app');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': productUrl,
          ...corsHeaders
        }
      });
    }

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
  <meta http-equiv="refresh" content="0; url=https://ofertas.app" />
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
    
    // Product image URL - directly from bucket
    const pageImage = product.image_url;
    
    console.log('Product image URL:', pageImage);
    
    // Generate meta tags
    const storeName = store?.name || 'Ofertas App';
    const pageTitle = product.name;
    const pageDescription = product.description || 'Pedido online';
    
    console.log('Meta tags prepared:', { pageTitle, pageDescription, pageImage, productUrl });
    
    // Serve HTML with meta tags for crawlers
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
  <link rel="canonical" href="${productUrl}" />
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="product" />
  <meta property="og:url" content="${productUrl}" />
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
  <meta name="twitter:url" content="${productUrl}" />
  <meta name="twitter:title" content="${pageTitle}" />
  <meta name="twitter:description" content="${pageDescription}" />
  ${pageImage ? `<meta name="twitter:image" content="${pageImage}" />` : ''}
  ${pageImage ? `<meta name="twitter:image:alt" content="${pageTitle}" />` : ''}
  
  <meta http-equiv="refresh" content="0; url=${productUrl}" />
</head>
<body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
  <h1>${pageTitle}</h1>
  ${pageImage ? `<img src="${pageImage}" alt="${pageTitle}" style="max-width: 400px; border-radius: 8px; margin: 20px 0;" />` : ''}
  <p>${pageDescription}</p>
  <p>Redirecionando para o app...</p>
  <a href="${productUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 8px;">Ir para o App</a>
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
