// ==============================================================================
// 🌐 ROTAS PÚBLICAS (LOGIN)
// Extraído de app.js — sem alteração de lógica
// ==============================================================================

const express = require('express');
const router = express.Router();
const { LIMITES } = require('../constants');

module.exports = function (repo, SENHA_MESTRA) {
  
  // ============================================================================
  // GET /login — Renderiza página de login
  // ============================================================================
  router.get('/login', (req, res) => {
    // Se já estiver autenticado, redireciona para dashboard
    if (req.session.user) {
      return res.redirect('/');
    }
    res.render('login', { error: null });
  });

  // ============================================================================
  // POST /login — Processa autenticação
  // ============================================================================
  router.post('/login', async (req, res) => {
    const passwordDigitada = (req.body.password || '').trim();

    // ✅ LOG SEGURO: Não loga a senha, apenas o evento de tentativa
    console.log(`[LOGIN] Tentativa de login - IP: ${req.ip || req.connection.remoteAddress || 'N/A'}`);

    if (passwordDigitada === SENHA_MESTRA) {
      try {
        const user = await repo.getUsuarioById(1);
        if (user) {
          req.session.user = { id: user.id, nome: user.nome, login: user.login };
          
          // ✅ LOG SEGURO: Confirma sucesso sem expor dados sensíveis
          console.log(`[LOGIN] ✅ Sucesso - Usuário: ${user.nome}`);
          
          return res.redirect('/');
        }
      } catch (err) {
        // ✅ LOG SEGURO: Loga erro sem expor stack trace completo
        console.error(`[LOGIN] ❌ Erro de banco de dados: ${err.message}`);
        return res.render('login', { error: 'Erro de conexão.' });
      }
    }

    // ✅ LOG SEGURO: Loga falha sem expor a senha tentada
    console.log(`[LOGIN] ❌ Falha - Senha incorreta`);

    // Pequeno delay para dificultar brute force básico
    setTimeout(() => {
      res.render('login', { error: 'Senha incorreta!' });
    }, LIMITES.BRUTE_FORCE_DELAY_MS);
  });

  // ============================================================================
  // GET /logout — Encerra sessão
  // ============================================================================
  router.get('/logout', (req, res) => {
    const userName = req.session.user?.nome || 'Desconhecido';
    console.log(`[LOGOUT] Usuário: ${userName}`);
    
    req.session.destroy();
    res.redirect('/login');
  });

  return router;
};