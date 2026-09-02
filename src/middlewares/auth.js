// ==============================================================================
// Middlewares de Autenticação
// ==============================================================================

const repo = require('../repositories/FinanceiroRepository');
const UsuarioRepository = require('../repositories/UsuarioRepository');

// Autenticação para rotas Web (Dashboard, Relatórios)
async function authMiddleware(req, res, next) {
  // 1. Sessão tradicional ativa? (Ex: Login há menos de 24h)
  if (req.session && req.session.user) {
    // Valida passwordVersion da sessão vs banco (Feature: Alterar Senha)
    try {
      const passwordVersionAtual = await UsuarioRepository.obterPasswordVersion(req.session.user.id);
      const sessionPasswordVersion = req.session.user.passwordVersion ?? 0;
      console.log(`[AUTH] Validando passwordVersion - Sessão: ${sessionPasswordVersion}, Banco: ${passwordVersionAtual}, User ID: ${req.session.user.id}`);

      if (sessionPasswordVersion !== passwordVersionAtual) {
        console.log(`[AUTH] passwordVersion divergente - destruindo sessão`);
        // Senha foi alterada - destruir sessão e limpar tokens persistentes
        await UsuarioRepository.limparTokensPersistentes(req.session.user.id);
        req.session.destroy((err) => {
          if (err) console.error('[AUTH] Erro ao destruir sessão:', err);
        });
        return res.status(401).json({ error: 'Sessão expirada - senha alterada' });
      }
    } catch (error) {
      console.error('[AUTH] Erro ao validar passwordVersion:', error.message);
    }
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
      const user = await repo.validarToken(token);

      if (user) {
        // Reidrata a sessão (incluindo passwordVersion)
        req.session.user = {
          id: user.id || user.Id,
          nome: user.nome || user.Nome,
          login: user.login || user.Login,
          passwordVersion: user.passwordversion || 0,
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
    const clientToken = req.headers['x-api-key'];

    if (!clientToken || clientToken !== API_TOKEN) {
      console.log(`[API-AUTH] Bloqueado. Token fornecido: ${clientToken ? 'Sim' : 'Não'}`);
      return res.status(401).json({ success: false, error: 'Acesso Negado' });
    }

    next();
  };
}

// Autenticação Híbrida (API Token OU Sessão Web)
// Usada para proteger rotas que podem ser acessadas via navegador ou via M2M (ex: /dataHora)
function createAuthHybrid(API_TOKEN) {
  return function authHybrid(req, res, next) {
    const clientToken = req.headers['x-api-key'];
    if (clientToken && clientToken === API_TOKEN) {
      return next(); // M2M Autenticado
    }
    // Fallback transparente para Sessão Web
    return authMiddleware(req, res, next);
  };
}

module.exports = { authMiddleware, createApiAuth, createAuthHybrid };
