// ==============================================================================
// 👥 TERCEIROS
// ==============================================================================

const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { calcularContextoNavegacao } = require('../dashboard/navigationHelpers');
const { montarMapaTerceiros } = require('./terceirosHelpers');
const asyncHandler = require('../../helpers/asyncHandler');

module.exports = function (repo) {
  // --- DASHBOARD DE TERCEIROS ---
  router.get(
    '/terceiros',
    asyncHandler(async (req, res) => {
      const userId = req.session.user.id;
      const { month, year, nav } = calcularContextoNavegacao(req.query);

      const [dadosTerceirosRaw, mesFechado, configuracoes] = await Promise.all([
        repo.getDadosTerceiros(userId, month, year),
        repo.isMesFechado(userId, month, year),
        repo.getConfiguracoes(userId)
      ]);

      const terceirosMap = montarMapaTerceiros(dadosTerceirosRaw);

      // Extrai apenas os terceiros que possuem movimento no mês atual
      let todosTerceiros = Object.values(terceirosMap)
        .filter((t) => t.nome && t.nome.trim() !== '') // Ignora contas próprias (null/vazias)
        .map((t) => ({
          nome: t.nome,
          totalGeral: t.totalGeral,
        }));

      // ✅ FIX IDOR: Garante que todo terceiro ativo tenha um registro na tabela para possuir um TokenPublico
      for (const t of todosTerceiros) {
        await db.query(
          'INSERT INTO terceiros (usuario_id, nome) VALUES ($1, $2) ON CONFLICT (usuario_id, nome) DO NOTHING',
          [userId, t.nome]
        );
      }

      const terceirosQuery = await db.query(
        'SELECT nome, telefone, token_publico FROM terceiros WHERE usuario_id = $1',
        [userId]
      );
      const infoMap = {};
      terceirosQuery.rows.forEach((t) => (infoMap[t.nome] = t));

      const whatsappTemplate = configuracoes?.whatsapp_template || 'Olá {nome_terceiro}! O link das suas contas do mês {mes}/{ano} já está disponível:\n{link}';

      todosTerceiros = todosTerceiros.map((t) => ({
        ...t,
        telefone: infoMap[t.nome]?.telefone || null,
        tokenPublico: infoMap[t.nome]?.token_publico || null,
      }));

      // Ordena alfabeticamente
      todosTerceiros.sort((a, b) => a.nome.localeCompare(b.nome));

      // ✅ FIX: Fallback defensivo para configurações
      const configuracoesValidas = configuracoes || {
        divisao_casa_minimo: '750.00',
        regras_sync: [],
        onboarding_completed: false
      };

      res.render('terceiros-dashboard', {
        nav,
        terceiros: todosTerceiros,
        user: req.session.user,
        mesFechado,
        query: req.query,
        currentPath: req.path,
        whatsappTemplate,
        configuracoes: configuracoesValidas,
        titulo: 'Gestão Financeira - Terceiros',
      });
    })
  );

  // --- RESUMO LEVE DA GRID DE TERCEIROS ---
  router.get(
    '/api/terceiros/resumo',
    asyncHandler(async (req, res) => {
      const { month, year } = calcularContextoNavegacao(req.query);
      const terceiros = await repo.getResumoTerceirosGrid(req.session.user.id, month, year);
      res.json({ success: true, terceiros });
    })
  );

  // --- SALVAR TELEFONE TERCEIRO ---
  router.post(
    '/api/terceiros/telefone',
    asyncHandler(async (req, res) => {
      const userId = req.session.user.id;
      const { nome, telefone } = req.body;

      let cleanPhone = telefone ? telefone.replace(/\D/g, '') : null;
      if (cleanPhone && (cleanPhone.length === 10 || cleanPhone.length === 11)) cleanPhone = '55' + cleanPhone;

      if (!cleanPhone || cleanPhone.length === 0) {
        await db.query('DELETE FROM terceiros WHERE usuario_id = $1 AND nome = $2', [userId, nome]);
      } else {
        await db.query(
          `
          INSERT INTO terceiros (usuario_id, nome, telefone)
          VALUES ($1, $2, $3)
          ON CONFLICT (usuario_id, nome) DO UPDATE SET telefone = EXCLUDED.telefone
        `,
          [userId, nome, cleanPhone]
        );
      }
      res.json({ success: true });
    })
  );

  // --- OBTER TOKEN TERCEIRO (Para Compartilhamento de Atalho no Dashboard) ---
  router.get(
    '/api/terceiros/:nome/token',
    asyncHandler(async (req, res) => {
      const userId = req.session.user.id;
      const nome = req.params.nome;
      // Garante retorno usando UPSERT caso o terceiro seja criado no ato do compartilhamento
      const query = await db.query(
        'INSERT INTO terceiros (usuario_id, nome) VALUES ($1, $2) ON CONFLICT (usuario_id, nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING token_publico',
        [userId, nome]
      );
      res.json({ token: query.rows[0].token_publico });
    })
  );

  return router;
};
