// ==============================================================================
// 🌐 ROTAS PÚBLICAS (LOGIN)
// Com logs avançados para debug em produção
// ==============================================================================

const express = require('express');
const router = express.Router();
const { LIMITES } = require('../constants');

module.exports = function (repo, SENHA_MESTRA) {
  
  // ============================================================================
  // GET /login — Renderiza página de login
  // ============================================================================
  router.get('/login', (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [LOGIN] GET /login - Session: ${req.session.user ? 'AUTHENTICATED' : 'GUEST'}`);
    
    if (req.session.user) {
      console.log(`[${timestamp}] [LOGIN] Redirecting authenticated user to dashboard`);
      return res.redirect('/');
    }
    
    res.render('login', { error: null });
  });

  // ============================================================================
  // POST /login — Processa autenticação
  // ============================================================================
  router.post('/login', async (req, res) => {
    const timestamp = new Date().toISOString();
    const passwordDigitada = (req.body.password || '').trim();
    const lembrarDeMim = req.body.lembrar === 'on' || req.body.lembrar === 'true';
    
    // Log avançado (sem mostrar senha)
    console.log(`[${timestamp}] [LOGIN] POST /login - Attempt`);
    console.log(`[${timestamp}] [LOGIN] Password length: ${passwordDigitada.length}`);
    console.log(`[${timestamp}] [LOGIN] Remember me: ${lembrarDeMim}`);
    console.log(`[${timestamp}] [LOGIN] Session ID: ${req.sessionID || 'N/A'}`);
    console.log(`[${timestamp}] [LOGIN] IP: ${req.ip || req.connection.remoteAddress || 'N/A'}`);
    console.log(`[${timestamp}] [LOGIN] User-Agent: ${req.get('user-agent') || 'N/A'}`);
    
    // Verifica senha mestra
    if (passwordDigitada === SENHA_MESTRA) {
      try {
        console.log(`[${timestamp}] [LOGIN] Password validated, fetching user from DB...`);
        
        const user = await repo.getUsuarioById(1);
        
        if (user) {
          console.log(`[${timestamp}] [LOGIN] User found: ${user.nome} (ID: ${user.id})`);
          
          // Cria sessão
          req.session.user = { 
            id: user.id, 
            nome: user.nome, 
            login: user.login 
          };
          
          console.log(`[${timestamp}] [LOGIN] Session created successfully`);
          console.log(`[${timestamp}] [LOGIN] Session data: ${JSON.stringify(req.session.user)}`);
          
          // Log de sucesso
          console.log(`[${timestamp}] [LOGIN] ✅ LOGIN SUCCESS - User: ${user.nome}`);
          
          // Redireciona para dashboard
          return res.redirect('/');
        } else {
          console.error(`[${timestamp}] [LOGIN] ❌ User not found in database`);
        }
      } catch (err) {
        console.error(`[${timestamp}] [LOGIN] ❌ DATABASE ERROR: ${err.message}`);
        console.error(`[${timestamp}] [LOGIN] Stack: ${err.stack}`);
        return res.render('login', { error: 'Erro de conexão com o banco.' });
      }
    } else {
      console.warn(`[${timestamp}] [LOGIN] ❌ INVALID PASSWORD - Length: ${passwordDigitada.length}`);
    }
    
    // Delay para brute-force
    setTimeout(() => {
      console.log(`[${timestamp}] [LOGIN] Returning error page after delay`);
      res.render('login', { error: 'Senha incorreta!' });
    }, LIMITES.BRUTE_FORCE_DELAY_MS);
  });

  // ============================================================================
  // GET /logout — Encerra sessão
  // ============================================================================
  router.get('/logout', (req, res) => {
    const timestamp = new Date().toISOString();
    const userName = req.session.user?.nome || 'Unknown';
    
    console.log(`[${timestamp}] [LOGOUT] User: ${userName}`);
    
    req.session.destroy((err) => {
      if (err) {
        console.error(`[${timestamp}] [LOGOUT] Error destroying session: ${err.message}`);
      } else {
        console.log(`[${timestamp}] [LOGOUT] Session destroyed successfully`);
      }
      res.redirect('/login');
    });
  });

  return router;
};