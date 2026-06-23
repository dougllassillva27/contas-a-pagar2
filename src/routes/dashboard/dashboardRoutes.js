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

      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [🔍 DEBUG-GET] >>> INICIANDO GET / para userId=${userId}, time=${Date.now()}`);
      console.log(`[${timestamp}] [🔍 DEBUG-GET] Headers: ${JSON.stringify(req.headers)}`);
      console.log(`[${timestamp}] [🔍 DEBUG-GET] Query params: ${JSON.stringify(req.query)}`);
      console.log(`[${timestamp}] [🔍 DEBUG-GET] Session ID: ${req.sessionID}`);

      // 1. Lê as configurações
      let configuracoes = null;
      if (typeof repo.getConfiguracoes === 'function') {
        try {
          console.log(`[🔍 DEBUG-GET] Lendo configuracoes...`);
          configuracoes = await repo.getConfiguracoes(userId);
          console.log(`[🔍 DEBUG-GET] Configuracoes lidas com sucesso`);
        } catch (err) {
          console.error('[Dashboard] Falha ao ler configuracoes do banco:', err);
        }
      }

      // 2. Busca dados do dashboard
      const startTime = Date.now();
      console.log(`[${new Date().toISOString()}] [🔍 DEBUG-GET] Chamando getDashboardDataModular em ${startTime}...`);
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
      console.log(`[${new Date().toISOString()}] [🔍 DEBUG-GET] getDashboardDataModular concluído em ${elapsed}ms`);
      console.log(`[${new Date().toISOString()}] [🔍 DEBUG-GET] Total queries executadas: 9 sequenciais`);

      const terceirosMap = montarMapaTerceiros(dadosTerceirosRaw.rows || dadosTerceirosRaw);
      const listaTerceiros = ordenarTerceiros(terceirosMap, ordemCardsRaw);
      const totalCasa = terceirosMap['Casa'] ? terceirosMap['Casa'].totalCartao : 0;

      // FIX: Garante que configuracoes nunca seja nulo
      const configuracoesValidas = configuracoes || {
        divisao_casa_minimo: '750.00',
        regras_sync: [],
        onboarding_completed: false
      };

      const renderStart = Date.now();
      console.log(`[🔍 DEBUG-GET] Iniciando render em ${renderStart}...`);
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
      const renderEnd = Date.now();
      console.log(`[${new Date().toISOString()}] [🔍 DEBUG-GET] <<< GET / COMPLETADO para userId=${userId}, tempo total=${Date.now() - startTime}ms, render=${renderEnd - renderStart}ms`);
    })
  );

  // --- TOTAIS (para atualização parcial sem reload) ---
  router.get(
    '/api/dashboard/totals',
    asyncHandler(async (req, res) => {
      const month = req.query.month ? parseInt(req.query.month, 10) : new Date().getMonth() + 1;
      const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();

       const [totais, fixas, cartao, resumoPessoas, { rows: dadosTerceirosRaw }] = await Promise.all([
       repo.getDashboardTotals(req.session.user.id, Number(month), Number(year)),
        repo.getLancamentosPorTipo(req.session.user.id, 'FIXA', Number(month), Number(year)),
       repo.getLancamentosPorTipo(req.session.user.id, 'CARTAO', Number(month), Number(year)),
        repo.getResumoPessoas(req.session.user.id, Number(month), Number(year), req.session.user.nome),
       repo.getDadosTerceiros(req.session.user.id, Number(month), Number(year), 500),
     ]);

      console.log(`[🔍 DEBUG-TERCEIROS-API] dadosTerceirosRaw length:`, Array.isArray(dadosTerceirosRaw) ? dadosTerceirosRaw.length : 'N/A');
      if (Array.isArray(dadosTerceirosRaw)) {
        console.log(`[🔍 DEBUG-TERCEIROS-API] Primeiros 3 itens:`, JSON.stringify(dadosTerceirosRaw.slice(0, 3).map(i => ({ nome: i.nometerceiro, status: i.status }))));
      }
      const terceirosMap = montarMapaTerceiros(dadosTerceirosRaw.rows || dadosTerceirosRaw);
      const totalCasa = terceirosMap['Casa'] ? terceirosMap['Casa'].totalCartao : 0;

      res.json({
        ...totais,
        totalCasa,
        fixasPendente: fixas.filter((i) => i.status === 'PENDENTE').reduce((acc, i) => acc + Number(i.valor), 0),
        cartaoPendente: cartao.filter((i) => i.status === 'PENDENTE').reduce((acc, i) => acc + Number(i.valor), 0),
        cartaoGeral: resumoPessoas.reduce((acc, i) => acc + Number(i.total), 0),
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
