const url = process.env.KEEP_ALIVE_URL;

const maxTentativas = Number(process.env.MAX_TENTATIVAS || 3);
const timeoutMs = Number(process.env.TIMEOUT_MS || 15000);
const esperaEntreTentativasMs = Number(process.env.ESPERA_ENTRE_TENTATIVAS_MS || 4000);

if (!url) {
  console.error('❌ ERRO: KEEP_ALIVE_URL não definida');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchComTimeout(resource, options = {}, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function executarTentativa(numeroTentativa) {
  const inicio = Date.now();

  const resposta = await fetchComTimeout(
    url,
    {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'User-Agent': 'github-actions-render-keepalive',
      },
    },
    timeoutMs
  );

  const duracaoMs = Date.now() - inicio;
  const bodyTexto = await resposta.text();

  console.log('');
  console.log('====================================================');
  console.log('🚀 RENDER KEEP ALIVE');
  console.log('====================================================');
  console.log(`🔁 Tentativa: ${numeroTentativa}/${maxTentativas}`);
  console.log(`🌐 URL: ${url}`);
  console.log(`📡 Status HTTP: ${resposta.status}`);
  console.log(`⏱ Latência: ${duracaoMs} ms`);
  console.log(`🕒 Executado em UTC: ${new Date().toISOString()}`);
  console.log('📦 Resposta:');
  console.log(bodyTexto.slice(0, 500));
  console.log('====================================================');
  console.log('');

  if (!resposta.ok) {
    throw new Error(`HTTP inválido: ${resposta.status}`);
  }
}

async function main() {
  let ultimoErro = null;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      await executarTentativa(tentativa);

      console.log('✅ SUCESSO: Keep alive executado com sucesso.');
      process.exit(0);
    } catch (erro) {
      ultimoErro = erro;

      console.error(`⚠️ Falha tentativa ${tentativa}: ${erro.message}`);

      if (tentativa < maxTentativas) {
        console.log(`⏳ Aguardando ${esperaEntreTentativasMs} ms para nova tentativa...\n`);
        await sleep(esperaEntreTentativasMs);
      }
    }
  }

  console.error('❌ ERRO FINAL: Todas as tentativas falharam.');
  console.error(`Motivo: ${ultimoErro?.message || 'Erro desconhecido'}`);

  process.exit(1);
}

await main();
