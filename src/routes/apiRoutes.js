// ==============================================================================
// 🛡️ ROTAS PROTEGIDAS (WEB) — Dashboard, CRUD, APIs
// Extraído de app.js — sem alteração de lógica
// ==============================================================================

const express = require('express');
const router = express.Router();
const { parseValor, normalizarParcelasPorTipo } = require('../helpers/parseHelpers');

module.exports = function (repo) {
  // --- SWITCH USUÁRIO ---
  router.get('/switch/:id', async (req, res) => {
    try {
      const targetId = parseInt(req.params.id, 10);
      const user = await repo.getUsuarioById(targetId);
      if (user) req.session.user = { id: user.id, nome: user.nome, login: user.login };
      res.redirect('/');
    } catch (err) {
      res.redirect('/');
    }
  });

  // --- RELATÓRIO (CORRIGIDO) ---
  router.get('/relatorio', async (req, res) => {
    try {
      const userId = req.session.user.id;
      const userName = req.session.user.nome;
      const mes = req.query.month ? parseInt(req.query.month, 10) : new Date().getMonth() + 1;
      const ano = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();

      const dataAtual = new Date(ano, mes - 1, 1);
      const nav = { atual: { month: mes, year: ano, dateObj: dataAtual } };

      const itens = await repo.getRelatorioMensal(userId, mes, ano);
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
        ano: ano,
        titulo: `Relatório - ${nomeMes} ${ano}`,
        totalGeral: itens.reduce((acc, i) => acc + Number(i.valor), 0),
        nav: nav,
      });
    } catch (err) {
      res.status(500).send('Erro ao gerar relatório.');
    }
  });

  // --- DASHBOARD ---
  router.get('/', async (req, res) => {
    try {
      const userId = req.session.user.id;
      const userName = req.session.user.nome;
      let mes = req.query.month ? parseInt(req.query.month, 10) : new Date().getMonth() + 1;
      let ano = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();

      const dataAtual = new Date(ano, mes - 1, 1);
      const dataAnterior = new Date(ano, mes - 2, 1);
      const dataProxima = new Date(ano, mes, 1);

      const nav = {
        atual: { month: mes, year: ano, dateObj: dataAtual },
        ant: { month: dataAnterior.getMonth() + 1, year: dataAnterior.getFullYear() },
        prox: { month: dataProxima.getMonth() + 1, year: dataProxima.getFullYear() },
      };

      const [totais, fixas, cartao, anotacoes, resumoPessoas, dadosTerceirosRaw, ordemCardsRaw, faturaManualVal] = await Promise.all([repo.getDashboardTotals(userId, mes, ano), repo.getLancamentosPorTipo(userId, 'FIXA', mes, ano), repo.getLancamentosPorTipo(userId, 'CARTAO', mes, ano), repo.getAnotacoes(userId), repo.getResumoPessoas(userId, mes, ano, userName), repo.getDadosTerceiros(userId, mes, ano), repo.getOrdemCards(userId), repo.getFaturaManual(userId, mes, ano)]);

      const terceirosMap = {};
      dadosTerceirosRaw.forEach((item) => {
        const nome = item.nometerceiro;
        if (!terceirosMap[nome]) {
          terceirosMap[nome] = {
            nome: nome,
            totalCartao: 0,
            itensCartao: [],
            itensFixas: [],
            totalFixas: 0,
            totalGeral: 0,
          };
        }

        if (item.status === 'PENDENTE') {
          const val = Number(item.valor);
          terceirosMap[nome].totalGeral += val;
          if (item.tipo === 'CARTAO') terceirosMap[nome].totalCartao += val;
          else if (item.tipo === 'FIXA') terceirosMap[nome].totalFixas += val;
        }

        if (item.tipo === 'FIXA') terceirosMap[nome].itensFixas.push(item);
        else terceirosMap[nome].itensCartao.push(item);
      });

      const ordemMap = {};
      if (ordemCardsRaw) {
        ordemCardsRaw.forEach((o) => {
          ordemMap[o.nome] = o.ordem;
        });
      }

      const listaTerceiros = Object.values(terceirosMap).sort((a, b) => {
        const ordA = ordemMap[a.nome] ?? 9999;
        const ordB = ordemMap[b.nome] ?? 9999;
        return ordA - ordB || a.nome.localeCompare(b.nome);
      });

      res.render('index', {
        totais,
        fixas,
        cartao,
        anotacoes,
        resumoPessoas,
        nav,
        terceiros: listaTerceiros,
        query: req.query,
        user: req.session.user,
        faturaManual: faturaManualVal,
      });
    } catch (err) {
      console.error('Erro dashboard:', err);
      res.status(500).send('Erro ao carregar dashboard.');
    }
  });

  // --- APIs GERAIS ---
  router.get('/api/lancamentos/recentes', async (req, res) => {
    try {
      res.json(await repo.getUltimosLancamentos(req.session.user.id));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/api/anotacoes', async (req, res) => {
    try {
      await repo.updateAnotacoes(req.session.user.id, req.body.conteudo);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/api/rendas', async (req, res) => {
    try {
      const m = req.query.month || new Date().getMonth() + 1;
      const y = req.query.year || new Date().getFullYear();
      res.json(await repo.getDetalhesRendas(req.session.user.id, m, y));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/api/cartao/:pessoa', async (req, res) => {
    try {
      const m = req.query.month || new Date().getMonth() + 1;
      const y = req.query.year || new Date().getFullYear();
      res.json(await repo.getLancamentosCartaoPorPessoa(req.session.user.id, req.params.pessoa, m, y, req.session.user.nome));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/api/backup', async (req, res) => {
    try {
      const data = await repo.getAllDataForBackup(req.session.user.id);
      const fileName = `backup_${req.session.user.login}_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.send(JSON.stringify(data, null, 2));
    } catch (err) {
      res.status(500).send('Erro no backup');
    }
  });

  router.post('/api/fatura-manual', async (req, res) => {
    try {
      await repo.saveFaturaManual(req.session.user.id, parseInt(req.body.month, 10), parseInt(req.body.year, 10), parseValor(req.body.valor));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/api/cards/reorder', async (req, res) => {
    try {
      await repo.saveOrdemCards(req.session.user.id, req.body.nomes);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/api/lancamentos/copiar', async (req, res) => {
    try {
      await repo.copyMonth(req.session.user.id, parseInt(req.body.month, 10), parseInt(req.body.year, 10));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/api/lancamentos/mes', async (req, res) => {
    try {
      await repo.deleteMonth(req.session.user.id, parseInt(req.query.month, 10), parseInt(req.query.year, 10));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ================================================================================
  // 🆕 AÇÕES EM LOTE PARA TERCEIROS (LONG PRESS MENU)
  // ================================================================================

  router.put('/api/terceiros/:nome/marcar-todas-pagas', async (req, res) => {
    try {
      const nomeTerceiro = decodeURIComponent(req.params.nome);
      const mes = req.query.month || new Date().getMonth() + 1;
      const ano = req.query.year || new Date().getFullYear();

      await repo.updateStatusBatchPessoa(req.session.user.id, nomeTerceiro, 'PAGO', parseInt(mes, 10), parseInt(ano, 10), req.session.user.nome);

      res.json({ success: true, message: `Todas as contas de ${nomeTerceiro} marcadas como pagas` });
    } catch (err) {
      console.error('Erro ao marcar todas como pagas:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/api/terceiros/:nome/marcar-todas-pendentes', async (req, res) => {
    try {
      const nomeTerceiro = decodeURIComponent(req.params.nome);
      const mes = req.query.month || new Date().getMonth() + 1;
      const ano = req.query.year || new Date().getFullYear();

      await repo.updateStatusBatchPessoa(req.session.user.id, nomeTerceiro, 'PENDENTE', parseInt(mes, 10), parseInt(ano, 10), req.session.user.nome);

      res.json({ success: true, message: `Todas as contas de ${nomeTerceiro} marcadas como pendentes` });
    } catch (err) {
      console.error('Erro ao marcar todas como pendentes:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/api/terceiros/:nome', async (req, res) => {
    try {
      const nomeTerceiro = decodeURIComponent(req.params.nome);
      const mes = req.query.month || new Date().getMonth() + 1;
      const ano = req.query.year || new Date().getFullYear();

      await repo.deleteLancamentosPorPessoa(req.session.user.id, nomeTerceiro, parseInt(mes, 10), parseInt(ano, 10), req.session.user.nome);

      res.json({ success: true, message: `Todas as contas de ${nomeTerceiro} foram excluídas` });
    } catch (err) {
      console.error('Erro ao excluir contas de terceiro:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ROTA LEGADA (manter compatibilidade)
  router.delete('/api/lancamentos/pessoa/:nome', async (req, res) => {
    try {
      await repo.deleteLancamentosPorPessoa(req.session.user.id, req.params.nome, parseInt(req.query.month, 10), parseInt(req.query.year, 10), req.session.user.nome);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/api/lancamentos/status-pessoa', async (req, res) => {
    try {
      await repo.updateStatusBatchPessoa(req.session.user.id, req.body.pessoa, req.body.status, req.body.month, req.body.year, req.session.user.nome);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/api/lancamentos/reorder', async (req, res) => {
    try {
      await repo.reorderLancamentos(req.session.user.id, req.body.itens);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==============================================================================
  // CRUD UNITÁRIO (WEB)
  // ==============================================================================

  /**
   * Criação de lançamentos via web.
   * Melhorias aplicadas:
   * - Quando sub_tipo === 'Parcelada', valida formato e conteúdo de parcelas
   * - Mantém compatibilidade com o comportamento anterior ("1/10")
   */
  router.post('/api/lancamentos', async (req, res) => {
    try {
      const { descricao, valor, tipo_transacao, sub_tipo, parcelas, nome_terceiro, context_month, context_year } = req.body;

      let dbTipo = sub_tipo === 'Fixa' ? 'FIXA' : 'CARTAO';
      let dbStatus = 'PENDENTE';
      let pAtual = null;
      let pTotal = null;
      let dbCategoria = null;

      if (tipo_transacao === 'RENDA') {
        dbTipo = 'RENDA';
        dbStatus = 'PAGO';
        dbCategoria = sub_tipo;
      } else if (sub_tipo === 'Parcelada') {
        const parcelasNorm = normalizarParcelasPorTipo({
          isParcelada: true,
          parcelasRaw: parcelas,
        });

        if (parcelasNorm.erro) {
          return res.status(400).json({ error: parcelasNorm.erro });
        }

        pAtual = parcelasNorm.parcelaAtual;
        pTotal = parcelasNorm.totalParcelas;
      }

      const dataBase = new Date(context_year, context_month - 1, 10);

      await repo.addLancamento(req.session.user.id, {
        descricao: (descricao || '').trim(),
        valor: parseValor(valor),
        tipo: dbTipo,
        categoria: dbCategoria,
        status: dbStatus,
        parcelaAtual: pAtual,
        totalParcelas: pTotal,
        nomeTerceiro: nome_terceiro || null,
        dataBase,
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Atualização de lançamentos via web.
   * Mesma validação de parcelas do POST.
   */
  router.put('/api/lancamentos/:id', async (req, res) => {
    try {
      const { descricao, valor, tipo_transacao, sub_tipo, parcelas, nome_terceiro } = req.body;

      let pAtual = null;
      let pTotal = null;
      let dbTipo = sub_tipo === 'Fixa' ? 'FIXA' : 'CARTAO';
      let dbCategoria = null;

      if (tipo_transacao === 'RENDA') {
        dbTipo = 'RENDA';
        dbCategoria = sub_tipo;
      } else if (sub_tipo === 'Parcelada') {
        const parcelasNorm = normalizarParcelasPorTipo({
          isParcelada: true,
          parcelasRaw: parcelas,
        });

        if (parcelasNorm.erro) {
          return res.status(400).json({ error: parcelasNorm.erro });
        }

        pAtual = parcelasNorm.parcelaAtual;
        pTotal = parcelasNorm.totalParcelas;
      }

      await repo.updateLancamento(req.session.user.id, req.params.id, {
        descricao,
        valor: parseValor(valor),
        tipo: dbTipo,
        categoria: dbCategoria,
        parcelaAtual: pAtual,
        totalParcelas: pTotal,
        nomeTerceiro: nome_terceiro || null,
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/api/lancamentos/:id', async (req, res) => {
    try {
      await repo.deleteLancamento(req.session.user.id, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.patch('/api/lancamentos/:id/status', async (req, res) => {
    try {
      await repo.updateStatus(req.session.user.id, req.params.id, req.body.status);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
