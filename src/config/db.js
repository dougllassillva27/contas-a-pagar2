const { Pool, types } = require('pg');

// CORREÇÃO CRÍTICA: Força o driver a interpretar DECIMAL/NUMERIC como Número, não String
types.setTypeParser(1700, (val) => {
  return val === null ? null : parseFloat(val);
});

// Em produção (Render), usaremos a variável de ambiente DATABASE_URL.
const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_8HBgTYfS7sZb@ep-icy-fire-ainq8c31-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
