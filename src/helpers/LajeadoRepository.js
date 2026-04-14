// ==============================================================================
// LajeadoRepository — Manipulação de dados do painel público (Mural + Valores)
// ==============================================================================

const db = require('../config/db');

async function getLajeado(usuarioId) {
  const res = await db.query('SELECT * FROM Lajeado WHERE UsuarioId = $1', [usuarioId]);
  return res.rows[0];
}

async function saveLajeado(usuarioId, dados) {
  const query = `
      INSERT INTO Lajeado (UsuarioId, Dados, AtualizadoEm)
      VALUES ($1, $2, NOW())
      ON CONFLICT (UsuarioId)
      DO UPDATE SET Dados = EXCLUDED.Dados, AtualizadoEm = NOW()
  `;
  await db.query(query, [usuarioId, dados]);
}

async function updateLajeadoMural(usuarioId, mural) {
  const query = `
      INSERT INTO Lajeado (UsuarioId, Mural, AtualizadoEm)
      VALUES ($1, $2, NOW())
      ON CONFLICT (UsuarioId)
      DO UPDATE SET Mural = EXCLUDED.Mural, AtualizadoEm = NOW()
  `;
  await db.query(query, [usuarioId, mural]);
}

module.exports = { getLajeado, saveLajeado, updateLajeadoMural };
