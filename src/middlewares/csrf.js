// ==============================================================================
// 🛡️ Middleware CSRF — Double-Submit Cookie Pattern
// Sem dependências externas. Gera token por sessão, valida em mutations.
// ==============================================================================

const crypto = require('crypto');

function gerarCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware que garante que req.session.csrfToken exista.
 * Deve ser aplicado ANTES das rotas que renderizam formulários.
 */
function csrfProtect(req, res, next) {
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
