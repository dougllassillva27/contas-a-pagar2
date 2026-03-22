// ==============================================================================
// 🔒 Middlewares de Autenticação
// Com logs avançados para debug
// ==============================================================================

/**
 * Protege as rotas web.
 * Se não tiver sessão autenticada, redireciona para /login
 */
function authMiddleware(req, res, next) {
  const timestamp = new Date().toISOString();
  const path = req.originalUrl;
  
  if (req.session && req.session.user) {
    console.log(`[${timestamp}] [AUTH] ✅ Authorized: ${req.session.user.nome} - ${path}`);
    return next();
  }
  
  console.warn(`[${timestamp}] [AUTH] ⚠️ Unauthorized - Redirecting to login - ${path}`);
  res.redirect('/login');
}

/**
 * Autenticação simples para API via header:
 * x-api-key: <API_TOKEN>
 */
function createApiAuth(API_TOKEN) {
  return (req, res, next) => {
    const timestamp = new Date().toISOString();
    const tokenRecebido = req.headers['x-api-key'];
    const path = req.originalUrl;
    
    if (tokenRecebido && tokenRecebido === API_TOKEN) {
      console.log(`[${timestamp}] [API-AUTH] ✅ API Token valid - ${path}`);
      return next();
    }
    
    console.warn(`[${timestamp}] [API-AUTH] ❌ API Token invalid/missing - ${path}`);
    return res.status(401).json({ success: false, error: 'Acesso Negado' });
  };
}

module.exports = {
  authMiddleware,
  createApiAuth,
};