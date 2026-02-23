// ==============================================================================
// FaturaManualRepository — CRUD de Fatura Manual
// ==============================================================================

const db = require('../config/db');

async function getFaturaManual(userId, month, year) {
  try {
    const result = await db.query('SELECT Valor FROM FaturaManual WHERE UsuarioId = $1 AND Mes = $2 AND Ano = $3', [userId, month, year]);
    return parseFloat(result.rows[0]?.valor) || 0;
  } catch (err) {
    console.error('Erro ao buscar fatura manual:', err.message);
    return 0;
  }
}

async function saveFaturaManual(userId, month, year, valor) {
  // UPSERT: insere ou atualiza em uma única query (sem race condition)
  await db.query(
    `INSERT INTO FaturaManual (UsuarioId, Mes, Ano, Valor) VALUES ($1, $2, $3, $4)
     ON CONFLICT (UsuarioId, Mes, Ano) DO UPDATE SET Valor = EXCLUDED.Valor`,
    [userId, month, year, valor]
  );
}

module.exports = { getFaturaManual, saveFaturaManual };
