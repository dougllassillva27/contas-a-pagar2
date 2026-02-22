// ==============================================================================
// 🔒 Middlewares de Autenticação
// Extraído de app.js — sem alteração de lógica
// ==============================================================================

/**
 * Protege as rotas web.
 * Se não tiver sessão autenticada, redireciona para /login
 */
function authMiddleware(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login');
}

/**
 * Autenticação simples para API via header:
 * x-api-key: <API_TOKEN>
 *
 * Segurança:
 * - Não é o ideal para sistemas críticos, mas é OK para integração pessoal.
 * - Garanta que o token seja forte no .env
 */
function createApiAuth(API_TOKEN) {
  return (req, res, next) => {
    const tokenRecebido = req.headers['x-api-key'];
    if (tokenRecebido && tokenRecebido === API_TOKEN) return next();
    return res.status(401).json({ success: false, error: 'Acesso Negado' });
  };
}

module.exports = {
  authMiddleware,
  createApiAuth,
};
