const { Pool, types } = require('pg');

// Força o driver a interpretar DECIMAL/NUMERIC como Número, não String
types.setTypeParser(1700, (val) => {
  return val === null ? null : parseFloat(val);
});

// LÊ A URL DO .ENV
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ ERRO: DATABASE_URL não definida no arquivo .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
