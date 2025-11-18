<?php

$tipo = $_GET['tipo'] ?? null;

if ($tipo === "produto") {

  // --- PRODUTO ---
  $id = $_GET['id'] ?? null;
  if (!$id) {
    http_response_code(400);
    echo "ID do produto não fornecido.";
    exit;
  }

  // CHAMA RPC DO PRODUTO
  $api_url = 'https://hzmixuvrnzpypriagecv.supabase.co/rest/v1/rpc/fc_share_produto';
  $post_data = ['param_id' => $id];

} else if ($tipo === "loja") {

  // --- LOJA ---
  $username = $_GET['username'] ?? null;
  if (!$username) {
    http_response_code(400);
    echo "Username não fornecido.";
    exit;
  }

  // CHAMA RPC DO ESTABELECIMENTO
  $api_url = 'https://hzmixuvrnzpypriagecv.supabase.co/rest/v1/rpc/fc_share_estabelecimento';
  $post_data = ['param_username' => $username];

} else {
  http_response_code(400);
  echo "Tipo inválido.";
  exit;
}


// --- CHAMADA SUPABASE ---

$headers = [
  'Content-Type: application/json',
  'apikey: ' . 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bWl4dXZybnpweXByaWFnZWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ5NjkzMTQsImV4cCI6MjA0MDU0NTMxNH0.VHtjYivpM8c9RLmKimwRiLgnb8zqGrZ88Q8vpVLZcZ0'
];

$options = [
  'http' => [
    'method' => 'POST',
    'header' => implode("\r\n", $headers),
    'content' => json_encode($post_data)
  ]
];

$context = stream_context_create($options);
$response = file_get_contents($api_url, false, $context);
$data = json_decode($response, true);

if (!$data || $data[0]['result'] !== 'True') {
  http_response_code(404);
  echo "Não encontrado.";
  exit;
}

$info = $data[0];


if ($tipo === "produto") {

  $titulo = htmlspecialchars($info['nome_produto']);
  $preco  = number_format($info['preco'], 2, ',', '.');
  $descricao = "💰 R$ {$preco}";
  $imagem = $info['foto_produto'];
  $link_final = "https://ofertas.app/p/" . $info['id'];

} else {

  $titulo = htmlspecialchars($info['nome']);
  $descricao = htmlspecialchars($info['descricao'] ?? $info['segmento']);
  $imagem = $info['foto_perfil'];
  $link_final = "https://ofertas.app/" . $info['username'];
}

?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title><?= $titulo ?></title>

  <meta property="og:title" content="<?= $titulo ?>" />
  <meta property="og:description" content="<?= $descricao ?>" />
  <meta property="og:image" content="<?= $imagem ?>" />
  <meta property="og:url" content="<?= $link_final ?>" />
  <meta property="og:type" content="website" />

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="<?= $titulo ?>">
  <meta name="twitter:description" content="<?= $descricao ?>">
  <meta name="twitter:image" content="<?= $imagem ?>">
</head>
<body>
  Carregando...
  <script>
    window.location.href = "<?= $link_final ?>";
  </script>
</body>
</html>
