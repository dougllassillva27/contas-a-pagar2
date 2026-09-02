// ==============================================================================
// 🛡️ Middlewares de Rate Limiting (Proteção contra DoS e Brute-Force)
// ==============================================================================

const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de 15 minutos
  max: 5, // Limite de 5 tentativas por IP
  message: 'Muitas tentativas de login a partir deste IP. Por favor, tente novamente após 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // Limite agressivo: 3 cadastros por IP a cada 15 min
  message: 'Muitas tentativas de cadastro a partir deste IP. Tente novamente após 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

const portalTerceiroLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Previne brute-force de UUID sem bloquear uso legítimo
  message: 'Muitas requisições. Tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

const integracaoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Endpoint crítico: limite conservador mesmo com token válido
  message: { success: false, error: 'Limite de requisições excedido para esta API.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de 15 minutos
  max: 200, // Limite generoso para uso normal da API, bloqueia apenas flood agressivo
  message: { success: false, error: 'Limite de requisições excedido para este IP. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, signupLimiter, portalTerceiroLimiter, integracaoLimiter, apiLimiter };
