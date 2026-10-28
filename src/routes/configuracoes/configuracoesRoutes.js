// ==============================================================================
// ⚙️ CONFIGURAÇÕES
// ==============================================================================

const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const asyncHandler = require('../../helpers/asyncHandler');
const { isValidMonthYear, sanitizeString } = require('../../middlewares/inputValidation');
const { destinoPermitido } = require('../../services/syncService');

module.exports = function (repo) {
  // --- MESES FECHADOS ---
  router.post(
    '/api/meses-fechados/toggle',
    asyncHandler(async (req, res) => {
      const { month, year } = req.body;
      if (!isValidMonthYear(month, year)) {
        return res.status(400).json({ error: 'Mês ou ano inválido.' });
      }
      const novoStatus = await repo.toggleMesFechado(req.session.user.id, parseInt(month, 10), parseInt(year, 10));
      res.json({ success: true, mesFechado: novoStatus });
    })
  );

  // --- SALVAR TEMPLATE WHATSAPP ---
  router.post(
    '/api/configuracoes/whatsapp',
    asyncHandler(async (req, res) => {
      const userId = req.session.user.id;
      const template = sanitizeString(req.body.template, 1000);

      if (!template || template.length === 0) {
        return res.status(400).json({ error: 'Template é obrigatório.' });
      }

      await db.query(
        `
        INSERT INTO configuracoes (usuario_id, whatsapp_template) VALUES ($1, $2)
        ON CONFLICT (usuario_id) DO UPDATE SET whatsapp_template = EXCLUDED.whatsapp_template
      `,
        [userId, template]
      );

      if (typeof repo.invalidateCache === 'function') {
        repo.invalidateCache(userId);
      }

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

      // 🔒 Regras de sincronização escrevem em outras contas: o destino precisa
      // estar no domicílio autorizado (usuários 1 e 2 por padrão).
      if (chave === 'regras_sync') {
        if (!Array.isArray(valor)) {
          return res.status(400).json({ error: 'regras_sync deve ser uma lista de regras.' });
        }

        const destinoInvalido = valor.some(
          (regra) => regra && regra.usuarioDestino !== undefined && !destinoPermitido(regra.usuarioDestino)
        );

        if (destinoInvalido) {
          console.warn(`[CONFIG] Usuário ${userId} tentou salvar regra de sync com destino fora do domicílio.`);
          return res.status(400).json({ error: 'Regra de sincronização com destino não autorizado.' });
        }
      }

      await repo.saveConfiguracao(userId, chave, valor);
      res.json({ success: true });
    })
  );

  return router;
};
