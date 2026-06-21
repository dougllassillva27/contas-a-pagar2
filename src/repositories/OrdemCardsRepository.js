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
    if (listaNomes.length > 0) {
      // Bulk insert via UNNEST — 1 query em vez de N
      const indices = listaNomes.map((_, i) => i);
      await client.query(
        'INSERT INTO OrdemCards (Nome, Ordem, UsuarioId) SELECT * FROM UNNEST($1::text[], $2::int[], $3::int[])',
        [listaNomes, indices, listaNomes.map(() => userId)]
      );
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
