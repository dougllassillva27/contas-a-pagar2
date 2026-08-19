const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const asyncHandler = require('../../helpers/asyncHandler');

/**
 * Defaults de tarifas (conta referência JUL/26) — usados quando o usuário
 * ainda não salvou configuração própria.
 */
const DEFAULTS_CONFIG_LUZ = {
  tusd: 0.74627832,
  te: 0.45158577,
  cip: 13.57,
  bandeira_amarela: 2.39,
  bandeira_vermelha1: 0,
  bandeira_vermelha2: 0,
};

const BANDEIRAS_VALIDAS = ['verde', 'amarela', 'vermelha1', 'vermelha2'];

/**
 * GET /configuracoes
 * Retorna as tarifas configuradas do usuário logado (ou defaults se não houver).
 */
router.get(
  '/configuracoes',
  asyncHandler(async (req, res) => {
    const userId = req.session.user.id;
    const result = await db.query('SELECT * FROM configuracoes_luz WHERE usuario_id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.json(DEFAULTS_CONFIG_LUZ);
    }
    res.json(result.rows[0]);
  })
);

/**
 * PUT /configuracoes
 * Atualiza as tarifas do usuário logado (UPSERT).
 */
router.put(
  '/configuracoes',
  asyncHandler(async (req, res) => {
    const userId = req.session.user.id;
    const { tusd, te, cip, bandeira_amarela, bandeira_vermelha1, bandeira_vermelha2 } = req.body;

    const campos = { tusd, te, cip, bandeira_amarela, bandeira_vermelha1, bandeira_vermelha2 };
    for (const [nome, valor] of Object.entries(campos)) {
      const num = Number(valor);
      if (valor === undefined || valor === null || valor === '' || isNaN(num) || num < 0) {
        return res.status(400).json({ error: `Campo inválido: ${nome}` });
      }
    }

    const query = `
      INSERT INTO configuracoes_luz
      (usuario_id, tusd, te, cip, bandeira_amarela, bandeira_vermelha1, bandeira_vermelha2, atualizado_em)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (usuario_id) DO UPDATE SET
        tusd = EXCLUDED.tusd,
        te = EXCLUDED.te,
        cip = EXCLUDED.cip,
        bandeira_amarela = EXCLUDED.bandeira_amarela,
        bandeira_vermelha1 = EXCLUDED.bandeira_vermelha1,
        bandeira_vermelha2 = EXCLUDED.bandeira_vermelha2,
        atualizado_em = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [userId, tusd, te, cip, bandeira_amarela, bandeira_vermelha1, bandeira_vermelha2];
    const result = await db.query(query, values);
    res.json(result.rows[0]);
  })
);

/**
 * GET /historico
 * Retorna o histórico de medições de luz para o usuário logado.
 */
router.get(
  '/historico',
  asyncHandler(async (req, res) => {
    const userId = req.session.user.id;
    const result = await db.query('SELECT * FROM registros_luz WHERE usuario_id = $1 ORDER BY data_registro DESC', [
      userId,
    ]);
    res.json(result.rows);
  })
);

/**
 * POST /salvar
 * Salva uma nova medição de luz para o usuário logado.
 */
router.post(
  '/salvar',
  asyncHandler(async (req, res) => {
    const userId = req.session.user.id;
    const { mesReferencia, leituraAnterior, leituraAtual, consumo, valorEstimado } = req.body;

    if (!mesReferencia || leituraAnterior === undefined || leituraAtual === undefined) {
      return res.status(400).json({ error: 'Dados obrigatórios ausentes.' });
    }

    // Bandeira do mês: default 'verde' quando omitida; fora da whitelist = 400
    const bandeira = req.body.bandeira === undefined ? 'verde' : req.body.bandeira;
    if (!BANDEIRAS_VALIDAS.includes(bandeira)) {
      return res.status(400).json({ error: `Bandeira inválida: ${bandeira}` });
    }
    const adicionalBandeira = req.body.adicionalBandeira === undefined ? 0 : Number(req.body.adicionalBandeira);
    if (isNaN(adicionalBandeira) || adicionalBandeira < 0) {
      return res.status(400).json({ error: 'adicionalBandeira inválido' });
    }

    const query = `
      INSERT INTO registros_luz
      (usuario_id, mes_referencia, leitura_anterior, leitura_atual, consumo_kwh, valor_estimado, bandeira, adicional_bandeira)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [userId, mesReferencia, leituraAnterior, leituraAtual, consumo, valorEstimado, bandeira, adicionalBandeira];
    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  })
);

/**
 * DELETE /deletar/:id
 * Exclui uma medição de luz específica do usuário logado.
 */
router.delete(
  '/deletar/:id',
  asyncHandler(async (req, res) => {
    const userId = req.session.user.id;
    const { id } = req.params;
    await db.query('DELETE FROM registros_luz WHERE id = $1 AND usuario_id = $2', [id, userId]);
    res.status(204).send();
  })
);

module.exports = router;
