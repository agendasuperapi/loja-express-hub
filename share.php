<?php
$type = $_GET['type'] ?? '';
$supabase_url = 'https://aqxgwdwuhgdxlwmbxxbi.supabase.co';
$supabase_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeGd3ZHd1aGdkeGx3bWJ4eGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NzgxNzAsImV4cCI6MjA3ODM1NDE3MH0.sU1s5opuXJ7j9efhCdvNz690LuwcqxOF_GjaBTLH9qw';

if ($type === 'product') {
  // Handle product sharing
  $short_id = rtrim($_GET['short_id'] ?? '', '/');
  
  if (!$short_id) {
    http_response_code(400);
    echo 'Short ID não fornecido.';
    exit;
  }

  $api_url = "{$supabase_url}/rest/v1/products?short_id=eq.{$short_id}&select=*,stores(name,slug,logo_url)";
  $headers = [
    'Content-Type: application/json',
    'apikey: ' . $supabase_key
  ];

  $options = [
    'http' => [
      'method' => 'GET',
      'header' => implode("\r\n", $headers)
    ]
  ];

  $context = stream_context_create($options);
  $response = file_get_contents($api_url, false, $context);
  $data = json_decode($response, true);

  if (!$data || count($data) === 0) {
    http_response_code(404);
    echo 'Produto não encontrado.';
    exit;
  }

  $product = $data[0];
  $store = $product['stores'];
  
  $nome = htmlspecialchars($product['name']);
  $descricao = htmlspecialchars($product['description'] ?? '');
  $preco = $product['promotional_price'] ?? $product['price'];
  $imagem = $product['image_url'] ?? $store['logo_url'] ?? '';
  $store_name = htmlspecialchars($store['name']);
  $url_final = "https://ofertas.app/p/{$short_id}";
  
  $page_title = "{$nome} - {$store_name}";
  $og_description = $descricao ? "{$descricao} - R$ " . number_format($preco, 2, ',', '.') : "R$ " . number_format($preco, 2, ',', '.');
  
} else if ($type === 'store') {
  // Handle store sharing (old behavior)
  $username = rtrim($_GET['username'] ?? '', '/');
  
  if (!$username) {
    http_response_code(400);
    echo 'Username não fornecido.';
    exit;
  }

  $api_url = 'https://hzmixuvrnzpypriagecv.supabase.co/rest/v1/rpc/fc_share_estabelecimento';
  $headers = [
    'Content-Type: application/json',
    'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bWl4dXZybnpweXByaWFnZWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ5NjkzMTQsImV4cCI6MjA0MDU0NTMxNH0.VHtjYivpM8c9RLmKimwRiLgnb8zqGrZ88Q8vpVLZcZ0'
  ];

  $options = [
    'http' => [
      'method' => 'POST',
      'header' => implode("\r\n", $headers),
      'content' => json_encode(['param_username' => $username])
    ]
  ];

  $context = stream_context_create($options);
  $response = file_get_contents($api_url, false, $context);
  $data = json_decode($response, true);

  if (!$data || $data[0]['result'] !== 'True') {
    http_response_code(404);
    echo 'Estabelecimento não encontrado.';
    exit;
  }

  $estab = $data[0];
  $page_title = htmlspecialchars($estab['nome']);
  $descricao = htmlspecialchars($estab['descricao'] ?? '');
  $segmento = htmlspecialchars($estab['segmento']);
  $imagem = $estab['foto_perfil'];
  $og_description = $descricao ? "{$descricao} - {$segmento}" : $segmento;
  $url_final = "https://ofertas.app/{$username}";
  $nome = $page_title;
} else {
  http_response_code(400);
  echo 'Tipo inválido.';
  exit;
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title><?= $page_title ?></title>
  
  <meta property="og:title" content="<?= $page_title ?>" />
  <meta property="og:description" content="<?= $og_description ?>" />
  <meta property="og:image" content="<?= $imagem ?>" />
  <meta property="og:url" content="<?= $url_final ?>" />
  <meta property="og:type" content="website" />
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="<?= $page_title ?>">
  <meta name="twitter:description" content="<?= $og_description ?>">
  <meta name="twitter:image" content="<?= $imagem ?>">
</head>
<body>
  Redirecionando para <?= $nome ?>...
</body>
</html>
