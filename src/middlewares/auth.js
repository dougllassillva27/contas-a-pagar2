// ==============================================================================
// Middlewares de Autenticação
// ==============================================================================

const repo = require('../repositories/FinanceiroRepository');

// Autenticação para rotas Web (Dashboard, Relatórios)
async function authMiddleware(req, res, next) {
  // 1. Sessão tradicional ativa? (Ex: Login há menos de 24h)
  if (req.session && req.session.user) {
    return next();
  }

  // 2. Não tem sessão. Verifica parser de cookies
  if (req.cookies === undefined) {
    console.error('[AUTH] ❌ AVISO: req.cookies está undefined. O cookie-parser falhou.');
  }

  // 3. Tenta recuperar o token persistente do navegador
  const token = req.cookies?.remember_me;

  if (token) {
    try {
      const user = await repo.buscarUsuarioPorToken(token);

      if (user) {
        // Reidrata a sessão
        req.session.user = { 
          id: user.id, 
          nome: user.nome, 
          login: user.login 
        };
        
        return next();
      } else {
        res.clearCookie('remember_me');
      }
    } catch (error) {
      console.error('[AUTH] ❌ Erro interno ao validar token persistente:', error.message);
    }
  }

  // 4. Bloqueio final: Sem sessão e sem token -> Login
  return res.redirect('/login');
}

// Autenticação para a API de Integração (App Android / Bot)
function createApiAuth(API_TOKEN) {
  return function apiAuth(req, res, next) {
    const clientToken = req.headers['x-api-key'] || req.query.token;
    
    if (!clientToken || clientToken !== API_TOKEN) {
      console.log(`[API-AUTH] Bloqueado. Token fornecido: ${clientToken ? 'Sim' : 'Não'}`);
      return res.status(401).json({ success: false, error: 'Acesso Negado' });
    }
    
    next();
  };
}

module.exports = { authMiddleware, createApiAuth };
