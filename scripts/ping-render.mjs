const url = process.env.KEEP_ALIVE_URL;

const maxTentativas = Number(process.env.MAX_TENTATIVAS || 3);
const timeoutMs = Number(process.env.TIMEOUT_MS || 15000);
const esperaEntreTentativasMs = Number(process.env.ESPERA_ENTRE_TENTATIVAS_MS || 4000);

const tzApp = process.env.TZ_APP || 'America/Sao_Paulo';
const janelaHoraInicio = Number(process.env.JANELA_HORA_INICIO || 8);
const janelaHoraFim = Number(process.env.JANELA_HORA_FIM || 23);
const minutosPermitidos = String(process.env.MINUTOS_PERMITIDOS || '1,13,25,37,49')
  .split(',')
  .map((valor) => Number(valor.trim()))
  .filter((valor) => Number.isInteger(valor) && valor >= 0 && valor <= 59);

if (!url) {
  console.error('❌ ERRO: KEEP_ALIVE_URL não definida');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function obterAgoraNaTimezone(timeZone) {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date());

  const mapa = Object.fromEntries(partes.filter((parte) => parte.type !== 'literal').map((parte) => [parte.type, parte.value]));

  return {
    ano: Number(mapa.year),
    mes: Number(mapa.month),
    dia: Number(mapa.day),
    hora: Number(mapa.hour),
    minuto: Number(mapa.minute),
    segundo: Number(mapa.second),
  };
}

function deveExecutarPing() {
  const agora = obterAgoraNaTimezone(tzApp);

  const dentroDaJanela = agora.hora >= janelaHoraInicio && agora.hora <= janelaHoraFim;

  const minutoPermitido = minutosPermitidos.includes(agora.minuto);

  return {
    agora,
    dentroDaJanela,
    minutoPermitido,
    permitido: dentroDaJanela && minutoPermitido,
  };
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
  const controle = deveExecutarPing();

  console.log('');
  console.log('====================================================');
  console.log('🧠 KEEP ALIVE INTELIGENTE');
  console.log('====================================================');
  console.log(`🌎 Timezone: ${tzApp}`);
  console.log(`🕒 Agora local: ${String(controle.agora.dia).padStart(2, '0')}/${String(controle.agora.mes).padStart(2, '0')}/${controle.agora.ano} ` + `${String(controle.agora.hora).padStart(2, '0')}:${String(controle.agora.minuto).padStart(2, '0')}:${String(controle.agora.segundo).padStart(2, '0')}`);
  console.log(`📅 Janela permitida: ${janelaHoraInicio}:00 até ${janelaHoraFim}:59`);
  console.log(`⏲ Minutos permitidos: ${minutosPermitidos.join(', ')}`);
  console.log(`✅ Dentro da janela? ${controle.dentroDaJanela ? 'sim' : 'não'}`);
  console.log(`✅ Minuto permitido? ${controle.minutoPermitido ? 'sim' : 'não'}`);
  console.log('====================================================');
  console.log('');

  if (!controle.permitido) {
    console.log('⏭ Execução ignorada: fora da janela ou fora dos minutos permitidos.');
    process.exit(0);
  }

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
