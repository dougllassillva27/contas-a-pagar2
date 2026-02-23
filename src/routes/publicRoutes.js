// ==============================================================================
// 🌐 ROTAS PÚBLICAS (LOGIN)
// Extraído de app.js — sem alteração de lógica
// ==============================================================================

const express = require('express');
const router = express.Router();
const { LIMITES } = require('../constants');

module.exports = function (repo, SENHA_MESTRA) {
  router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('login', { error: null });
  });

  router.post('/login', async (req, res) => {
    const passwordDigitada = (req.body.password || '').trim();

    if (passwordDigitada === SENHA_MESTRA) {
      try {
        const user = await repo.getUsuarioById(1);
        if (user) {
          req.session.user = { id: user.id, nome: user.nome, login: user.login };
          return res.redirect('/');
        }
      } catch (err) {
        return res.render('login', { error: 'Erro de conexão.' });
      }
    }

    // pequeno delay para dificultar brute force básico
    setTimeout(() => {
      res.render('login', { error: 'Senha incorreta!' });
    }, LIMITES.BRUTE_FORCE_DELAY_MS);
  });

  router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
  });

  return router;
};
