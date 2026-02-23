// ==============================================================================
// BackupRepository — Exportação de dados para backup
// ==============================================================================

const db = require('../config/db');

async function getAllDataForBackup(userId) {
  const lancamentos = await db.query('SELECT * FROM Lancamentos WHERE UsuarioId = $1 ORDER BY DataVencimento DESC, Id DESC', [userId]);
  const anotacoes = await db.query('SELECT * FROM Anotacoes WHERE UsuarioId = $1', [userId]);
  return {
    backup_date: new Date(),
    lancamentos: lancamentos.rows,
    anotacoes: anotacoes.rows,
  };
}

module.exports = { getAllDataForBackup };
