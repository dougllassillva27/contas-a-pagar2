// ==============================================================================
// OrdemCardsRepository — Ordenação dos cards de terceiros
// ==============================================================================

const db = require('../config/db');

async function getOrdemCards(userId) {
  const result = await db.query('SELECT * FROM OrdemCards WHERE UsuarioId = $1 ORDER BY Ordem ASC', [userId]);
  return result.rows;
}

async function saveOrdemCards(userId, listaNomes) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM OrdemCards WHERE UsuarioId = $1', [userId]);
    for (let i = 0; i < listaNomes.length; i++) {
      await client.query('INSERT INTO OrdemCards (Nome, Ordem, UsuarioId) VALUES ($1, $2, $3)', [listaNomes[i], i, userId]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getOrdemCards, saveOrdemCards };
