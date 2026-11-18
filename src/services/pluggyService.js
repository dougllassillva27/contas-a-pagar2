'use strict';
// ==============================================================================
// pluggyService — leitura da fatura do cartão no Meu Pluggy
// ==============================================================================
// Uso pessoal (Meu Pluggy): credenciais no .env, item já conectado no Dashboard.
// Nada aqui escreve no banco nem no app: o serviço só lê.
//
// Endpoints usados:
//   POST /auth                      → apiKey (validade ~2h, cacheado em memória)
//   GET  /accounts?itemId=          → acha a conta CREDIT/CREDIT_CARD
//   GET  /bills?accountId=          → faturas (totalAmount, dueDate)
//   GET  /v2/transactions?accountId=&dateFrom=&dateTo=&after=  → transações (cursor)
//
// O endpoint antigo GET /transactions foi desligado pela Pluggy (HTTP 410).
// ==============================================================================

const API_BASE = 'https://api.pluggy.ai';
const TIMEOUT_MS = 25000;
const TTL_API_KEY_MS = 90 * 60 * 1000; // apiKey vale 2h; renova antes

let cache = { apiKey: null, expira: 0 };

// Normaliza qualquer data (string ISO, Date do driver pg ou toString) para YYYY-MM-DD.
// Sem isso, coluna DATE lida do Postgres vira "Sun Nov 08" e compara errado.
function diaISO(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return isNaN(valor) ? null : valor.toISOString().slice(0, 10);
  const texto = String(valor);
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);
  const d = new Date(texto);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

function config() {
  return {
    clientId: (process.env.PLUGGY_CLIENT_ID || '').trim(),
    clientSecret: (process.env.PLUGGY_CLIENT_SECRET || '').trim(),
    itemId: (process.env.PLUGGY_ITEM_ID || '').trim(),
    accountId: (process.env.PLUGGY_ACCOUNT_ID || '').trim(),
    label: (process.env.PLUGGY_CARTAO_LABEL || '').trim(),
  };
}

function estaConfigurado() {
  const c = config();
  return Boolean(c.clientId && c.clientSecret && c.itemId);
}

async function chamar(caminho, { apiKey, method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-KEY'] = apiKey;

  const res = await fetch(API_BASE + caminho, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const texto = await res.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = { raw: texto };
  }

  if (!res.ok) {
    const detalhe = dados?.message || dados?.error || JSON.stringify(dados).slice(0, 200);
    const erro = new Error(`Pluggy HTTP ${res.status} em ${method} ${caminho.split('?')[0]}: ${detalhe}`);
    erro.status = res.status;
    erro.retryAfter = res.headers.get('Retry-After');
    throw erro;
  }
  return dados;
}

async function obterApiKey(forcar = false) {
  const c = config();
  if (!c.clientId || !c.clientSecret) {
    throw new Error('PLUGGY_CLIENT_ID/PLUGGY_CLIENT_SECRET ausentes no .env');
  }
  if (!forcar && cache.apiKey && Date.now() < cache.expira) return cache.apiKey;

  const dados = await chamar('/auth', {
    method: 'POST',
    body: { clientId: c.clientId, clientSecret: c.clientSecret },
  });
  if (!dados?.apiKey) throw new Error('Pluggy não devolveu apiKey');
  cache = { apiKey: dados.apiKey, expira: Date.now() + TTL_API_KEY_MS };
  return cache.apiKey;
}

function normalizarConta(acc) {
  return {
    id: acc.id,
    type: acc.type,
    subtype: acc.subtype,
    name: acc.name || acc.marketingName || null,
    number: acc.number || null,
    balance: acc.balance != null ? Number(acc.balance) : null,
    cartao: acc.type === 'CREDIT' && (acc.subtype === 'CREDIT_CARD' || !acc.subtype),
    fechamento: acc.creditData?.balanceCloseDate ? String(acc.creditData.balanceCloseDate).slice(0, 10) : null,
    vencimento: acc.creditData?.balanceDueDate ? String(acc.creditData.balanceDueDate).slice(0, 10) : null,
    limite: acc.creditData?.creditLimit != null ? Number(acc.creditData.creditLimit) : null,
    limiteDisponivel: acc.creditData?.availableCreditLimit != null ? Number(acc.creditData.availableCreditLimit) : null,
    bandeira: acc.creditData?.brand || null,
  };
}

async function listarContas(itemId) {
  const apiKey = await obterApiKey();
  const dados = await chamar(`/accounts?itemId=${encodeURIComponent(itemId || config().itemId)}`, { apiKey });
  const lista = Array.isArray(dados) ? dados : dados?.results || [];
  return lista.map(normalizarConta);
}

async function contaCartao() {
  const c = config();
  const contas = await listarContas(c.itemId);
  if (c.accountId) {
    const achada = contas.find((x) => x.id === c.accountId);
    if (achada) return achada;
  }
  return contas.find((x) => x.cartao) || null;
}

async function listarFaturas(accountId) {
  const apiKey = await obterApiKey();
  const dados = await chamar(`/bills?accountId=${encodeURIComponent(accountId || config().accountId)}`, { apiKey });
  const lista = Array.isArray(dados) ? dados : dados?.results || [];
  return lista
    .map((b) => ({
      id: b.id,
      vencimento: diaISO(b.dueDate),
      total: Number(b.totalAmount) || 0,
      minimo: b.minimumPaymentAmount != null ? Number(b.minimumPaymentAmount) : null,
      fecha: diaISO(b.balanceCloseDate),
    }))
    .sort((a, b) => String(b.vencimento).localeCompare(String(a.vencimento)));
}

// Transações do cartão, paginadas por cursor (`after`). O filtro é por data da transação.
async function listarTransacoes({ accountId, de, ate, maxPaginas = 40 } = {}) {
  const apiKey = await obterApiKey();
  const acc = accountId || config().accountId;
  if (!acc) throw new Error('PLUGGY_ACCOUNT_ID ausente');

  const base = `/v2/transactions?accountId=${encodeURIComponent(acc)}&dateFrom=${de}&dateTo=${ate}`;
  const todas = [];
  let after = null;

  for (let pagina = 0; pagina < maxPaginas; pagina++) {
    // A Pluggy devolve `next` já como querystring completa ("?accountId=...&after=...")
    // e a documentação manda anexar ao caminho. Montar "&after=<next>" devolve 400
    // "Invalid cursor" quando a consulta passa de uma página (500 resultados).
    const caminho = !after
      ? base
      : String(after).startsWith('?')
        ? `/v2/transactions${after}`
        : `${base}&after=${encodeURIComponent(after)}`;
    const dados = await chamar(caminho, { apiKey });
    const resultados = dados?.results || (Array.isArray(dados) ? dados : []);
    todas.push(...resultados);
    after = dados?.next || null;
    if (!after || resultados.length === 0) break;
  }
  return todas;
}

function intervaloDoMes(mes, ano) {
  const mm = String(mes).padStart(2, '0');
  const proximoMes = Number(mes) === 12 ? 1 : Number(mes) + 1;
  const proximoAno = Number(mes) === 12 ? Number(ano) + 1 : Number(ano);
  return {
    de: `${ano}-${mm}-01`,
    ate: `${proximoAno}-${String(proximoMes).padStart(2, '0')}-01`,
  };
}

module.exports = {
  estaConfigurado,
  config,
  obterApiKey,
  listarContas,
  contaCartao,
  listarFaturas,
  listarTransacoes,
  intervaloDoMes,
  _resetCache: () => {
    cache = { apiKey: null, expira: 0 };
  },
};
