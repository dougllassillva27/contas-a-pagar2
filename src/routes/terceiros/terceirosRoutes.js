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

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG-TERCEIROS] userId=${userId}, month=${month}, year=${year}`);
      }
      const [{ rows: dadosTerceirosRaw, total }, mesFechado, configuracoes] = await Promise.all([
       repo.getDadosTerceiros(userId, month, year),
        repo.isMesFechado(userId, month, year),
        repo.getConfiguracoes(userId)
      ]);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG-TERCEIROS] Total registros no banco: ${total}`);
        console.log(`[DEBUG-TERCEIROS] Total terceiros retornados (após filtro): ${dadosTerceirosRaw.length}`);
        if (dadosTerceirosRaw.length > 0) {
          const nomesUnicos = [...new Set(dadosTerceirosRaw.map(r => r.nometerceiro).filter(Boolean))];
          console.log(`[DEBUG-TERCEIROS] Nomes únicos encontrados: ${nomesUnicos.join(', ')}`);
          console.log(`[DEBUG-TERCEIROS] Quantidade de nomes únicos: ${nomesUnicos.length}`);
          console.log(`[DEBUG-TERCEIROS] Primeiros 5 registros:`, dadosTerceirosRaw.slice(0, 5).map(r => ({ nome: r.nometerceiro, desc: r.descricao })));
          const temVo = dadosTerceirosRaw.some(r => r.nometerceiro && (r.nometerceiro.includes('V') || r.nometerceiro.includes('v')));
          console.log(`[DEBUG-TERCEIROS] Tem algum terceiro com V no nome? ${temVo}`);
          if (temVo) {
            console.log(`[DEBUG-TERCEIROS] Quais?`, [...new Set(dadosTerceirosRaw.filter(r => r.nometerceiro && (r.nometerceiro.includes('V') || r.nometerceiro.includes('v'))).map(r => r.nometerceiro))]);
          }
        }
      }

      const userName = req.session.user.nome || 'Eu';
      const terceirosMap = montarMapaTerceiros(dadosTerceirosRaw, userName);

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG-TERCEIROS] Terceiros no mapa (após montarMapaTerceiros): ${Object.keys(terceirosMap).length}`);
        console.log(`[DEBUG-TERCEIROS] Chaves do mapa: ${Object.keys(terceirosMap).join(', ')}`);
      }

      // Extrai apenas os terceiros que possuem movimento no mês atual
      let todosTerceiros = Object.values(terceirosMap)
        .filter((t) => t.nome && t.nome.trim() !== '') // Ignora contas próprias (null/vazias)
        .map((t) => ({
          nome: t.nome,
          totalGeral: t.totalGeral,
        }));

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG-TERCEIROS] Terceiros após filtro final: ${todosTerceiros.length}`);
        console.log(`[DEBUG-TERCEIROS] Lista final: ${todosTerceiros.map(t => t.nome).join(', ')}`);
      }

      // ✅ FIX IDOR: Bulk UPSERT — garante registro em única query usando UNNEST
     if (todosTerceiros.length > 0) {
        const nomes = todosTerceiros.map((t) => t.nome);
        await db.query(
          'INSERT INTO terceiros (usuario_id, nome) SELECT $1, unnest($2::text[]) ON CONFLICT (usuario_id, nome) DO NOTHING',
          [userId, nomes]
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
      console.log(`[DEBUG-TERCEIROS] Nomes ordenados: ${todosTerceiros.map(t => t.nome).join(', ')}`);
      console.log(`[DEBUG-TERCEIROS] Tem 'Vô'? ${todosTerceiros.some(t => t.nome === 'Vô')}`);
      console.log(`[DEBUG-TERCEIROS] Tem 'Vo' (sem acento)? ${todosTerceiros.some(t => t.nome === 'Vo')}`);
      console.log(`[DEBUG-TERCEIROS] Tem 'Avô'? ${todosTerceiros.some(t => t.nome === 'Avô')}`);

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
      if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Nao autenticado' });
      }

      const userId = req.session.user.id;
      const nome = req.params.nome;

      // Verifica se terceiro ja tem token
      const existing = await db.query('SELECT token_publico FROM terceiros WHERE usuario_id = $1 AND nome = $2', [userId, nome]);

      let token = existing.rows[0]?.token_publico;

      if (!token) {
        // Gera novo token
        const crypto = require('crypto');
        token = crypto.randomBytes(16).toString('hex');
        await db.query('UPDATE terceiros SET token_publico = $1 WHERE usuario_id = $2 AND nome = $3', [token, userId, nome]);
      }

      res.json({ token });
    })
  );

  return router;
};
