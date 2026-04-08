require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
// Compatibilidade com o mesmo padrão da aplicação principal
const API_KEY = process.env.API_KEY || process.env.API_TOKEN || 'token_padrao_inseguro';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection Pool (Neon PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Auto-Migração Blindada (Faxina Completa)
const syncDatabaseSchema = async () => {
  console.log('Validando e sincronizando esquema do banco de dados...');
  try {
    // 1. Cria colunas novas (se não existirem)
    await pool.query(`ALTER TABLE registros_luz ADD COLUMN IF NOT EXISTS leitura_atual NUMERIC(10, 2) DEFAULT 0;`);
    await pool.query(`ALTER TABLE registros_luz ADD COLUMN IF NOT EXISTS consumo_kwh NUMERIC(10, 2) DEFAULT 0;`);
    await pool.query(`ALTER TABLE registros_luz ADD COLUMN IF NOT EXISTS valor_estimado NUMERIC(10, 2) DEFAULT 0;`);

    // 2. Varredura e remoção de TODAS as colunas antigas obsoletas que causam erro NOT NULL
    const colunasAntigas = [
      'valor_conta',
      'consumo_conta',
      'leitura_atual_conta',
      'leitura_anterior_conta',
      'valor_kwh',
      'valor_medio',
    ];

    for (const col of colunasAntigas) {
      await pool.query(`ALTER TABLE registros_luz DROP COLUMN IF EXISTS ${col};`);
    }

    console.log('Banco de dados sincronizado e limpo com sucesso.');
  } catch (error) {
    console.error('ERRO CRÍTICO ao sincronizar banco:', error);
  }
};

// Middleware de Segurança: Proteção das rotas da API
app.use('/api', (req, res, next) => {
  const clientKey = req.headers['x-api-key'] || req.query.api_key;
  if (!clientKey || clientKey !== API_KEY) {
    return res.status(401).json({ error: 'Acesso Negado: API Key inválida ou ausente.' });
  }
  next();
});

// Routes
app.get('/api/historico', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registros_luz ORDER BY data_registro DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Database fetch error:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

app.post('/api/salvar', async (req, res) => {
  const { mesReferencia, leituraAnterior, leituraAtual, consumo, valorEstimado } = req.body;

  if (!mesReferencia || leituraAnterior === undefined || leituraAtual === undefined) {
    return res.status(400).json({ error: 'Dados obrigatórios ausentes.' });
  }

  try {
    const query = `
            INSERT INTO registros_luz 
            (mes_referencia, leitura_anterior, leitura_atual, consumo_kwh, valor_estimado)
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *
        `;
    const values = [mesReferencia, leituraAnterior, leituraAtual, consumo, valorEstimado];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Database insert error:', err);
    res.status(500).json({ error: 'Erro ao salvar registro', details: err.message });
  }
});

app.delete('/api/deletar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM registros_luz WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Database delete error:', err);
    res.status(500).json({ error: 'Erro ao deletar registro' });
  }
});

// Start Server: Só inicia DEPOIS que a migração terminar.
syncDatabaseSchema().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
