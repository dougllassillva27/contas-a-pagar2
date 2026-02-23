// ==============================================================================
// 🛡️ ROTAS PROTEGIDAS (WEB) — Dashboard, CRUD, APIs
// ==============================================================================

const express = require('express');
const router = express.Router();
const { parseValor, normalizarParcelasPorTipo } = require('../helpers/parseHelpers');
const asyncHandler = require('../helpers/asyncHandler');
const { STATUS, TIPO, LIMITES } = require('../constants');

// ==============================================================================
// Helpers internos (extraídos para manter as rotas curtas e legíveis)
// ==============================================================================

/**
 * Calcula o contexto de navegação mensal (mês atual, anterior e próximo).
 * Usado pelo dashboard e relatório para montar os links de navegação.
 */
function calcularContextoNavegacao(query) {
  const month = query.month ? parseInt(query.month, 10) : new Date().getMonth() + 1;
  const year = query.year ? parseInt(query.year, 10) : new Date().getFullYear();

  const dataAtual = new Date(year, month - 1, 1);
  const dataAnterior = new Date(year, month - 2, 1);
  const dataProxima = new Date(year, month, 1);

  return {
    month,
    year,
    nav: {
      atual: { month, year, dateObj: dataAtual },
      ant: { month: dataAnterior.getMonth() + 1, year: dataAnterior.getFullYear() },
      prox: { month: dataProxima.getMonth() + 1, year: dataProxima.getFullYear() },
    },
  };
}

/**
 * Monta o mapa de terceiros (agrupando por nome) a partir dos lançamentos brutos.
 * Cada terceiro tem seus itens de cartão e fixas, e os totais de pendentes.
 */
function montarMapaTerceiros(dadosTerceirosRaw) {
  const terceirosMap = {};

  dadosTerceirosRaw.forEach((item) => {
    const nome = item.nometerceiro;
    if (!terceirosMap[nome]) {
      terceirosMap[nome] = {
        nome,
        totalCartao: 0,
        itensCartao: [],
        itensFixas: [],
        totalFixas: 0,
        totalGeral: 0,
      };
    }

    if (item.status === STATUS.PENDENTE) {
      const val = Number(item.valor);
      terceirosMap[nome].totalGeral += val;
      if (item.tipo === TIPO.CARTAO) terceirosMap[nome].totalCartao += val;
      else if (item.tipo === TIPO.FIXA) terceirosMap[nome].totalFixas += val;
    }

    if (item.tipo === TIPO.FIXA) terceirosMap[nome].itensFixas.push(item);
    else terceirosMap[nome].itensCartao.push(item);
  });

  return terceirosMap;
}

/**
 * Ordena a lista de terceiros pela ordem salva pelo usuário (drag & drop).
 * Terceiros sem ordem definida vão para o final, ordenados alfabeticamente.
 */
function ordenarTerceiros(terceirosMap, ordemCardsRaw) {
  const ordemMap = {};
  if (ordemCardsRaw) {
    ordemCardsRaw.forEach((o) => {
      ordemMap[o.nome] = o.ordem;
    });
  }

  return Object.values(terceirosMap).sort((a, b) => {
    const ordA = ordemMap[a.nome] ?? LIMITES.ORDEM_DEFAULT;
    const ordB = ordemMap[b.nome] ?? LIMITES.ORDEM_DEFAULT;
    return ordA - ordB || a.nome.localeCompare(b.nome);
  });
}

/**
 * Classifica o tipo de lançamento a partir dos dados do formulário.
 * Centraliza a lógica usada tanto no POST (criar) quanto no PUT (editar).
 *
 * @returns {{ dbTipo, dbCategoria, pAtual, pTotal, dbStatus, erro? }}
 */
function classificarLancamento({ tipo_transacao, sub_tipo, parcelas }) {
  let dbTipo = sub_tipo === 'Fixa' ? TIPO.FIXA : TIPO.CARTAO;
  let dbStatus = STATUS.PENDENTE;
  let pAtual = null;
  let pTotal = null;
  let dbCategoria = null;

  if (tipo_transacao === TIPO.RENDA) {
    dbTipo = TIPO.RENDA;
    dbStatus = STATUS.PAGO;
    dbCategoria = sub_tipo;
  } else if (sub_tipo === 'Parcelada') {
    const parcelasNorm = normalizarParcelasPorTipo({
      isParcelada: true,
      parcelasRaw: parcelas,
    });

    if (parcelasNorm.erro) {
      return { erro: parcelasNorm.erro };
    }

    pAtual = parcelasNorm.parcelaAtual;
    pTotal = parcelasNorm.totalParcelas;
  }

  return { dbTipo, dbCategoria, dbStatus, pAtual, pTotal };
}

// Helper para escapar strings em contextos JavaScript (previne XSS em onclick)
const safeJs = (str) =>
  String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");

// ==============================================================================
// Montagem das rotas
// ==============================================================================

module.exports = function (repo) {
  // --- SWITCH USUÁRIO ---
  router.get(
    '/switch/:id',
    asyncHandler(async (req, res) => {
      const targetId = parseInt(req.params.id, 10);
      const user = await repo.getUsuarioById(targetId);
      if (user) req.session.user = { id: user.id, nome: user.nome, login: user.login };
      res.redirect('/');
    })
  );

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
        titulo: `Relatório - ${nomeMes} ${year}`,
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

      const [totais, fixas, cartao, anotacoes, resumoPessoas, dadosTerceirosRaw, ordemCardsRaw, faturaManualVal, terceirosDistinct] = await Promise.all([
        repo.getDashboardTotals(userId, month, year),
        repo.getLancamentosPorTipo(userId, TIPO.FIXA, month, year),
        repo.getLancamentosPorTipo(userId, TIPO.CARTAO, month, year),
        repo.getAnotacoes(userId),
        repo.getResumoPessoas(userId, month, year, userName),
        repo.getDadosTerceiros(userId, month, year),
        repo.getOrdemCards(userId),
        repo.getFaturaManual(userId, month, year),
        repo.getDistinctTerceiros(userId),
      ]);

      const terceirosMap = montarMapaTerceiros(dadosTerceirosRaw);
      const listaTerceiros = ordenarTerceiros(terceirosMap, ordemCardsRaw);

      res.render('index', {
        totais,
        fixas,
        cartao,
        anotacoes,
        resumoPessoas,
        nav,
        terceiros: listaTerceiros,
        terceirosDistinct,
        query: req.query,
        user: req.session.user,
        faturaManual: faturaManualVal,
        safeJs,
      });
    })
  );

  // --- TOTAIS (para atualização parcial sem reload) ---
  router.get(
    '/api/dashboard/totals',
    asyncHandler(async (req, res) => {
      const month = req.query.month ? parseInt(req.query.month, 10) : new Date().getMonth() + 1;
      const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
      const totais = await repo.getDashboardTotals(req.session.user.id, month, year);
      res.json(totais);
    })
  );

  // --- APIs GERAIS ---
  router.get(
    '/api/lancamentos/recentes',
    asyncHandler(async (req, res) => {
      res.json(await repo.getUltimosLancamentos(req.session.user.id));
    })
  );

  router.post(
    '/api/anotacoes',
    asyncHandler(async (req, res) => {
      await repo.updateAnotacoes(req.session.user.id, req.body.conteudo);
      res.json({ success: true });
    })
  );

  router.get(
    '/api/rendas',
    asyncHandler(async (req, res) => {
      const month = req.query.month || new Date().getMonth() + 1;
      const year = req.query.year || new Date().getFullYear();
      res.json(await repo.getDetalhesRendas(req.session.user.id, month, year));
    })
  );

  router.get(
    '/api/cartao/:pessoa',
    asyncHandler(async (req, res) => {
      const month = req.query.month || new Date().getMonth() + 1;
      const year = req.query.year || new Date().getFullYear();
      res.json(await repo.getLancamentosCartaoPorPessoa(req.session.user.id, req.params.pessoa, month, year, req.session.user.nome));
    })
  );

  router.get(
    '/api/backup',
    asyncHandler(async (req, res) => {
      const data = await repo.getAllDataForBackup(req.session.user.id);
      const fileName = `backup_${req.session.user.login}_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.send(JSON.stringify(data, null, 2));
    })
  );

  router.post(
    '/api/fatura-manual',
    asyncHandler(async (req, res) => {
      await repo.saveFaturaManual(req.session.user.id, parseInt(req.body.month, 10), parseInt(req.body.year, 10), parseValor(req.body.valor));
      res.json({ success: true });
    })
  );

  router.post(
    '/api/cards/reorder',
    asyncHandler(async (req, res) => {
      await repo.saveOrdemCards(req.session.user.id, req.body.nomes);
      res.json({ success: true });
    })
  );

  router.post(
    '/api/lancamentos/copiar',
    asyncHandler(async (req, res) => {
      await repo.copyMonth(req.session.user.id, parseInt(req.body.month, 10), parseInt(req.body.year, 10));
      res.json({ success: true });
    })
  );

  router.delete(
    '/api/lancamentos/mes',
    asyncHandler(async (req, res) => {
      await repo.deleteMonth(req.session.user.id, parseInt(req.query.month, 10), parseInt(req.query.year, 10));
      res.json({ success: true });
    })
  );

  // ================================================================================
  // AÇÕES EM LOTE PARA TERCEIROS
  // ================================================================================

  router.delete(
    '/api/lancamentos/pessoa/:nome',
    asyncHandler(async (req, res) => {
      await repo.deleteLancamentosPorPessoa(req.session.user.id, req.params.nome, parseInt(req.query.month, 10), parseInt(req.query.year, 10), req.session.user.nome);
      res.json({ success: true });
    })
  );

  router.post(
    '/api/lancamentos/status-pessoa',
    asyncHandler(async (req, res) => {
      await repo.updateStatusBatchPessoa(req.session.user.id, req.body.pessoa, req.body.status, req.body.month, req.body.year, req.session.user.nome);
      res.json({ success: true });
    })
  );

  router.post(
    '/api/lancamentos/reorder',
    asyncHandler(async (req, res) => {
      await repo.reorderLancamentos(req.session.user.id, req.body.itens);
      res.json({ success: true });
    })
  );

  // ==============================================================================
  // CRUD UNITÁRIO (WEB)
  // ==============================================================================

  /**
   * Criação de lançamentos via web.
   * Usa classificarLancamento() para normalizar tipo/parcelas.
   */
  router.post(
    '/api/lancamentos',
    asyncHandler(async (req, res) => {
      const { descricao, valor, tipo_transacao, sub_tipo, parcelas, nome_terceiro, context_month, context_year } = req.body;

      const classificacao = classificarLancamento({ tipo_transacao, sub_tipo, parcelas });
      if (classificacao.erro) {
        return res.status(400).json({ error: classificacao.erro });
      }

      const dataBase = new Date(context_year, context_month - 1, 10);

      await repo.addLancamento(req.session.user.id, {
        descricao: (descricao || '').trim(),
        valor: parseValor(valor),
        tipo: classificacao.dbTipo,
        categoria: classificacao.dbCategoria,
        status: classificacao.dbStatus,
        parcelaAtual: classificacao.pAtual,
        totalParcelas: classificacao.pTotal,
        nomeTerceiro: nome_terceiro || null,
        dataBase,
      });

      res.json({ success: true });
    })
  );

  /**
   * Atualização de lançamentos via web.
   * Reutiliza classificarLancamento() — mesma lógica do POST.
   */
  router.put(
    '/api/lancamentos/:id',
    asyncHandler(async (req, res) => {
      const { descricao, valor, tipo_transacao, sub_tipo, parcelas, nome_terceiro } = req.body;

      const classificacao = classificarLancamento({ tipo_transacao, sub_tipo, parcelas });
      if (classificacao.erro) {
        return res.status(400).json({ error: classificacao.erro });
      }

      await repo.updateLancamento(req.session.user.id, req.params.id, {
        descricao,
        valor: parseValor(valor),
        tipo: classificacao.dbTipo,
        categoria: classificacao.dbCategoria,
        parcelaAtual: classificacao.pAtual,
        totalParcelas: classificacao.pTotal,
        nomeTerceiro: nome_terceiro || null,
      });

      res.json({ success: true });
    })
  );

  router.delete(
    '/api/lancamentos/:id',
    asyncHandler(async (req, res) => {
      await repo.deleteLancamento(req.session.user.id, req.params.id);
      res.json({ success: true });
    })
  );

  router.patch(
    '/api/lancamentos/:id/status',
    asyncHandler(async (req, res) => {
      await repo.updateStatus(req.session.user.id, req.params.id, req.body.status);
      res.json({ success: true });
    })
  );

  return router;
};
