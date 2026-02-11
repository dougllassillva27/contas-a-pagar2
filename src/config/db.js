const { Pool } = require('pg');

// Em produção (Render), usaremos a variável de ambiente DATABASE_URL.
// Localmente, você pode criar um arquivo .env ou colocar sua string aqui para testar.
const connectionString = process.env.DATABASE_URL || 'postgres://seu_usuario:senha@localhost:5432/gestao_financeira';

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(), // Para transações
};
