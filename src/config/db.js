const { Pool, types } = require('pg');

// Força o driver a interpretar DECIMAL/NUMERIC como Número, não String
types.setTypeParser(1700, (val) => {
  return val === null ? null : parseFloat(val);
});

// LÊ A URL DO .ENV
const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== 'test') {
  console.error('❌ DATABASE_URL não encontrada no .env ou nas variáveis de ambiente!');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  client_encoding: 'UTF8',
  max: 10, // Reduzido de 20 para 10 — previne esgotamento em requests concorrentes
  min: 2, // Mantém 2 conexões ativas para prevenir cold start do Neon
  idleTimeoutMillis: 5000, // Reduzido de 30s para 5s — remove conexões stale rapidamente
  connectionTimeoutMillis: 10000, // 10s timeout para obter conexão
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: true, // Permite pool fechar conexões idle ao encerrar processo
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool de conexões:', err.message);
});

// Helper centralizado para verificar se logs de performance estão ativos
const isPerfEnabled = () => {
  const debug = String(process.env.DEBUG_PERF || '').toLowerCase().trim();
  return debug === 'true' || debug === '1' || (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test');
};

// ✅ OBS-20260601-04 + OBS-20260621-01: Health check + retry para conexões stale.
// O Neon encerra conexões após transações (BEGIN/COMMIT). O pool do pg reutiliza
// a conexão morta e pool.query() fica PRESO até TCP timeout (25s+).
// Solução: pegar conexão via pool.connect(), testar com SELECT 1 (timeout 3s),
// se falhar descartar e recriar. Previne hang de 25s+ no GET /.
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 500;
const HEALTH_CHECK_TIMEOUT_MS = 3000;

function isConnectionError(err) {
  if (!err || !err.message) return false;
  const msg = err.message;
  return (
    msg.includes('Connection terminated') ||
    msg.includes('connection terminated') ||
    msg.includes('Client has encountered a connection error') ||
    msg.includes('terminated unexpectedly') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT')
  );
}

// Health check centralizado — testa conexão com SELECT 1 (timeout 3s)
async function healthCheck(client) {
  await Promise.race([
    client.query('SELECT 1'),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CHECK_TIMEOUT_MS)
    ),
  ]);
}

// Wrapper de performance para client.query — loga duração de cada query
function wrapClientWithPerf(client) {
  if (!isPerfEnabled()) return client;
  const originalQuery = client.query.bind(client);
  client.query = async (text, params) => {
    const start = Date.now();
    const result = await originalQuery(text, params);
    const duration = Date.now() - start;
    console.log(`[DB-PERF-CLIENT] ⏱️ ${duration}ms | Query: ${String(text).substring(0, 100).replace(/\n/g, ' ')}...`);
    return result;
  };
  return client;
}

async function queryWithHealthCheck(text, params) {
  const client = await pool.connect();
  try {
    await healthCheck(client);
    const result = await client.query(text, params);
    client.release();
    return result;
  } catch (err) {
    const isStale = isConnectionError(err) || err.message === 'Health check timeout';
    if (isStale) {
      console.warn(`[DB-RETRY] Conexão stale detectada, recriando...`);
      client.release(err); // release(err) marca como defeituosa — pool descarta
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      // Retry usa pool.query() direto — pool cria conexão nova
      return await pool.query(text, params);
    }
    client.release();
    throw err;
  }
}

module.exports = {
  query: async (text, params) => {
    if (isPerfEnabled()) {
      const start = Date.now();
      const timestamp = new Date().toISOString();
      const result = await queryWithHealthCheck(text, params);
      const duration = Date.now() - start;
      console.log(`[${timestamp}] [DB-PERF] ⏱️ ${duration}ms | Query: ${String(text).substring(0, 100).replace(/\n/g, ' ')}...`);
      return result;
    }
    return queryWithHealthCheck(text, params);
  },
  getClient: async () => {
    const start = Date.now();
    const client = await pool.connect();
    const elapsed = Date.now() - start;
    if (elapsed > 1000) {
      console.warn(`[DB-POOL] ⚠️ getClient() demorou ${elapsed}ms — possível cold start ou pool esgotado`);
    }
    try {
      await healthCheck(client);
      return wrapClientWithPerf(client);
    } catch (err) {
      console.warn(`[DB-POOL] Conexão stale detectada no getClient(), recriando...`);
      client.release(err);
      const newClient = await pool.connect();
      try {
        await healthCheck(newClient);
        return wrapClientWithPerf(newClient);
      } catch (err2) {
        newClient.release(err2);
        throw err2;
      }
    }
  },
  end: () => pool.end(), // Para teardown dos testes
};
