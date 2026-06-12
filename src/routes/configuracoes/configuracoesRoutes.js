// ==============================================================================
// ⚙️ CONFIGURAÇÕES
// ==============================================================================

const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const asyncHandler = require('../../helpers/asyncHandler');

module.exports = function (repo) {
  // --- MESES FECHADOS ---
  router.post(
    '/api/meses-fechados/toggle',
    asyncHandler(async (req, res) => {
      const { month, year } = req.body;
      const novoStatus = await repo.toggleMesFechado(req.session.user.id, parseInt(month, 10), parseInt(year, 10));
      res.json({ success: true, mesFechado: novoStatus });
    })
  );

  // --- SALVAR TEMPLATE WHATSAPP ---
  router.post(
    '/api/configuracoes/whatsapp',
    asyncHandler(async (req, res) => {
      const userId = req.session.user.id;
      const { template } = req.body;
      await db.query(
        `
        INSERT INTO configuracoes (usuario_id, whatsapp_template) VALUES ($1, $2)
        ON CONFLICT (usuario_id) DO UPDATE SET whatsapp_template = EXCLUDED.whatsapp_template
      `,
        [userId, template]
      );
      res.json({ success: true });
    })
  );

  // --- SALVAR CONFIGURAÇÕES GERAIS ---
  router.post(
    '/api/configuracoes',
    asyncHandler(async (req, res) => {
      const userId = req.session.user.id;
      const { chave, valor } = req.body;

      if (!chave || valor === undefined) {
        return res.status(400).json({ error: 'Chave e valor são obrigatórios.' });
      }
      await repo.saveConfiguracao(userId, chave, valor);
      res.json({ success: true });
    })
  );

  return router;
};
