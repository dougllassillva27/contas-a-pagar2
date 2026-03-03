// ==============================================================================
// AnotacaoRepository — CRUD de Anotações
// ==============================================================================

const db = require('../config/db');

async function getAnotacoes(userId, mes, ano) {
  const result = await db.query('SELECT Conteudo FROM Anotacoes WHERE UsuarioId = $1 AND Mes = $2 AND Ano = $3 LIMIT 1', [userId, mes, ano]);
  return result.rows[0]?.conteudo || '';
}

async function updateAnotacoes(userId, mes, ano, texto) {
  // UPSERT: insere ou atualiza em uma única query (sem race condition) baseando no índice único
  await db.query(
    `INSERT INTO Anotacoes (UsuarioId, Mes, Ano, Conteudo) VALUES ($1, $2, $3, $4)
     ON CONFLICT (UsuarioId, Mes, Ano) DO UPDATE SET Conteudo = EXCLUDED.Conteudo`,
    [userId, mes, ano, texto]
  );
}

module.exports = { getAnotacoes, updateAnotacoes };
