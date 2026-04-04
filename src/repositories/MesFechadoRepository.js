// ==============================================================================
// MesFechadoRepository — Controle de Mês Trancado
// ==============================================================================

const db = require('../config/db');

async function isMesFechado(userId, mes, ano) {
  const res = await db.query('SELECT 1 FROM MesesFechados WHERE UsuarioId = $1 AND Mes = $2 AND Ano = $3', [
    userId,
    mes,
    ano,
  ]);
  return res.rowCount > 0;
}

async function toggleMesFechado(userId, mes, ano) {
  if (await isMesFechado(userId, mes, ano)) {
    await db.query('DELETE FROM MesesFechados WHERE UsuarioId = $1 AND Mes = $2 AND Ano = $3', [userId, mes, ano]);
    return false; // Agora está aberto
  }
  await db.query('INSERT INTO MesesFechados (UsuarioId, Mes, Ano) VALUES ($1, $2, $3)', [userId, mes, ano]);
  return true; // Agora está fechado
}

module.exports = { isMesFechado, toggleMesFechado };
