// ==============================================================================
// 🧪 TESTES UNITÁRIOS — rateLimiter
//
// Testa configuração dos limiters loginLimiter e apiLimiter.
// Valida parâmetros (windowMs, max, message) e headers padrão.
//
// Para rodar APENAS este arquivo:
//   npx jest __tests__/middlewares/rateLimiter.test.js
// ==============================================================================

jest.mock('express-rate-limit', () => {
  const mockRateLimit = jest.fn((options) => {
    const middleware = (req, res, next) => next();
    middleware._options = options;
    return middleware;
  });
  return mockRateLimit;
});

const { loginLimiter, apiLimiter } = require('../../src/middlewares/rateLimiter');

describe('rateLimiter', () => {
  describe('loginLimiter', () => {
    test('deve chamar rateLimit com windowMs de 15 minutos', () => {
      expect(loginLimiter._options.windowMs).toBe(15 * 60 * 1000);
    });

    test('deve chamar rateLimit com max de 5 tentativas', () => {
      expect(loginLimiter._options.max).toBe(5);
    });

    test('deve ter mensagem de erro personalizada em português', () => {
      expect(loginLimiter._options.message).toContain('Muitas tentativas de login');
      expect(loginLimiter._options.message).toContain('15 minutos');
    });

    test('deve ter standardHeaders habilitado', () => {
      expect(loginLimiter._options.standardHeaders).toBe(true);
    });

    test('deve ter legacyHeaders desabilitado', () => {
      expect(loginLimiter._options.legacyHeaders).toBe(false);
    });
  });

  describe('apiLimiter', () => {
    test('deve chamar rateLimit com windowMs de 15 minutos', () => {
      expect(apiLimiter._options.windowMs).toBe(15 * 60 * 1000);
    });

    test('deve chamar rateLimit com max de 200 requisições', () => {
      expect(apiLimiter._options.max).toBe(200);
    });

    test('deve ter mensagem de erro personalizada como objeto JSON', () => {
      expect(apiLimiter._options.message).toHaveProperty('success', false);
      expect(apiLimiter._options.message.error).toContain('Limite de requisições excedido');
    });

    test('deve ter standardHeaders habilitado', () => {
      expect(apiLimiter._options.standardHeaders).toBe(true);
    });

    test('deve ter legacyHeaders desabilitado', () => {
      expect(apiLimiter._options.legacyHeaders).toBe(false);
    });
  });
});