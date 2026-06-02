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
  max: 10,
  min: 1, // ✅ OBS-20260601-01: Mantém 1 conexão ativa para prevenir cold start do Neon
  idleTimeoutMillis: 60000, // ✅ Aumentado de 30s para 60s — reduz reconexões desnecessárias
  connectionTimeoutMillis: 10000, // ✅ Aumentado de 5s para 10s — tolera latência de cold start
  keepAlive: true, // ✅ TCP keepalive para detectar conexões mortas rapidamente
  keepAliveInitialDelayMillis: 10000, // ✅ Envia keepalive após 10s de inatividade
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool de conexões:', err.message);
});

// Helper centralizado para verificar se logs de performance estão ativos
const isPerfEnabled = () => {
  const debug = String(process.env.DEBUG_PERF || '').toLowerCase().trim();
  return debug === 'true' || debug === '1' || (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test');
};

// ✅ OBS-20260601-04: Retry automático para "Connection terminated unexpectedly".
// O Neon encerra conexões após transações FOR UPDATE sob latência de rede.
// Sem retry, o pool.query() fica preso 5+ min esperando conexão morta.
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

async function queryWithRetry(text, params, retries = MAX_RETRIES) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    const isConnectionError = err.message && (
      err.message.includes('Connection terminated') ||
      err.message.includes('connection terminated') ||
      err.message.includes('Client has encountered a connection error')
    );
    if (isConnectionError && retries > 0) {
      console.warn(`[DB-RETRY] ⚠️ Conexão perdida, tentando novamente (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return queryWithRetry(text, params, retries - 1);
    }
    throw err;
  }
}

module.exports = {
  query: async (text, params) => {
    if (isPerfEnabled()) {
      const start = Date.now();
      const result = await queryWithRetry(text, params);
      const duration = Date.now() - start;
      console.log(`[DB-PERF] ⏱️ ${duration}ms | Query: ${String(text).substring(0, 100).replace(/\n/g, ' ')}...`);
      return result;
    }
    return queryWithRetry(text, params);
  },
  getClient: async () => {
    const start = Date.now();
    const client = await pool.connect();
    const elapsed = Date.now() - start;
    if (elapsed > 1000) {
      console.warn(`[DB-POOL] ⚠️ getClient() demorou ${elapsed}ms — possível cold start ou pool esgotado (total: ${pool.totalCount}, idle: ${pool.idleCount}, waiting: ${pool.waitingCount})`);
    }
    if (isPerfEnabled()) {
      const originalQuery = client.query.bind(client);
      client.query = async (text, params) => {
        const start = Date.now();
        const result = await originalQuery(text, params);
        const duration = Date.now() - start;
        console.log(`[DB-PERF-CLIENT] ⏱️ ${duration}ms | Query: ${String(text).substring(0, 100).replace(/\n/g, ' ')}...`);
        return result;
      };
    }
    return client;
  },
  end: () => pool.end(), // Para teardown dos testes
};
