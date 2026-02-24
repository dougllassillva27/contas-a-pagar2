// ==============================================================================
// ✅ app.js — Ponto de entrada (modularizado)
// Apenas configuração do Express, sessão e montagem dos módulos.
// ==============================================================================

// CARREGA VARIÁVEIS DE AMBIENTE
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');

// Módulos internos
const db = require('./config/db');
const repo = require('./repositories/FinanceiroRepository');
const { authMiddleware, createApiAuth } = require('./middlewares/auth');
const requestLogger = require('./middlewares/logger');
const initDatabase = require('./helpers/initDatabase');
const publicRoutes = require('./routes/publicRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const apiRoutes = require('./routes/apiRoutes');
const telegramRoutes = require('../botTelegram/telegramRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ⚠️ Observação de segurança:
// - manter fallback inseguro é útil em DEV, mas em PROD é recomendado definir .env com valores fortes.
const SENHA_MESTRA = (process.env.SENHA_MESTRA || 'senha_padrao_insegura').trim();
const API_TOKEN = (process.env.API_TOKEN || 'token_padrao_inseguro').trim();

// ==============================================================================
// Configuração do Express
// ==============================================================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'segredo-padrao-dev',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Em HTTPS, o ideal é secure:true
  })
);

// ==============================================================================
// Rotas de Infraestrutura (sem autenticação)
// ==============================================================================

// Health Check — para monitoramento do Render e uptimerobots
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', error: 'Database unreachable' });
  }
});

// ==============================================================================
// Montagem de Rotas
// ==============================================================================

// 1. Integração Android (API com token) — antes do authMiddleware
app.use(integrationRoutes(repo, createApiAuth(API_TOKEN)));

// 1.5 Bot Telegram (webhook) — antes do authMiddleware
app.use(telegramRoutes(repo));

// 2. Rotas públicas (login/logout) — antes do authMiddleware
app.use(publicRoutes(repo, SENHA_MESTRA));

// 3. Proteção de rotas web
app.use(authMiddleware);

// 4. Rotas protegidas (dashboard, CRUD, APIs)
app.use(apiRoutes(repo));

// ==============================================================================
// Iniciar Servidor (apenas quando rodado diretamente, não em testes)
// ==============================================================================

if (require.main === module) {
  initDatabase().then(() => {
    app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
  });
}

// Exporta para uso em testes (supertest)
module.exports = app;
