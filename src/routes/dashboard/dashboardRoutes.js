const express = require('express');
const router = express.Router();
const { calcularContextoNavegacao } = require('./navigationHelpers');
const { montarMapaTerceiros, ordenarTerceiros } = require('../terceiros/terceirosHelpers');
const asyncHandler = require('../../helpers/asyncHandler');

module.exports = function (repo) {
  // --- RELATÓRIO ---
  router.get(
    '/relatorio',
    asyncHandler(async (req, res) => {
      const userId = req.session.user.id;
      const userName = req.session.user.nome;
      const month = req.query.month ? parseInt(req.query.month, 10) : new Date().getMonth() + 1;
      const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();

      const dataAtual = new Date(year, month - 1, 1);
      const nav = { atual: { month, year, dateObj: dataAtual } };

      const itens = await repo.getRelatorioMensal(userId, month, year);
      const agrupado = {};
      agrupado[userName] = { itens: [], total: 0 };

      itens.forEach((item) => {
        const pessoa = item.nometerceiro || userName;
        if (!agrupado[pessoa]) agrupado[pessoa] = { itens: [], total: 0 };
        agrupado[pessoa].itens.push(item);
        agrupado[pessoa].total += Number(item.valor);
      });

      let nomeMes = dataAtual.toLocaleString('pt-BR', { month: 'long' });
      nomeMes = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

      res.render('relatorio', {
        dados: agrupado,
        mes: nomeMes,
        ano: year,
        titulo: `Gestão Financeira - Relatório - ${nomeMes} ${year}`,
        totalGeral: itens.reduce((acc, i) => acc + Number(i.valor), 0),
        nav,
      });
    })
  );

  // --- DASHBOARD ---
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const userId = req.session.user.id;
      const userName = req.session.user.nome;
      const { month, year, nav } = calcularContextoNavegacao(req.query);

      // 1. Lê as configurações e executa sincronização dinâmica (se houver regras)
      let configuracoes = null;
      if (typeof repo.getConfiguracoes === 'function') {
        try {
          configuracoes = await repo.getConfiguracoes(userId);
        } catch (err) {
          console.error('[Dashboard] Falha ao ler configuracoes do banco:', err);
        }
      }

      // ✅ EXECUTA SINCRONIZAÇÃO ANTES DE RENDERIZAR (F5 automático)
      // Garante que os dados estejam atualizados ao carregar o dashboard
      if (configuracoes && configuracoes.regras_sync && configuracoes.regras_sync.length > 0) {
        try {
          const syncService = require('../../services/syncService.js');
          await syncService.executarSincronizacaoDinamica(
            repo, userId, Number(month), Number(year), configuracoes.regras_sync
          );
          console.log(`[Dashboard GET] Sincronização dinâmica executada para usuário ${userId}`);
        } catch (syncErr) {
          console.error('[Dashboard GET] Erro na sincronização dinâmica:', syncErr.message);
          // Não bloqueia renderização se sync falhar
        }
      }

      // 3. Busca em lote os dados consolidados do dashboard usando abordagem modular
      const startTime = Date.now();
      const {
        totais,
        fixas,
        cartao,
        anotacoes,
        resumoPessoas,
        dadosTerceirosRaw,
        ordemCardsRaw,
        faturaManualVal,
        mesFechado,
        terceirosDistinct,
      } = await repo.getDashboardDataModular(userId, Number(month), Number(year), userName);
      const elapsed = Date.now() - startTime;
      console.log(`[Dashboard GET] Dados carregados em ${elapsed}ms via getDashboardDataModular`);

      const terceirosMap = montarMapaTerceiros(dadosTerceirosRaw);
      const listaTerceiros = ordenarTerceiros(terceirosMap, ordemCardsRaw);
      const totalCasa = terceirosMap['Casa'] ? terceirosMap['Casa'].totalCartao : 0;

      // ✅ FIX: Garante que configuracoes nunca seja nulo para evitar Erro 500 em novos usuários
      const configuracoesValidas = configuracoes || {
        divisao_casa_minimo: '750.00',
        regras_sync: [],
        onboarding_completed: false
      };

      res.render('index', {
        totais,
        fixas,
        cartao,
        anotacoes,
        resumoPessoas,
        nav,
        terceiros: listaTerceiros,
        totalCasa,
        terceirosDistinct,
        query: req.query,
        user: req.session.user,
        faturaManual: faturaManualVal,
        mesFechado,
        safeJs: require('../lancamentos/classificacaoHelpers').safeJs,
        currentPath: req.path,
        configuracoes: configuracoesValidas,
        titulo: 'Gestão Financeira - Home',
      });
    })
  );

  // --- TOTAIS (para atualização parcial sem reload) ---
  router.get(
    '/api/dashboard/totals',
    asyncHandler(async (req, res) => {
      const month = req.query.month ? parseInt(req.query.month, 10) : new Date().getMonth() + 1;
      const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();

      const [totais, fixas, cartao, resumoPessoas, dadosTerceirosRaw] = await Promise.all([
        repo.getDashboardTotals(req.session.user.id, Number(month), Number(year)),
        repo.getLancamentosPorTipo(req.session.user.id, 'FIXA', Number(month), Number(year)),
        repo.getLancamentosPorTipo(req.session.user.id, 'CARTAO', Number(month), Number(year)),
        repo.getResumoPessoas(req.session.user.id, Number(month), Number(year), req.session.user.nome),
        repo.getDadosTerceiros(req.session.user.id, Number(month), Number(year)),
      ]);

      const terceirosMap = montarMapaTerceiros(dadosTerceirosRaw);
      const totalCasa = terceirosMap['Casa'] ? terceirosMap['Casa'].totalCartao : 0;

      res.json({
        ...totais,
        totalCasa,
        fixasPendente: fixas.filter((i) => i.status === 'PENDENTE').reduce((acc, i) => acc + Number(i.valor), 0),
        cartaoPendente: cartao.filter((i) => i.status === 'PENDENTE').reduce((acc, i) => acc + Number(i.valor), 0),
        cartaoGeral: resumoPessoas.reduce((acc, i) => acc + Number(i.valor), 0),
        resumoPessoas: resumoPessoas.map((p) => ({ pessoa: p.pessoa, total: p.total })),
        terceiros: Object.values(terceirosMap).map((t) => ({
          nome: t.nome,
          totalGeral: t.totalGeral,
          totalCartao: t.totalCartao,
          totalFixas: t.totalFixas,
        })),
      });
    })
  );

  return router;
};
