// ==============================================================================
// ✅ app.js — Ponto de entrada (modularizado)
// Apenas configuração do Express, sessão e montagem dos módulos...
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
    secret: process.env.SESSION_SECRET || 'segredo_sessao_inseguro',
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: false, // Em HTTPS, o ideal é secure:true
      httpOnly: true, // Previne acesso via JavaScript (XSS)
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    },
  })
);

// ==============================================================================
// Rotas de Infraestrutura (sem autenticação)
// ==============================================================================

// ==============================================================================
// Health Check — usado para monitoramento e keep-alive
// Verifica aplicação + banco e retorna informações básicas do serviço
// ==============================================================================

app.get('/health', async (req, res) => {
  const inicio = Date.now(); // usado para medir latência

  // Calcula uptime da aplicação
  const uptimeSegundos = process.uptime();
  const dias = Math.floor(uptimeSegundos / 86400);
  const horas = Math.floor((uptimeSegundos % 86400) / 3600);
  const minutos = Math.floor((uptimeSegundos % 3600) / 60);
  const segundos = Math.floor(uptimeSegundos % 60);

  const uptimeFormatado = `${dias}d ${horas}h ${minutos}m ${segundos}s`;

  const serviceName = 'contas-a-pagar';

  try {
    // Verifica conectividade com o banco
    await db.query('SELECT 1');

    const latencyMs = Date.now() - inicio;

    return res.status(200).json({
      service: serviceName,
      status: 'ok',
      app: 'online',
      db: 'online',
      latency_ms: latencyMs,
      uptime: uptimeFormatado,
      timestamp: new Date().toISOString(),
    });
  } catch (erro) {
    const latencyMs = Date.now() - inicio;

    return res.status(503).json({
      service: serviceName,
      status: 'error',
      app: 'online',
      db: 'offline',
      latency_ms: latencyMs,
      uptime: uptimeFormatado,
      timestamp: new Date().toISOString(),
    });
  }
});

// ==============================================================================
// Ping simples — usado para keep-alive e monitoramento leve
// Diferente do /health, esta rota NÃO consulta o banco.
// Objetivo: responder rápido com HTTP 200 para manter o Render ativo.
// ==============================================================================

app.get('/ping', (req, res) => {
  return res.status(200).json({
    status: 'ok', // indica resposta bem-sucedida
    service: 'contas-a-pagar', // identifica o serviço monitorado
    timestamp: new Date().toISOString(), // momento exato da resposta
  });
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
    console.log('====================================================');
    console.log('🚀 Servidor rodando na porta ' + PORT);
    console.log('📅 Data: ' + new Date().toLocaleString('pt-BR'));
    console.log('🌐 Ambiente: ' + (process.env.NODE_ENV || 'development'));
    console.log('====================================================');
    app.listen(PORT);
  });
}

// Exporta para uso em testes (supertest)
module.exports = app;