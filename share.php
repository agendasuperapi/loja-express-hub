<?php
/**
 * Arquivo: share.php
 * Descrição: Atua como um proxy para a Edge Function do Supabase que gera as meta tags
 * para pré-visualização de links (OG Tags) em redes sociais e aplicativos de mensagens.
 */

// URL base da sua Edge Function do Supabase (a mesma usada no vercel.json)
$supabase_function_url = "https://mgpzowiahnwcmcaelogf.supabase.co/functions/v1/meta-tags-proxy";

// 1. Obter os parâmetros da URL reescrita pelo .htaccess
$tipo = $_GET['tipo'] ?? null;
$id = $_GET['id'] ?? null;
$username = $_GET['username'] ?? null;

// 2. Construir a URL completa para a função do Supabase
$final_url = $supabase_function_url;

if ($tipo === 'produto' && $id) {
    // Caso de produto: /p/:short_id -> share.php?tipo=produto&id=:id
    // A função do Supabase espera o parâmetro 'product'
    $final_url .= "?product=" . urlencode($id);
} elseif ($tipo === 'loja' && $username) {
    // Caso de loja: /:store_slug -> share.php?tipo=loja&username=:username
    // A função do Supabase espera o parâmetro 'store'
    $final_url .= "?store=" . urlencode($username);
} else {
    // Se não houver parâmetros válidos, retorna 404
    http_response_code(404);
    exit("Parâmetros de compartilhamento inválidos.");
}

// 3. Fazer a requisição HTTP para a função do Supabase
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $final_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_HEADER, 0);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

// *** IMPORTANTE: Definir User-Agent de bot para forçar a Edge Function a retornar HTML ***
// A Edge Function redireciona se não reconhecer um bot.
// Definimos um User-Agent conhecido como bot para forçar a Edge Function a retornar o HTML.
curl_setopt($ch, CURLOPT_USERAGENT, "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)");
// Garantimos que o cURL siga qualquer redirecionamento, caso a Edge Function ainda o faça.
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_MAXREDIRS, 5);

// Headers adicionais
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language: pt-BR,pt;q=0.9,en;q=0.8'
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$curl_error = curl_error($ch);
curl_close($ch);

// 4. Tratar a resposta
if ($curl_error) {
    http_response_code(500);
    exit("Erro ao conectar com o serviço de meta tags: " . $curl_error);
}

// 5. Validar e processar a resposta
// Se a resposta estiver vazia ou não for HTML, pode ser um problema
if (empty($response)) {
    http_response_code(500);
    exit("Resposta vazia da Edge Function. Verifique os logs.");
}

// Verificar se a resposta é HTML válido
$isHtml = strpos($content_type, 'text/html') !== false || 
          strpos($response, '<html') !== false || 
          strpos($response, '<!DOCTYPE') !== false ||
          empty($content_type);

// 6. Enviar o código de status e o conteúdo da resposta da função do Supabase
// Sempre retornar 200 para HTML válido, mesmo se o código HTTP for diferente
if ($isHtml) {
    http_response_code(200);
} elseif ($http_code >= 200 && $http_code < 300) {
    http_response_code($http_code);
} else {
    http_response_code(500);
}

// Headers importantes para crawlers - FORÇAR atualização do cache
header("X-Robots-Tag: all");
header("Cache-Control: no-cache, no-store, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");
header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");

// Headers adicionais para garantir que o WhatsApp/Facebook atualizem o cache
header("X-Content-Type-Options: nosniff");

// Repassamos o Content-Type e o conteúdo para o bot de rede social.
if ($isHtml) {
    header("Content-Type: text/html; charset=utf-8");
    // Garantir que a resposta seja HTML válido
    echo $response;
} else {
    if ($content_type) {
        header("Content-Type: " . $content_type);
    }
    echo $response;
}

?>
