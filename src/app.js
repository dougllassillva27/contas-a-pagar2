// ==============================================================================
// ✅ app.js — Ponto de entrada (modularizado)
// Com logs avançados para debug em produção
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
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    },
  })
);

// ==============================================================================
// Middleware de Log de Sessão
// ==============================================================================
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const sessionData = req.session.user ? `USER:${req.session.user.nome}` : 'GUEST';
  
  // Log apenas para rotas importantes (evita poluição com estáticos)
  const skipPaths = ['.css', '.js', '.ico', '.png', '.jpg', '.svg', '.woff'];
  const shouldSkip = skipPaths.some(ext => req.path.endsWith(ext));
  
  if (!shouldSkip) {
    console.log(`[${timestamp}] [SESSION] ${req.method} ${req.originalUrl} - ${sessionData}`);
  }
  
  next();
});

// ==============================================================================
// Rotas de Infraestrutura (sem autenticação)
// ==============================================================================

// ==============================================================================
// Health Check — usado para monitoramento e keep-alive
// ==============================================================================

app.get('/health', async (req, res) => {
  const inicio = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] [HEALTH] Health check initiated`);

  const uptimeSegundos = process.uptime();
  const dias = Math.floor(uptimeSegundos / 86400);
  const horas = Math.floor((uptimeSegundos % 86400) / 3600);
  const minutos = Math.floor((uptimeSegundos % 3600) / 60);
  const segundos = Math.floor(uptimeSegundos % 60);

  const uptimeFormatado = `${dias}d ${horas}h ${minutos}m ${segundos}s`;
  const serviceName = 'contas-a-pagar';

  try {
    await db.query('SELECT 1');
    const latencyMs = Date.now() - inicio;

    console.log(`[${timestamp}] [HEALTH] ✅ OK - DB: online, Latency: ${latencyMs}ms`);

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
    
    console.error(`[${timestamp}] [HEALTH] ❌ ERROR - DB: offline, Error: ${erro.message}`);

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
// Ping simples — usado para keep-alive
// ==============================================================================

app.get('/ping', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'contas-a-pagar',
    timestamp: new Date().toISOString(),
  });
});

// ==============================================================================
// Montagem de Rotas
// ==============================================================================

// 1. Integração Android (API com token)
app.use(integrationRoutes(repo, createApiAuth(API_TOKEN)));

// 1.5 Bot Telegram (webhook)
app.use(telegramRoutes(repo));

// 2. Rotas públicas (login/logout)
app.use(publicRoutes(repo, SENHA_MESTRA));

// 3. Proteção de rotas web
app.use(authMiddleware);

// 4. Rotas protegidas (dashboard, CRUD, APIs)
app.use(apiRoutes(repo));

// ==============================================================================
// Handler de Erros Global
// ==============================================================================
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [ERROR] ${err.message}`);
  console.error(`[${timestamp}] [ERROR] Stack: ${err.stack}`);
  console.error(`[${timestamp}] [ERROR] Path: ${req.originalUrl}`);
  console.error(`[${timestamp}] [ERROR] Method: ${req.method}`);
  
  res.status(500).json({
    error: 'Erro interno do servidor',
    timestamp: new Date().toISOString(),
  });
});

// ==============================================================================
// Iniciar Servidor
// ==============================================================================

if (require.main === module) {
  initDatabase().then(() => {
    console.log(`[${new Date().toISOString()}] [SERVER] ========================================`);
    console.log(`[${new Date().toISOString()}] [SERVER] 🚀 Servidor rodando na porta ${PORT}`);
    console.log(`[${new Date().toISOString()}] [SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[${new Date().toISOString()}] [SERVER] ========================================`);
    
    app.listen(PORT, () => console.log(`[${new Date().toISOString()}] [SERVER] Listening on port ${PORT}`));
  });
}

// Exporta para uso em testes (supertest)
module.exports = app;