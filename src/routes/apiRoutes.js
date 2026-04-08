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

      const [
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
      ] = await Promise.all([
        repo.getDashboardTotals(userId, month, year),
        repo.getLancamentosPorTipo(userId, TIPO.FIXA, month, year),
        repo.getLancamentosPorTipo(userId, TIPO.CARTAO, month, year),
        repo.getAnotacoes(userId, 0, 0), // Global como padrão no carregamento SSR
        repo.getResumoPessoas(userId, month, year, userName),
        repo.getDadosTerceiros(userId, month, year),
        repo.getOrdemCards(userId),
        repo.getFaturaManual(userId, month, year),
        repo.isMesFechado(userId, month, year),
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
        mesFechado,
        safeJs,
      });
    })
  );

  // --- DASHBOARD DE TERCEIROS ---
  router.get(
    '/terceiros',
    asyncHandler(async (req, res) => {
      const userId = req.session.user.id;
      const { month, year, nav } = calcularContextoNavegacao(req.query);

      const [dadosTerceirosRaw, terceirosDistinctRaw, mesFechado] = await Promise.all([
        repo.getDadosTerceiros(userId, month, year),
        repo.getDistinctTerceiros(userId),
        repo.isMesFechado(userId, month, year),
      ]);

      const terceirosMap = montarMapaTerceiros(dadosTerceirosRaw);

      // Mescla todos os terceiros distintos com os dados do mês atual
      const extrairNome = (t) => (typeof t === 'string' ? t : t.nometerceiro || t.NomeTerceiro);
      const todosTerceiros = terceirosDistinctRaw
        .map(extrairNome)
        .filter((nome) => nome && nome.trim() !== '') // Previne erro 500 ignorando contas próprias (null)
        .map((nome) => {
          const dadosMes = terceirosMap[nome];
          return {
            nome,
            totalGeral: dadosMes ? dadosMes.totalGeral : 0,
          };
        });

      // Ordena alfabeticamente
      todosTerceiros.sort((a, b) => a.nome.localeCompare(b.nome));

      res.render('terceiros-dashboard', {
        nav,
        terceiros: todosTerceiros,
        user: req.session.user,
        mesFechado,
        query: req.query,
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
        repo.getDashboardTotals(req.session.user.id, month, year),
        repo.getLancamentosPorTipo(req.session.user.id, TIPO.FIXA, month, year),
        repo.getLancamentosPorTipo(req.session.user.id, TIPO.CARTAO, month, year),
        repo.getResumoPessoas(req.session.user.id, month, year, req.session.user.nome),
        repo.getDadosTerceiros(req.session.user.id, month, year),
      ]);

      const terceirosMap = montarMapaTerceiros(dadosTerceirosRaw);

      res.json({
        ...totais,
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

  // --- APIs GERAIS ---
  router.get(
    '/api/lancamentos/recentes',
    asyncHandler(async (req, res) => {
      res.json(await repo.getUltimosLancamentos(req.session.user.id));
    })
  );

  router.post(
    '/api/meses-fechados/toggle',
    asyncHandler(async (req, res) => {
      const { month, year } = req.body;
      const novoStatus = await repo.toggleMesFechado(req.session.user.id, parseInt(month, 10), parseInt(year, 10));
      res.json({ success: true, mesFechado: novoStatus });
    })
  );

  router.post(
    '/api/anotacoes',
    asyncHandler(async (req, res) => {
      const month = req.body.month !== undefined ? parseInt(req.body.month, 10) : new Date().getMonth() + 1;
      const year = req.body.year !== undefined ? parseInt(req.body.year, 10) : new Date().getFullYear();
      await repo.updateAnotacoes(req.session.user.id, month, year, req.body.conteudo);
      res.json({ success: true });
    })
  );

  router.get(
    '/api/anotacoes',
    asyncHandler(async (req, res) => {
      const month = req.query.month !== undefined ? parseInt(req.query.month, 10) : new Date().getMonth() + 1;
      const year = req.query.year !== undefined ? parseInt(req.query.year, 10) : new Date().getFullYear();
      const item = await repo.getAnotacoes(req.session.user.id, month, year);
      res.json({ conteudo: item ? item.conteudo || item : '' });
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
      res.json(
        await repo.getLancamentosCartaoPorPessoa(
          req.session.user.id,
          req.params.pessoa,
          month,
          year,
          req.session.user.nome
        )
      );
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
      await repo.saveFaturaManual(
        req.session.user.id,
        parseInt(req.body.month, 10),
        parseInt(req.body.year, 10),
        parseValor(req.body.valor)
      );
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
      const currentMonth = parseInt(req.body.month, 10);
      const currentYear = parseInt(req.body.year, 10);

      let nextMonth = currentMonth + 1;
      let nextYear = currentYear;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
      }

      if (await repo.isMesFechado(req.session.user.id, nextMonth, nextYear)) {
        return res.status(403).json({ error: 'O mês de destino está fechado para alterações.' });
      }
      await repo.copyMonth(req.session.user.id, parseInt(req.body.month, 10), parseInt(req.body.year, 10));
      res.json({ success: true });
    })
  );

  router.delete(
    '/api/lancamentos/mes',
    asyncHandler(async (req, res) => {
      const m = parseInt(req.query.month, 10);
      const y = parseInt(req.query.year, 10);
      if (await repo.isMesFechado(req.session.user.id, m, y)) {
        return res.status(403).json({ error: 'Este mês está fechado. Reabra-o para deletar lançamentos.' });
      }
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
      const m = parseInt(req.query.month, 10);
      const y = parseInt(req.query.year, 10);
      if (await repo.isMesFechado(req.session.user.id, m, y)) {
        return res.status(403).json({ error: 'Este mês está fechado. Reabra-o para deletar lançamentos.' });
      }
      await repo.deleteLancamentosPorPessoa(
        req.session.user.id,
        req.params.nome,
        parseInt(req.query.month, 10),
        parseInt(req.query.year, 10),
        req.session.user.nome
      );
      res.json({ success: true });
    })
  );

  router.post(
    '/api/lancamentos/status-pessoa',
    asyncHandler(async (req, res) => {
      await repo.updateStatusBatchPessoa(
        req.session.user.id,
        req.body.pessoa,
        req.body.status,
        req.body.month,
        req.body.year,
        req.session.user.nome
      );
      res.json({ success: true });
    })
  );

  router.post(
    '/api/lancamentos/conferido-recentes',
    asyncHandler(async (req, res) => {
      await repo.updateConferidoBatchRecent(req.session.user.id);
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
   * ✅ SUPORTE A BULK MODE (lançamento em massa para terceiros)
   */
  router.post(
    '/api/lancamentos',
    asyncHandler(async (req, res) => {
      const {
        descricao,
        valor,
        tipo_transacao,
        sub_tipo,
        parcelas,
        nome_terceiro,
        context_month,
        context_year,
        terceiros,
        bulk_mode,
      } = req.body;

      if (await repo.isMesFechado(req.session.user.id, parseInt(context_month, 10), parseInt(context_year, 10))) {
        return res.status(403).json({ error: 'Este mês está fechado para novos lançamentos.' });
      }

      // ✅ MODO BULK: lançamento em massa para múltiplos terceiros
      if (bulk_mode && Array.isArray(terceiros) && terceiros.length > 0) {
        const classificacao = classificarLancamento({ tipo_transacao, sub_tipo, parcelas });
        if (classificacao.erro) {
          return res.status(400).json({ error: classificacao.erro });
        }

        const dataBase = new Date(context_year, context_month - 1, 10);
        const dadosBase = {
          descricao: (descricao || '').trim(),
          valor: parseValor(valor),
          tipo: classificacao.dbTipo,
          categoria: classificacao.dbCategoria,
          status: classificacao.dbStatus,
          parcelaAtual: classificacao.pAtual,
          totalParcelas: classificacao.pTotal,
          dataBase,
        };

        // Filtra terceiros vazios e duplicados
        const terceirosUnicos = [...new Set(terceiros.map((t) => t.trim()).filter((t) => t.length > 0))];

        if (terceirosUnicos.length === 0) {
          return res.status(400).json({ error: 'Nenhum terceiro válido informado.' });
        }

        const resultado = await repo.addLancamentosBulk(req.session.user.id, dadosBase, terceirosUnicos);
        return res.json({ success: true, ...resultado });
      }

      // ✅ MODO NORMAL: lançamento único (backward compatible)
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

  // ✅ NOVA ROTA: Exclusão em lote por array de IDs
  router.delete(
    '/api/lancamentos/lote',
    asyncHandler(async (req, res) => {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Array de IDs inválido ou vazio.' });
      }

      const mesesAnos = await repo.getMesesAnosPorIds(req.session.user.id, ids);
      for (const { mes, ano } of mesesAnos) {
        if (await repo.isMesFechado(req.session.user.id, mes, ano)) {
          return res.status(403).json({ error: 'Um ou mais itens selecionados pertencem a um mês fechado.' });
        }
      }
      const deletedCount = await repo.deleteLancamentosEmLote(req.session.user.id, ids);
      res.json({ success: true, deleted: deletedCount });
    })
  );

  router.delete(
    '/api/lancamentos/:id',
    asyncHandler(async (req, res) => {
      const item = await repo.getLancamento(req.session.user.id, req.params.id);
      if (item) {
        const dt = new Date(item.datavencimento);
        if (await repo.isMesFechado(req.session.user.id, dt.getMonth() + 1, dt.getFullYear())) {
          return res.status(403).json({ error: 'Este lançamento pertence a um mês fechado e não pode ser excluído.' });
        }
      }

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

  router.patch(
    '/api/lancamentos/:id/conferido',
    asyncHandler(async (req, res) => {
      await repo.updateConferido(req.session.user.id, req.params.id, req.body.conferido);
      res.json({ success: true });
    })
  );

  router.patch(
    '/api/lancamentos/:id/conferido-extrato',
    asyncHandler(async (req, res) => {
      await repo.updateConferidoExtrato(req.session.user.id, req.params.id, req.body.conferido);
      res.json({ success: true });
    })
  );

  // ✅ NOVA ROTA: Atualização em lote da flag `conferidoextrato`
  router.post(
    '/api/lancamentos/conferido-extrato-lote',
    asyncHandler(async (req, res) => {
      const { ids, conferido } = req.body;
      const userId = req.session.user.id;

      if (!Array.isArray(ids) || typeof conferido !== 'boolean') {
        return res.status(400).json({ error: 'Payload inválido.' });
      }

      const updatedCount = await repo.updateConferidoExtratoLote(userId, ids, conferido);
      res.json({ success: true, updated: updatedCount });
    })
  );

  return router;
};
