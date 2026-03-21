// ==============================================================================
// 🔐 Rotas de Autenticação Persistente
// ==============================================================================

const express = require('express');
const router = express.Router();
const TokenRepository = require('../repositories/TokenRepository');
const asyncHandler = require('../helpers/asyncHandler');

module.exports = function(repo) {
  
  // ==============================================================================
  // POST /api/auth/token — Gera token persistente (login com "Lembrar de mim")
  // ==============================================================================
  router.post('/api/auth/token', asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório' });
    }

    // Revoga tokens antigos do usuário (um token ativo por dispositivo)
    const queryRevoke = `
      UPDATE TokensPersistentes
      SET Revogado = true
      WHERE UsuarioId = $1
    `;
    await repo.query(queryRevoke, [userId]);

    // Cria novo token
    const tokenData = await TokenRepository.criarToken(userId, 90);

    res.json({
      success: true,
      token: tokenData.Token,
      expiresAt: tokenData.ExpiresAt,
    });
  }));

  // ==============================================================================
  // DELETE /api/auth/token — Revoga token (logout)
  // ==============================================================================
  router.delete('/api/auth/token', asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'token é obrigatório' });
    }

    await TokenRepository.revogarToken(token);

    res.json({ success: true });
  }));

  // ==============================================================================
  // POST /api/auth/validate — Valida token persistente
  // ==============================================================================
  router.post('/api/auth/validate', asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'token é obrigatório' });
    }

    const userToken = await TokenRepository.validarToken(token);

    if (!userToken) {
      return res.status(401).json({ valid: false, error: 'Token inválido ou expirado' });
    }

    // Renova token automaticamente (estende por mais 90 dias)
    await TokenRepository.renovarToken(token, 90);

    res.json({
      valid: true,
      user: {
        id: userToken.Id,
        nome: userToken.Nome,
        login: userToken.Login,
      },
    });
  }));

  // ==============================================================================
  // GET /api/auth/me — Retorna usuário da sessão atual
  // ==============================================================================
  router.get('/api/auth/me', asyncHandler(async (req, res) => {
    if (req.session && req.session.user) {
      res.json({
        id: req.session.user.id,
        nome: req.session.user.nome,
        login: req.session.user.login,
      });
    } else {
      res.status(401).json({ error: 'Não autenticado' });
    }
  }));

  return router;
};