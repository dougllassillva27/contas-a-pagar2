// ==============================================================================
// ✅ app.js — Ponto de entrada (modularizado)
// Apenas configuração do Express, sessão e montagem dos módulos...
// ==============================================================================

// CARREGA VARIÁVEIS DE AMBIENTE
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');

// Módulos internos
const db = require('./config/db');
const repo = require('./repositories/FinanceiroRepository');
const { authMiddleware, createApiAuth, createAuthHybrid } = require('./middlewares/auth');
const requestLogger = require('./middlewares/logger');
const initDatabase = require('./helpers/initDatabase');
const infraRoutes = require('./routes/infraRoutes');
const publicRoutes = require('./routes/publicRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const apiRoutes = require('./routes/apiRoutes');
const telegramRoutes = require('./modules/botTelegram/telegramRoutes');
const dataHoraRoutes = require('./modules/dataHora/dataHoraRoutes');
const calcularLuzRoutes = require('./modules/calcularLuz/calcularLuzRoutes');
const { apiLimiter } = require('./middlewares/rateLimiter');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const isProd = process.env.NODE_ENV === 'production';
const ENV_SESSION_SECRET = process.env.SESSION_SECRET;
const ENV_API_TOKEN = process.env.API_TOKEN;

if (isProd && (!ENV_SESSION_SECRET || !ENV_API_TOKEN)) {
  console.error('❌ ERRO CRÍTICO DE SEGURANÇA: SESSION_SECRET e API_TOKEN são obrigatórios em produção.');
  process.exit(1);
}

const safeSessionSecret = ENV_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const safeApiToken = ENV_API_TOKEN || crypto.randomBytes(32).toString('hex');
app.locals.API_TOKEN = safeApiToken;

// ==============================================================================
// Configuração do Express
// ==============================================================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(compression());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Necessário para ler tokens persistentes
app.use(requestLogger);

app.set('trust proxy', 1); // Confia no proxy do Render para habilitar cookies Secure em HTTPS

app.use(
  session({
    secret: safeSessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true, // Previne acesso via JavaScript (XSS)
      sameSite: 'strict', // Proteção contra CSRF
      maxAge: 24 * 60 * 60 * 1000, // 24 horas (tempo padrão da sessão)
    },
  })
);

// ==============================================================================
// Rotas de Infraestrutura (sem autenticação)
// ==============================================================================

app.use(infraRoutes);

// ==============================================================================
// Montagem de Rotas
// ==============================================================================

// 1. Integração Android (API com token) — antes do authMiddleware
app.use(integrationRoutes(repo, createApiAuth(safeApiToken)));

// 1.5 Bot Telegram (webhook) — antes do authMiddleware
app.use(telegramRoutes(repo));

// 2. Rotas públicas (login/logout) — antes de qualquer autenticação
app.use(publicRoutes(repo));

// 2.5 Módulo Data/Hora — Protegido por Autenticação Híbrida (Sessão Web ou API Key para M2M)
app.use('/dataHora', createAuthHybrid(safeApiToken), dataHoraRoutes);

// ✅ Módulo Calcular Luz (protegido por sessão) - Rota versionada para cache busting
// Serve a interface estática (HTML/CSS/JS) do módulo.
app.use('/calcularLuz-v2', authMiddleware, express.static(path.join(__dirname, 'modules/calcularLuz/public')));

// Monta as rotas da API do módulo, também protegidas.
app.use('/calcularLuz-v2/api', authMiddleware, calcularLuzRoutes);

// 3. Middlewares de Autenticação
// ✅ Proteção principal: exige que exista user na session (restaurado ou logado agora)
app.use(authMiddleware);

// 4. Rotas protegidas (dashboard, CRUD, APIs)
// Aplica o rate limiter geral para todas as chamadas de API internas do dashboard
app.use('/api', apiLimiter);
app.use(apiRoutes(repo));

// ==============================================================================
// Error Handler Global (Failsafe final da esteira)
// Garante que exceções não tratadas retornem payloads JSON estruturados para o front
// ==============================================================================
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack);
  const status = err.status || 500;
  const message = err.message || 'Erro Interno do Servidor';

  if (req.originalUrl.startsWith('/api') || req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(status).json({ success: false, error: message });
  }
  res.status(status).send(`<h1>Erro ${status}</h1><p>${message}</p>`);
});

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
