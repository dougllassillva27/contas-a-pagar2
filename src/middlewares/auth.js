// ==============================================================================
// Middlewares de Autenticação
// ==============================================================================

const repo = require('../repositories/FinanceiroRepository');

// Autenticação para rotas Web (Dashboard, Relatórios)
async function authMiddleware(req, res, next) {
  // LOG AVANÇADO
  console.log(`[AUTH-DEBUG] Acesso solicitado: ${req.path}`);

  // 1. Sessão tradicional ativa? (Ex: Login há menos de 24h)
  if (req.session && req.session.user) {
    return next();
  }

  // 2. Não tem sessão. Verifica parser de cookies
  if (req.cookies === undefined) {
    console.log('[AUTH-DEBUG] ❌ AVISO: req.cookies está undefined. O cookie-parser foi inicializado no app.js?');
  }

  // 3. Tenta recuperar o token persistente do navegador
  const token = req.cookies?.remember_me;
  console.log(`[AUTH-DEBUG] Token "remember_me" no navegador: ${token ? 'Encontrado' : 'Ausente'}`);

  if (token) {
    try {
      console.log('[AUTH-DEBUG] 🔍 Validando token no banco de dados...');
      const user = await repo.buscarUsuarioPorToken(token);

      if (user) {
        console.log(`[AUTH-DEBUG] ✅ Token válido! Sessão restaurada para: ${user.nome}`);
        
        // Reidrata a sessão
        req.session.user = { 
          id: user.id, 
          nome: user.nome, 
          login: user.login 
        };
        
        return next();
      } else {
        console.log('[AUTH-DEBUG] ⚠️ Token expirado ou inválido. Limpando cookie.');
        res.clearCookie('remember_me');
      }
    } catch (error) {
      console.error('[AUTH-DEBUG] ❌ Erro interno ao validar token persistente:', error.message);
    }
  }

  // 4. Bloqueio final: Sem sessão e sem token -> Login
  console.log('[AUTH-DEBUG] 🛑 Acesso negado. Redirecionando para login.');
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
