// ==============================================================================
// 💰 LANÇAMENTOS
// ==============================================================================

const express = require('express');
const router = express.Router();
const { parseValor } = require('../../helpers/parseHelpers');
const syncService = require('../../services/syncService');
const asyncHandler = require('../../helpers/asyncHandler');
const cache = require('../../helpers/cacheHelpers');
const { classificarLancamento } = require('./classificacaoHelpers');

module.exports = function (repo) {
  // --- LISTAGENS ---
  router.get(
    '/api/lancamentos/recentes',
    asyncHandler(async (req, res) => {
      res.json(await repo.getUltimosLancamentos(req.session.user.id));
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

  // --- OPERAÇÕES EM LOTE ---
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
      await repo.copyMonth(req.session.user.id, currentMonth, currentYear);

      // ✅ Sincronização dinâmica em BACKGROUND (não bloqueia resposta)
      const { executarSincronizacaoDinamica } = require('../../services/syncService');
      setImmediate(async () => {
        try {
          const config = typeof repo.getConfiguracoes === 'function'
            ? await repo.getConfiguracoes(req.session.user.id)
            : null;
          if (config && config.regras_sync && config.regras_sync.length > 0) {
            await executarSincronizacaoDinamica(repo, req.session.user.id, nextMonth, nextYear, config.regras_sync);
          }
        } catch (err) {
          console.error('[POST Copiar] Erro na sincronização em background:', err.message);
        }
      });

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
      const month = parseInt(req.body.month, 10);
      const year = parseInt(req.body.year, 10);

      if (!month || !year || month < 1 || month > 12) {
        return res.status(400).json({ error: 'Mês e ano inválidos.' });
      }

      await repo.updateStatusBatchPessoa(
        req.session.user.id,
        req.body.pessoa,
        req.body.status,
        month,
        year,
        req.session.user.nome
      );
      cache.invalidate(`dashboard:totais:${req.session.user.id}:`);
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

  // --- CRUD UNITÁRIO ---

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

        // ✅ Sincronização Dinâmica fire-and-forget via setImmediate
        setImmediate(async () => {
          try {
            const configBulk = typeof repo.getConfiguracoes === 'function'
              ? await repo.getConfiguracoes(req.session.user.id)
              : null;
            if (configBulk && configBulk.regras_sync && configBulk.regras_sync.length > 0) {
              await syncService.executarSincronizacaoDinamica(
                repo, req.session.user.id,
                Number(context_month), Number(context_year),
                configBulk.regras_sync
              );
            }
          } catch (syncErr) {
            console.error('[POST Bulk] Erro na sincronização dinâmica pós-gravação:', syncErr.message);
          }
        });

        return res.json({ success: true, ...resultado });
      }

      // ✅ MODO NORMAL: lançamento único (backward compatible)
      const classificacao = classificarLancamento({ tipo_transacao, sub_tipo, parcelas });
      if (classificacao.erro) {
        return res.status(400).json({ error: classificacao.erro });
      }

      const dataBase = new Date(context_year, context_month - 1, 10);

      // 🛡️ FALLBACK DEFENSIVO BACKEND: Garante que vírgulas sempre virem lote
      if (nome_terceiro && typeof nome_terceiro === 'string' && nome_terceiro.includes(',')) {
        const terceirosArr = nome_terceiro
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
        if (terceirosArr.length > 1) {
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
          const terceirosUnicos = [...new Set(terceirosArr)];
          const resultado = await repo.addLancamentosBulk(req.session.user.id, dadosBase, terceirosUnicos);
          // ✅ Sincronização dinâmica fire-and-forget (fallback vírgulas)
          setImmediate(async () => {
            try {
              const configFallback = typeof repo.getConfiguracoes === 'function'
                ? await repo.getConfiguracoes(req.session.user.id)
                : null;
              if (configFallback && configFallback.regras_sync && configFallback.regras_sync.length > 0) {
                await syncService.executarSincronizacaoDinamica(
                  repo, req.session.user.id,
                  Number(context_month), Number(context_year),
                  configFallback.regras_sync
                );
              }
            } catch (syncErr) {
              console.error('[POST Fallback] Erro na sincronização dinâmica:', syncErr.message);
            }
          });
          return res.json({ success: true, ...resultado });
        }
      }

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

      // ✅ Sincronização dinâmica fire-and-forget (modo normal)
      setImmediate(async () => {
        try {
          const configNormal = typeof repo.getConfiguracoes === 'function'
            ? await repo.getConfiguracoes(req.session.user.id)
            : null;
          if (configNormal && configNormal.regras_sync && configNormal.regras_sync.length > 0) {
            await syncService.executarSincronizacaoDinamica(
              repo, req.session.user.id,
              Number(context_month), Number(context_year),
              configNormal.regras_sync
            );
          }
        } catch (syncErr) {
          console.error('[POST Normal] Erro na sincronização dinâmica:', syncErr.message);
        }
      });

      // Invalida cache do dashboard após criação
      if (typeof repo.invalidateDashboardCache === 'function') {
        repo.invalidateDashboardCache(req.session.user.id, context_month, context_year);
      }

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

      // Invalida cache do dashboard após atualização
      const item = await repo.getLancamento(req.session.user.id, req.params.id);
      if (item && typeof repo.invalidateDashboardCache === 'function') {
        const dt = new Date(item.datavencimento);
        repo.invalidateDashboardCache(req.session.user.id, dt.getMonth() + 1, dt.getFullYear());
      }

      res.json({ success: true });
    })
  );

  // ✅ Exclusão em lote por array de IDs
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
      cache.invalidate(`dashboard:totais:${req.session.user.id}:`);
      res.json({ success: true, deleted: deletedCount });
    })
  );

  // ✅ Deslocamento de mês em lote
  router.post(
    '/api/lancamentos/mover-mes',
    asyncHandler(async (req, res) => {
      const { ids, direcao } = req.body;
      const offset = parseInt(direcao, 10);
      const userId = req.session.user.id;

      if (!Array.isArray(ids) || ids.length === 0 || ![-1, 1].includes(offset)) {
        return res.status(400).json({ error: 'Payload inválido.' });
      }

      // Validação de Trava de Mês: Verifica Origem e Destino
      const mesesAnos = await repo.getMesesAnosPorIds(userId, ids);
      for (const { mes, ano } of mesesAnos) {
        if (await repo.isMesFechado(userId, mes, ano)) {
          return res.status(403).json({ error: 'Origem bloqueada. Um ou mais itens pertencem a um mês fechado.' });
        }
        let targetMes = Number(mes) + offset;
        let targetAno = Number(ano);
        if (targetMes > 12) {
          targetMes = 1;
          targetAno++;
        } else if (targetMes < 1) {
          targetMes = 12;
          targetAno--;
        }

        if (await repo.isMesFechado(userId, targetMes, targetAno)) {
          return res.status(403).json({ error: 'Destino bloqueado. O mês alvo está fechado para um ou mais itens.' });
        }
      }

      const updatedCount = await repo.moverLancamentosMes(userId, ids, offset);
      cache.invalidate(`dashboard:totais:${userId}:`);
      res.json({ success: true, updated: updatedCount });
    })
  );

  // ✅ Divisão de Conta
  router.post(
    '/api/lancamentos/dividir',
    asyncHandler(async (req, res) => {
      const { idOriginal, terceiros } = req.body;
      const userId = req.session.user.id;

      if (!idOriginal || !Array.isArray(terceiros)) {
        return res.status(400).json({ error: 'Payload inválido. Informe idOriginal e array de terceiros.' });
      }

      try {
        const resultado = await repo.dividirConta(userId, idOriginal, terceiros);
        res.json(resultado);
      } catch (err) {
        const msg = err.message;
        if (msg === 'CONTA_NAO_ENCONTRADA') {
          return res.status(404).json({ error: 'Conta não encontrada ou não pertence ao usuário.' });
        }
        if (msg === 'NENHUM_TERCEIRO_VALIDO') {
          return res.status(400).json({ error: 'Informe pelo menos um terceiro válido para divisão.' });
        }
        if (msg === 'LIMITE_TERCEIROS_EXCEDIDO') {
          return res.status(400).json({ error: 'Limite de 20 terceiros por divisão excedido.' });
        }
        if (msg === 'VALOR_INVALIDO') {
          return res.status(400).json({ error: 'Valor da conta deve ser maior que zero para divisão.' });
        }
        if (msg === 'CONTA_MODIFICADA_CONCORRENTE') {
          return res.status(409).json({ error: 'Conta foi modificada por outro processo. Tente novamente.' });
        }
        throw err;
      }
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

      // Invalida cache do dashboard após deleção
      const dt = new Date(item.datavencimento);
      if (typeof repo.invalidateDashboardCache === 'function') {
        repo.invalidateDashboardCache(req.session.user.id, dt.getMonth() + 1, dt.getFullYear());
      }

      res.json({ success: true });
    })
  );

  router.patch(
    '/api/lancamentos/:id/status',
    asyncHandler(async (req, res) => {
      await repo.updateStatus(req.session.user.id, req.params.id, req.body.status);
      // Invalida cache de totais do dashboard para forçar dados frescos
      cache.invalidate(`dashboard:totais:${req.session.user.id}:`);
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

  // ✅ Atualização em lote da flag `conferidoextrato`
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
