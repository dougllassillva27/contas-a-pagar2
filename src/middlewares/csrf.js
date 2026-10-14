// ==============================================================================
// 🛡️ Middleware CSRF — Double-Submit Cookie Pattern
// Sem dependências externas. Gera token por sessão, valida em mutations.
// ==============================================================================

const crypto = require('crypto');

// Prefixo das rotas M2M de integração (autenticadas por x-api-key).
// Não usam sessão/cookie, portanto não são alvo de CSRF (double-submit cookie).
const INTEGRACAO_PREFIX = '/api/v1/integracao/';

function ehRotaIntegracao(req) {
  const path = req.path || '';
  return path === INTEGRACAO_PREFIX.slice(0, -1) || path.startsWith(INTEGRACAO_PREFIX);
}

function gerarCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware que garante que req.session.csrfToken exista.
 * Deve ser aplicado ANTES das rotas que renderizam formulários.
 */
function csrfProtect(req, res, next) {
  // ✅ ISENÇÃO EXPLÍCITA: /api/v1/integracao/* é M2M (x-api-key), não usa sessão.
  if (ehRotaIntegracao(req)) {
    return next();
  }

  // Garante token na sessão (sobrevive a refreshes)
  if (!req.session.csrfToken) {
    req.session.csrfToken = gerarCsrfToken();
  }

  // Expõe token para templates EJS via res.locals
  res.locals.csrfToken = req.session.csrfToken;

  // Em requests de mutação (POST/PUT/DELETE/PATCH), valida o token
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const submittedToken = req.body?._csrf || req.headers['x-csrf-token'];

    if (!submittedToken || submittedToken !== req.session.csrfToken) {
      console.log(`[CSRF] ❌ Token inválido - IP: ${req.ip}, Method: ${req.method}, Path: ${req.originalUrl}`);

      // API requests → JSON; form requests → redirect com erro
      if (req.originalUrl.startsWith('/api') || req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ success: false, error: 'Token CSRF inválido' });
      }

      // Formulários web: redireciona de volta com mensagem de erro
      return res.status(403).render('login', {
        error: 'Sessão expirada ou inválida. Por favor, tente novamente.',
        titulo: 'Gestão Financeira - Login',
      });
    }
  }

  next();
}

module.exports = { csrfProtect };
