// ==============================================================================
// AnotacaoRepository — CRUD de Anotações
// ==============================================================================

const db = require('../config/db');

async function getAnotacoes(userId) {
  const result = await db.query('SELECT Conteudo FROM Anotacoes WHERE UsuarioId = $1 LIMIT 1', [userId]);
  return result.rows[0]?.conteudo || '';
}

async function updateAnotacoes(userId, texto) {
  // UPSERT: insere ou atualiza em uma única query (sem race condition)
  await db.query(
    `INSERT INTO Anotacoes (Conteudo, UsuarioId) VALUES ($1, $2)
     ON CONFLICT (UsuarioId) DO UPDATE SET Conteudo = EXCLUDED.Conteudo`,
    [texto, userId]
  );
}

module.exports = { getAnotacoes, updateAnotacoes };
