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
 * Middleware de persistência de login (Lembrar de mim).
 * Restaura a sessão do usuário se houver um token válido no cookie.
 */
function createPersistAuthMiddleware(repo) {
  return async (req, res, next) => {
    // Se já estiver autenticado na sessão, apenas prossegue
    if (req.session && req.session.user) {
      return next();
    }

    const token = req.cookies?.remember_me;

    if (token) {
      try {
        const tokenData = await repo.validarToken(token);
        
        if (tokenData) {
          // Restaura a sessão
          req.session.user = { 
            id: tokenData.id, 
            nome: tokenData.nome, 
            login: tokenData.login 
          };
          
          console.log(`[PERSIST-AUTH] ✅ Sessão restaurada para: ${tokenData.nome}`);
          
          // Opcional: renovar o token para mais 90 dias
          const novoToken = await repo.renovarToken(token, 90);
          if (novoToken) {
            res.cookie('remember_me', novoToken.token, {
              maxAge: 90 * 24 * 60 * 60 * 1000,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax'
            });
          }
        } else {
          // Token inválido ou expirado, limpa o cookie
          console.log(`[PERSIST-AUTH] ⚠️ Token inválido/expirado detectado. Limpando cookie.`);
          res.clearCookie('remember_me');
        }
      } catch (err) {
        console.error(`[PERSIST-AUTH] ❌ Erro ao validar token: ${err.message}`);
      }
    }

    next();
  };
}

/**
 * Autenticação simples para API via header:
 * x-api-key: <API_TOKEN>
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
  createPersistAuthMiddleware,
  createApiAuth,
};