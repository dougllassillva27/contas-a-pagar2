const url = process.env.KEEP_ALIVE_URL;
const maxTentativas = Number(process.env.MAX_TENTATIVAS || 3);
const timeoutMs = Number(process.env.TIMEOUT_MS || 15000);
const esperaEntreTentativasMs = Number(process.env.ESPERA_ENTRE_TENTATIVAS_MS || 4000);
const validarJsonHealth = String(process.env.VALIDAR_JSON_HEALTH || 'true').toLowerCase() === 'true';

if (!url) {
  console.error('[ERRO] A variável KEEP_ALIVE_URL não foi definida.');
  process.exit(1);
}

function dormir(ms) {
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

function tentarParseJson(texto) {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function validarRespostaHealth(status, bodyTexto, bodyJson) {
  if (status < 200 || status >= 400) {
    throw new Error(`HTTP inválido: ${status}`);
  }

  if (!validarJsonHealth) {
    return;
  }

  if (!bodyJson) {
    throw new Error('A resposta não é um JSON válido.');
  }

  const statusHealth = String(bodyJson.status || '').toLowerCase();
  if (statusHealth && statusHealth !== 'ok') {
    throw new Error(`Health retornou status inválido no JSON: ${bodyJson.status}`);
  }

  if ('db' in bodyJson && String(bodyJson.db).toLowerCase() === 'offline') {
    throw new Error('Banco reportado como offline no health check.');
  }

  if ('app' in bodyJson && String(bodyJson.app).toLowerCase() === 'offline') {
    throw new Error('Aplicação reportada como offline no health check.');
  }

  if (!bodyTexto || !bodyTexto.trim()) {
    throw new Error('Resposta vazia no endpoint de health.');
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
  const bodyJson = tentarParseJson(bodyTexto);

  console.log('----------------------------------------');
  console.log(`Tentativa: ${numeroTentativa}/${maxTentativas}`);
  console.log(`URL: ${url}`);
  console.log(`Status HTTP: ${resposta.status}`);
  console.log(`Tempo (ms): ${duracaoMs}`);
  console.log(`Executado em: ${new Date().toISOString()}`);
  console.log(`Resposta (até 500 chars): ${bodyTexto.slice(0, 500)}`);
  console.log('----------------------------------------');

  validarRespostaHealth(resposta.status, bodyTexto, bodyJson);

  return {
    ok: true,
    status: resposta.status,
    duracaoMs,
    bodyTexto,
    bodyJson,
  };
}

async function main() {
  let ultimoErro = null;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      const resultado = await executarTentativa(tentativa);

      console.log('[SUCESSO] Keep alive executado com sucesso.');
      console.log(`[SUCESSO] HTTP ${resultado.status} em ${resultado.duracaoMs} ms.`);
      process.exit(0);
    } catch (erro) {
      ultimoErro = erro;
      console.error(`[FALHA] Tentativa ${tentativa} falhou: ${erro.message}`);

      const aindaPodeTentar = tentativa < maxTentativas;
      if (aindaPodeTentar) {
        console.log(`[INFO] Aguardando ${esperaEntreTentativasMs} ms para nova tentativa...`);
        await dormir(esperaEntreTentativasMs);
      }
    }
  }

  console.error('[ERRO FINAL] Todas as tentativas falharam.');
  console.error(`[ERRO FINAL] Motivo: ${ultimoErro?.message || 'Erro desconhecido'}`);
  process.exit(1);
}

await main();
