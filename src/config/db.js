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
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool de conexões:', err.message);
});

// Helper centralizado para verificar se logs de performance estão ativos
const isPerfEnabled = () => {
  const debug = String(process.env.DEBUG_PERF || '').toLowerCase().trim();
  return debug === 'true' || debug === '1' || (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test');
};

module.exports = {
  query: async (text, params) => {
    if (isPerfEnabled()) {
      const start = Date.now();
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log(`[DB-PERF] ⏱️ ${duration}ms | Query: ${String(text).substring(0, 100).replace(/\n/g, ' ')}...`);
      return result;
    }
    return pool.query(text, params);
  },
  getClient: async () => {
    const client = await pool.connect();
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
