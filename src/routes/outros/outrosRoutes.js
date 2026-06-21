// ==============================================================================
// 📝 OUTROS (anotações, fatura manual, cards reorder)
// ==============================================================================

const express = require('express');
const router = express.Router();
const { parseValor } = require('../../helpers/parseHelpers');
const asyncHandler = require('../../helpers/asyncHandler');

module.exports = function (repo) {
  // --- ANOTAÇÕES ---
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

  // --- FATURA MANUAL ---
  router.post(
    '/api/fatura-manual',
    asyncHandler(async (req, res) => {
      const userId = req.session.user.id;
      const month = parseInt(req.body.month, 10);
      const year = parseInt(req.body.year, 10);
      const valor = parseValor(req.body.valor);
      await repo.saveFaturaManual(userId, month, year, valor);
      res.json({ success: true });
    })
  );

  // --- REORDENAR CARDS (drag & drop) ---
  router.post(
    '/api/cards/reorder',
    asyncHandler(async (req, res) => {
      console.log(`[🔍 DEBUG-REORDER] >>> POST /api/cards/reorder para userId=${req.session.user.id}, time=${Date.now()}`);
      console.log(`[🔍 DEBUG-REORDER] Body recebido: ${JSON.stringify(req.body)}`);
      const reorderStart = Date.now();
      await repo.saveOrdemCards(req.session.user.id, req.body.nomes);
      const reorderElapsed = Date.now() - reorderStart;
      console.log(`[🔍 DEBUG-REORDER] saveOrdemCards concluído em ${reorderElapsed}ms`);
      console.log(`[🔍 DEBUG-REORDER] Enviando response {success: true}`);
      res.json({ success: true });
      console.log(`[🔍 DEBUG-REORDER] <<< POST completado em ${Date.now() - reorderStart}ms`);
    })
  );

  return router;
};
