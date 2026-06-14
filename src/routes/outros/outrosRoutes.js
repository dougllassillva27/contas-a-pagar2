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
      await repo.saveFaturaManual(
        req.session.user.id,
        parseInt(req.body.month, 10),
        parseInt(req.body.year, 10),
        parseValor(req.body.valor)
      );
      res.json({ success: true });
    })
  );

  // --- REORDENAR CARDS (drag & drop) ---
  router.post(
    '/api/cards/reorder',
    asyncHandler(async (req, res) => {
      await repo.saveOrdemCards(req.session.user.id, req.body.nomes);
      res.json({ success: true });
    })
  );

  return router;
};
