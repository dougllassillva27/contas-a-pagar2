const url = process.env.KEEP_ALIVE_URL;

if (!url) {
  console.error('A variável KEEP_ALIVE_URL não foi definida.');
  process.exit(1);
}

try {
  const inicio = Date.now();

  const resposta = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'User-Agent': 'github-actions-render-keepalive'
    }
  });

  const duracaoMs = Date.now() - inicio;
  const corpo = await resposta.text();

  console.log('----------------------------------------');
  console.log('Render Keep Alive');
  console.log('URL:', url);
  console.log('Status HTTP:', resposta.status);
  console.log('Tempo (ms):', duracaoMs);
  console.log('Resposta:', corpo.slice(0, 500));
  console.log('Executado em:', new Date().toISOString());
  console.log('----------------------------------------');

  if (!resposta.ok) {
    console.error(`Health check falhou com status ${resposta.status}`);
    process.exit(1);
  }
} catch (erro) {
  console.error('Erro ao executar ping no Render.');
  console.error(erro?.message || erro);
  process.exit(1);
}