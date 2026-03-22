// ==============================================================================
// 🔒 Middlewares de Autenticação
// ==============================================================================

/**
 * Protege as rotas web.
 * Se não tiver sessão autenticada, redireciona para /login
 */
function authMiddleware(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  
  // Log de acesso não autorizado (útil para debugging)
  console.log(`[AUTH] Acesso não autorizado: ${req.method} ${req.originalUrl}`);
  
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
    
    if (tokenRecebido && tokenRecebido === API_TOKEN) {
      return next();
    }
    
    // Log de tentativa de acesso à API sem token válido
    console.log(`[API-AUTH] Acesso negado: ${req.method} ${req.originalUrl}`);
    
    return res.status(401).json({ success: false, error: 'Acesso Negado' });
  };
}

module.exports = {
  authMiddleware,
  createApiAuth,
};