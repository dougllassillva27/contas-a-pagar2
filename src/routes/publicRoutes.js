// ==============================================================================
// 🌐 ROTAS PÚBLICAS (LOGIN + PÁGINAS PÚBLICAS)
// Extraído de app.js — sem alteração de lógica
// ==============================================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { LIMITES } = require('../constants');

module.exports = function (repo) {
  // ============================================================================
  // GET /login — Renderiza página de login
  // ============================================================================
  router.get('/login', (req, res) => {
    // Se já estiver autenticado via sessão ou persistência, redireciona
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
    const lembrar = req.body.lembrar === 'on';

    // ✅ LOG SEGURO: Não loga a senha, apenas o evento de tentativa
    console.log(`[LOGIN] Tentativa de login - IP: ${req.ip || req.connection.remoteAddress || 'N/A'}`);

    let userLogado = null;
    try {
      const dodo = await repo.obterUsuarioPorLogin('dodo');
      const vitoria = await repo.obterUsuarioPorLogin('vitoria');

      // Valida usando bcrypt contra o hash seguro do banco
      if (dodo && dodo.senhahash && (await bcrypt.compare(passwordDigitada, dodo.senhahash))) {
        userLogado = dodo;
      } else if (vitoria && vitoria.senhahash && (await bcrypt.compare(passwordDigitada, vitoria.senhahash))) {
        userLogado = vitoria;
      }

      if (userLogado) {
        req.session.user = { id: userLogado.id, nome: userLogado.nome, login: userLogado.login };

        console.log(`[LOGIN] ✅ Sucesso - Usuário: ${userLogado.nome} (Lembrar: ${lembrar})`);

        // ✅ PERSISTÊNCIA: Gera o token se solicitado
        if (lembrar) {
          try {
            const novoToken = await repo.criarToken(userLogado.id, 90);
            const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 dias

            res.cookie('remember_me', novoToken.token, {
              maxAge,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
            });

            console.log(`[LOGIN] 🔑 Token persistente gerado para usuário ${userLogado.id}`);
          } catch (errToken) {
            console.error(`[LOGIN] ❌ Erro ao gerar token: ${errToken.message}`);
          }
        }

        return res.redirect('/');
      }
    } catch (err) {
      console.error(`[LOGIN] ❌ Erro de banco de dados: ${err.message}`);
      return res.render('login', { error: 'Erro de conexão.' });
    }

    // ✅ LOG SEGURO: Loga falha sem expor a senha tentada
    console.log('[LOGIN] ❌ Falha - Senha incorreta');

    // Pequeno delay para dificultar brute force básico
    setTimeout(() => {
      res.render('login', { error: 'Senha incorreta!' });
    }, LIMITES.BRUTE_FORCE_DELAY_MS);
  });

  // ============================================================================
  // GET /logout — Encerra sessão
  // ============================================================================
  router.get('/logout', async (req, res) => {
    const userName = req.session.user?.nome || 'Desconhecido';
    const token = req.cookies?.remember_me;

    console.log(`[LOGOUT] Usuário: ${userName}`);

    try {
      if (token) {
        await repo.revogarToken(token);
        res.clearCookie('remember_me');
        console.log('[LOGOUT] 🔑 Token persistente revogado');
      }
    } catch (err) {
      console.error(`[LOGOUT] ❌ Erro ao revogar token persistente: ${err.message}`);
    }

    req.session.destroy();
    res.redirect('/login');
  });

  // ============================================================================
  // GET /docs/Lajeado.md — Página pública estilizada
  // Mantém a URL desejada, mas renderiza HTML bonito em vez do markdown cru
  // ============================================================================
  router.get('/docs/Lajeado.md', (req, res) => {
    return res.render('lajeado');
  });

  // ============================================================================
  // GET /contas/:nome — Portal público de terceiros
  // Permite que terceiros visualizem suas contas sem login
  // ============================================================================
  router.get('/contas/:userId/:nome', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      const nome = decodeURIComponent(req.params.nome);
      const month = req.query.month ? parseInt(req.query.month, 10) : new Date().getMonth() + 1;
      const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();

      // Navegação mensal
      const dataAtual = new Date(year, month - 1, 1);
      const dataAnterior = new Date(year, month - 2, 1);
      const dataProxima = new Date(year, month, 1);

      const nav = {
        atual: { month, year, dateObj: dataAtual },
        ant: {
          month: dataAnterior.getMonth() + 1,
          year: dataAnterior.getFullYear(),
        },
        prox: {
          month: dataProxima.getMonth() + 1,
          year: dataProxima.getFullYear(),
        },
      };

      // Busca lançamentos do terceiro filtrando por usuário
      const lancamentos = await repo.getLancamentosTerceiro(userId, nome, month, year);

      // Agrupa por tipo
      const itensFixas = lancamentos.filter((i) => i.tipo === 'FIXA');
      const itensCartao = lancamentos.filter((i) => i.tipo === 'CARTAO');

      // Calcula totais (todos os itens, independente de status)
      const totalFixas = itensFixas.reduce((acc, i) => acc + Number(i.valor), 0);
      const totalCartao = itensCartao.reduce((acc, i) => acc + Number(i.valor), 0);
      const totalGeral = totalFixas + totalCartao;

      res.render('terceiro', {
        userId,
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
        nav: {
          atual: {
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            dateObj: new Date(),
          },
          ant: {
            month: new Date().getMonth() || 12,
            year: new Date().getFullYear(),
          },
          prox: {
            month: new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2,
            year: new Date().getFullYear(),
          },
        },
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
