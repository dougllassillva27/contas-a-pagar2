const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const asyncHandler = require('../../helpers/asyncHandler');

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

    const query = `
      INSERT INTO registros_luz 
      (usuario_id, mes_referencia, leitura_anterior, leitura_atual, consumo_kwh, valor_estimado)
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `;
    const values = [userId, mesReferencia, leituraAnterior, leituraAtual, consumo, valorEstimado];
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
