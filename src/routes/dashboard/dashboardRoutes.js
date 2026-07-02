const express = require('express');
const router = express.Router();
const { calcularContextoNavegacao } = require('./navigationHelpers');
const { montarMapaTerceiros, ordenarTerceiros } = require('../terceiros/terceirosHelpers');
const asyncHandler = require('../../helpers/asyncHandler');

const resumoCache = require('../../helpers/resumoCache');

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

      const isProd = process.env.NODE_ENV === 'production';

      // Logs de performance apenas em dev
      if (!isProd) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [🔍 DEBUG-GET] >>> INICIANDO GET / para userId=${userId}, time=${Date.now()}`);
        console.log(`[${timestamp}] [🔍 DEBUG-GET] Query params: ${JSON.stringify(req.query)}`);
      }

      // 1. Lê as configurações
      let configuracoes = null;
      if (typeof repo.getConfiguracoes === 'function') {
        try {
          configuracoes = await repo.getConfiguracoes(userId);
        } catch (err) {
          console.error('[Dashboard] Falha ao ler configuracoes do banco:', err);
        }
      }

      // 2. Busca dados do dashboard
      const startTime = Date.now();
      if (!isProd) {
        console.log(`[${new Date().toISOString()}] [🔍 DEBUG-GET] Chamando getDashboardDataModular...`);
      }
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

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[🔍 DEBUG-MES-FECHADO] mesFechado=${mesFechado}, userId=${userId}, month=${month}, year=${year}`);
      }

      const terceirosMap = montarMapaTerceiros(dadosTerceirosRaw.rows || dadosTerceirosRaw, userName);
      const listaTerceiros = ordenarTerceiros(terceirosMap, ordemCardsRaw);
      const totalCasa = terceirosMap['Casa'] ? terceirosMap['Casa'].totalGeral : 0;

      // FIX: Garante que configuracoes nunca seja nulo
      const configuracoesValidas = configuracoes || {
        divisao_casa_minimo: '750.00',
        regras_sync: [],
        onboarding_completed: false
      };

      const renderStart = Date.now();

      // ✅ Sincronização automática ao carregar dashboard (background) — apenas se mês tem dados
      const temDados = fixas.length > 0 || cartao.length > 0 || (dadosTerceirosRaw && dadosTerceirosRaw.rows && dadosTerceirosRaw.rows.length > 0);

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[SYNC-CHECK] userId=${userId}, temDados=${temDados}, regras=${configuracoesValidas?.regras_sync?.length || 0}`);
        console.log(`[SYNC-CHECK] fixas.length=${fixas.length}, cartao.length=${cartao.length}, terceirosRows=${dadosTerceirosRaw?.rows?.length || 0}`);
      }

      if (temDados && configuracoesValidas && configuracoesValidas.regras_sync && configuracoesValidas.regras_sync.length > 0) {
        setImmediate(async () => {
          try {
            // [SYNC] log removido
            const { executarSincronizacaoDinamica } = require('../../services/syncService');
            await executarSincronizacaoDinamica(repo, userId, month, year, configuracoesValidas.regras_sync);
            // [SYNC] log removido
          } catch (err) {
            console.error('[Dashboard] Erro na sincronização automática:', err.message);
          }
        });
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[SYNC-CHECK] ⏸️ Sync não executado: temDados=${temDados}, config=${!!configuracoesValidas}, regras=${!!(configuracoesValidas?.regras_sync)}, total=${configuracoesValidas?.regras_sync?.length}`);
        }
      }

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

      // Log crítico: render lento (>500ms)
      const renderTime = renderEnd - renderStart;
      if (!isProd) {
        console.log(`[${new Date().toISOString()}] [🔍 DEBUG-GET] <<< GET / COMPLETADO em ${Date.now() - startTime}ms (render=${renderTime}ms)`);
      }
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

      const userName = req.session.user.nome || 'Eu';
      const terceirosMap = montarMapaTerceiros(dadosTerceirosRaw.rows || dadosTerceirosRaw, userName);
      const totalCasa = terceirosMap['Casa'] ? terceirosMap['Casa'].totalGeral : 0;

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

  // ✅ Endpoint JSON parcial para softRefresh rápido
  router.get(
    '/api/dashboard/resumo',
    asyncHandler(async (req, res) => {
      console.log('[DEBUG BACKEND] /api/dashboard/resumo chamado');
      const userId = req.session.user.id;
      const month = parseInt(req.query.month) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const cacheKey = `${userId}-${month}-${year}`;

      console.log(`[DEBUG BACKEND] userId=${userId}, month=${month}, year=${year}, cacheKey=${cacheKey}`);

      const cached = resumoCache.get(userId, month, year);
      if (cached) {
        console.log('[DEBUG BACKEND] Cache HIT - retornando cache');
        return res.json(cached);
      }

      console.log('[DEBUG BACKEND] Cache MISS - chamando getDashboardDataModular');

      const { getDashboardDataModular } = repo;
      const startTime = Date.now();
      const data = await getDashboardDataModular(userId, month, year);
      const elapsed = Date.now() - startTime;
      console.log(`[DEBUG BACKEND] getDashboardDataModular executou em ${elapsed}ms`);

      const response = {
        success: true,
        data: {
          totais: data.totais,
          lancamentosFixaECartao: { rows: [...(data.fixas || []), ...(data.cartao || [])] },
          resumoPessoas: data.resumoPessoas,
          dadosTerceiros: data.dadosTerceiros,
          auxQueries: data.auxQueries,
          terceirosDistinct: data.terceirosDistinct
        }
      };

      resumoCache.set(response, userId, month, year);

      console.log('[DEBUG BACKEND] Response enviado com', data.fixas?.length + data.cartao?.length || 0, 'rows');
      res.json(response);
    })
  );

  return router;
};
