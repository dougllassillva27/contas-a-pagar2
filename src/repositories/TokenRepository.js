// ==============================================================================
// TokenRepository — CRUD de Tokens Persistentes
// ==============================================================================

const db = require('../config/db');
const crypto = require('crypto');

// ==============================================================================
// Gera token criptografado seguro (64 caracteres hex)
// ==============================================================================
function gerarToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ==============================================================================
// Cria novo token persistente para usuário
// ==============================================================================
async function criarToken(userId, expiresEmDias = 90) {
  const token = gerarToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresEmDias);

  const query = `
    INSERT INTO TokensPersistentes (UsuarioId, Token, ExpiresAt)
    VALUES ($1, $2, $3)
    RETURNING Token, ExpiresAt
  `;
  
  const result = await db.query(query, [userId, token, expiresAt]);
  return result.rows[0];
}

// ==============================================================================
// Valida token e retorna usuário se válido
// ==============================================================================
async function validarToken(token) {
  const query = `
    SELECT tp.*, u.Id, u.Nome, u.Login
    FROM TokensPersistentes tp
    INNER JOIN Usuarios u ON tp.UsuarioId = u.Id
    WHERE tp.Token = $1
      AND tp.ExpiresAt > NOW()
      AND tp.Revogado = false
    LIMIT 1
  `;
  
  const result = await db.query(query, [token]);
  return result.rows[0] || null;
}

// ==============================================================================
// Revoga token (logout)
// ==============================================================================
async function revogarToken(token) {
  const query = `
    UPDATE TokensPersistentes
    SET Revogado = true
    WHERE Token = $1
  `;
  
  await db.query(query, [token]);
}

// ==============================================================================
// Limpa tokens expirados (manutenção)
// ==============================================================================
async function limparTokensExpirados() {
  const query = `
    DELETE FROM TokensPersistentes
    WHERE ExpiresAt < NOW() OR Revogado = true
  `;
  
  const result = await db.query(query);
  return result.rowCount;
}

// ==============================================================================
// Renova token (estende expiração)
// ==============================================================================
async function renovarToken(token, expiresEmDias = 90) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresEmDias);

  const query = `
    UPDATE TokensPersistentes
    SET ExpiresAt = $2
    WHERE Token = $1 AND ExpiresAt > NOW() AND Revogado = false
    RETURNING Token, ExpiresAt
  `;
  
  const result = await db.query(query, [token, expiresAt]);
  return result.rows[0] || null;
}

module.exports = {
  gerarToken,
  criarToken,
  validarToken,
  revogarToken,
  limparTokensExpirados,
  renovarToken,
};