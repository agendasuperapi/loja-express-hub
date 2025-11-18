<?php
/**
 * Arquivo: share.php (FINAL)
 * Descrição: Atua como um proxy para a Edge Function do Supabase que gera as meta tags.
 * Modificado para enviar um User-Agent de bot e seguir redirecionamentos,
 * garantindo que a Edge Function retorne o HTML das meta tags.
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
    // Caso de produto: /p/:short_id
    $final_url .= "?product=" . urlencode($id);
} elseif ($tipo === 'loja' && $username) {
    // Caso de loja: /:store_slug
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

// *** SOLUÇÃO PARA O CÓDIGO 302 ***
// A Edge Function redireciona se não reconhecer um bot.
// 1. Definimos um User-Agent conhecido como bot para forçar a Edge Function a retornar o HTML.
curl_setopt($ch, CURLOPT_USERAGENT, "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)");
// 2. Garantimos que o cURL siga qualquer redirecionamento, caso a Edge Function ainda o faça.
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
// *********************************

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$curl_error = curl_error($ch);
curl_close($ch);

// 4. Tratar a resposta
if ($curl_error) {
    // Erro na requisição cURL
    http_response_code(500);
    exit("Erro ao conectar com o serviço de meta tags: " . $curl_error);
}

// 5. Enviar o código de status e o conteúdo da resposta da função do Supabase
http_response_code($http_code);

// Repassamos o Content-Type e o conteúdo para o bot de rede social.
if (strpos($content_type, 'text/html') !== false) {
    header("Content-Type: text/html; charset=utf-8");
    echo $response;
} else {
    echo $response;
}

?>
