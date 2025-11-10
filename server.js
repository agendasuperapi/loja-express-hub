import express from "express";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Detectar bots de redes sociais
const isCrawler = (userAgent) => {
  return /facebookexternalhit|WhatsApp|Twitterbot|Slackbot|LinkedInBot|TelegramBot/i.test(
    userAgent
  );
};

// Rota para produtos compartilháveis /p/:shortId
app.get("/p/:shortId", async (req, res, next) => {
  const userAgent = req.headers["user-agent"] || "";
  const shortId = req.params.shortId;

  console.log("Request received:", { shortId, userAgent, isCrawler: isCrawler(userAgent) });

  // Se não for bot, serve o React app normalmente
  if (!isCrawler(userAgent)) {
    console.log("Not a crawler, serving React app");
    return next();
  }

  // Bot detectado - buscar produto e servir meta tags
  try {
    const supabaseUrl = "https://aqxgwdwuhgdxlwmbxxbi.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeGd3ZHd1aGdkeGx3bWJ4eGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NzgxNzAsImV4cCI6MjA3ODM1NDE3MH0.sU1s5opuXJ7j9efhCdvNz690LuwcqxOF_GjaBTLH9qw";

    const response = await fetch(
      `${supabaseUrl}/rest/v1/products?select=*,stores(name,slug)&short_id=eq.${shortId}`,
      {
        headers: {
          apikey: supabaseKey,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    const product = data && data.length > 0 ? data[0] : null;

    console.log("Product query result:", { product });

    if (!product) {
      console.error("Product not found for short_id:", shortId);
      
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
      
      return res.status(404).send(fallbackHtml);
    }

    const store = product.stores;
    const pageImage = product.image_url || "";
    const storeName = store?.name || "Ofertas App";
    const pageTitle = product.name;
    const pageDescription = product.description || "Pedido online";
    const productUrl = `https://ofertas.app/p/${shortId}`;
    const price = product.promotional_price || product.price;

    console.log("Meta tags prepared:", { pageTitle, pageDescription, pageImage, productUrl });

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- Primary Meta Tags -->
  <title>${pageTitle}</title>
  <meta name="title" content="${pageTitle}" />
  <meta name="description" content="${pageDescription}" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${productUrl}" />
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="product" />
  <meta property="og:url" content="${productUrl}" />
  <meta property="og:title" content="${pageTitle}" />
  <meta property="og:description" content="${pageDescription}" />
  <meta property="og:site_name" content="${storeName}" />
  ${pageImage ? `<meta property="og:image" content="${pageImage}" />` : ''}
  ${pageImage ? `<meta property="og:image:secure_url" content="${pageImage}" />` : ''}
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${pageTitle}" />
  <meta property="product:price:amount" content="${price}" />
  <meta property="product:price:currency" content="BRL" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${productUrl}" />
  <meta name="twitter:title" content="${pageTitle}" />
  <meta name="twitter:description" content="${pageDescription}" />
  ${pageImage ? `<meta name="twitter:image" content="${pageImage}" />` : ''}
  
  <!-- WhatsApp specific -->
  <meta property="og:locale" content="pt_BR" />
  
  <meta http-equiv="refresh" content="0; url=${productUrl}" />
</head>
<body>
  <h1>${pageTitle}</h1>
  <p>${pageDescription}</p>
  <p>Redirecionando para ${storeName}...</p>
  <script>
    window.location.href = "${productUrl}";
  </script>
</body>
</html>`;

    console.log("Serving HTML for crawler");
    res.send(html);
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).send("Erro ao carregar produto");
  }
});

// Servir arquivos estáticos do build
app.use(express.static(path.join(__dirname, "dist")));

// Todas as outras rotas servem o React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
