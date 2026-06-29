const { Pool, types } = require('pg');

// Força o driver a interpretar DECIMAL/NUMERIC como Número, não String
types.setTypeParser(1700, (val) => {
  return val === null ? null : parseFloat(val);
});

// LÊ A URL DO .ENV
const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== 'test') {
  console.error('❌ ERRO: DATABASE_URL não definida no arquivo .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  client_encoding: 'UTF8',
});

module.exports = {
  query: async (text, params) => {
    const isPerfEnabled = process.env.DEBUG_PERF === 'true';
    if (isPerfEnabled || (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test')) {
      const start = Date.now();
      const result = await pool.query(text, params);
      return result;
    }
    return pool.query(text, params);
  },
  getClient: async () => {
    const client = await pool.connect();
    const isPerfEnabled = process.env.DEBUG_PERF === 'true';
    if (isPerfEnabled || (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test')) {
      const originalQuery = client.query.bind(client);
      client.query = async (text, params) => {
        const start = Date.now();
        const result = await originalQuery(text, params);
        return result;
      };
    }
    return client;
  },
  end: () => pool.end(), // Para teardown dos testes
};
