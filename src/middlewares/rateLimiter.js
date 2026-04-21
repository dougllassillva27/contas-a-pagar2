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

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de 15 minutos
  max: 200, // Limite generoso para uso normal da API, bloqueia apenas flood agressivo
  message: { success: false, error: 'Limite de requisições excedido para este IP. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, apiLimiter };
