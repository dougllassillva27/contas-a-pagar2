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

  // ============================================================================
  // GET /contas/:nome — Portal público de terceiros
  // Permite que terceiros visualizem suas contas sem login
  // ============================================================================
  router.get('/contas/:nome', async (req, res) => {
    try {
      const nome = decodeURIComponent(req.params.nome);
      const month = req.query.month ? parseInt(req.query.month, 10) : new Date().getMonth() + 1;
      const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();

      // Navegação mensal
      const dataAtual = new Date(year, month - 1, 1);
      const dataAnterior = new Date(year, month - 2, 1);
      const dataProxima = new Date(year, month, 1);

      const nav = {
        atual: { month, year, dateObj: dataAtual },
        ant: { month: dataAnterior.getMonth() + 1, year: dataAnterior.getFullYear() },
        prox: { month: dataProxima.getMonth() + 1, year: dataProxima.getFullYear() },
      };

      // Busca lançamentos do terceiro
      const lancamentos = await repo.getLancamentosTerceiro(nome, month, year);

      // Agrupa por tipo
      const itensFixas = lancamentos.filter(i => i.tipo === 'FIXA');
      const itensCartao = lancamentos.filter(i => i.tipo === 'CARTAO');

      // Calcula totais (todos os itens, independente de status)
      const totalFixas = itensFixas.reduce((acc, i) => acc + Number(i.valor), 0);
      const totalCartao = itensCartao.reduce((acc, i) => acc + Number(i.valor), 0);
      const totalGeral = totalFixas + totalCartao;

      res.render('terceiro', {
        nome,
        nav,
        itensFixas,
        itensCartao,
        totalFixas,
        totalCartao,
        totalGeral,
        temDados: lancamentos.length > 0,
      });
    } catch (err) {
      console.error(`[PORTAL TERCEIRO] Erro ao buscar contas de ${req.params.nome}:`, err.message);
      res.status(500).render('terceiro', {
        nome: req.params.nome,
        nav: { atual: { month: new Date().getMonth() + 1, year: new Date().getFullYear(), dateObj: new Date() }, ant: { month: new Date().getMonth() || 12, year: new Date().getFullYear() }, prox: { month: new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2, year: new Date().getFullYear() } },
        itensFixas: [],
        itensCartao: [],
        totalFixas: 0,
        totalCartao: 0,
        totalGeral: 0,
        temDados: false,
      });
    }
  });

  return router;
};