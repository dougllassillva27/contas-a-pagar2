// ==============================================================================
// TokenRepository — CRUD de Tokens Persistentes
// ==============================================================================

const db = require('../config/db');
const crypto = require('crypto');

// ==============================================================================
// Hashing Unidirecional (Protege contra vazamento de DB)
// ==============================================================================
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

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
  const tokenBruto = gerarToken();
  const tokenHash = hashToken(tokenBruto);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresEmDias);

  const query = `
    INSERT INTO TokensPersistentes (UsuarioId, Token, DataExpiracao)
    VALUES ($1, $2, $3)
    RETURNING DataExpiracao as "ExpiresAt"
  `;

  const result = await db.query(query, [userId, tokenHash, expiresAt]);
  const dbExpires = result.rows[0].ExpiresAt || result.rows[0].expiresat || expiresAt;
  return { Token: tokenBruto, token: tokenBruto, ExpiresAt: dbExpires, expiresAt: dbExpires };
}

// ==============================================================================
// Valida token e retorna usuário se válido
// ==============================================================================
async function validarToken(tokenBruto) {
  const tokenHash = hashToken(tokenBruto);
  const query = `
    SELECT tp.*, u.Id, u.Nome, u.Login
    FROM TokensPersistentes tp
    INNER JOIN Usuarios u ON tp.UsuarioId = u.Id
    WHERE tp.Token = $1
      AND tp.DataExpiracao > NOW()
    LIMIT 1
  `;

  const result = await db.query(query, [tokenHash]);
  return result.rows[0] || null;
}

// ==============================================================================
// Revoga token (logout)
// ==============================================================================
async function revogarToken(tokenBruto) {
  const tokenHash = hashToken(tokenBruto);
  const query = `
    DELETE FROM TokensPersistentes
    WHERE Token = $1
  `;

  await db.query(query, [tokenHash]);
}

// ==============================================================================
// Limpa tokens expirados (manutenção)
// ==============================================================================
async function limparTokensExpirados() {
  const query = `
    DELETE FROM TokensPersistentes
    WHERE DataExpiracao < NOW()
  `;

  const result = await db.query(query);
  return result.rowCount;
}

// ==============================================================================
// Renova token (estende expiração)
// ==============================================================================
async function renovarToken(tokenBruto, expiresEmDias = 90) {
  const tokenHash = hashToken(tokenBruto);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresEmDias);

  const query = `
    UPDATE TokensPersistentes
    SET DataExpiracao = $2
    WHERE Token = $1 AND DataExpiracao > NOW()
    RETURNING DataExpiracao as "ExpiresAt"
  `;

  const result = await db.query(query, [tokenHash, expiresAt]);
  if (!result.rows || result.rows.length === 0) return null;
  const dbExpires = result.rows[0].ExpiresAt || result.rows[0].expiresat || expiresAt;
  return { Token: tokenBruto, token: tokenBruto, ExpiresAt: dbExpires, expiresAt: dbExpires };
}

module.exports = {
  gerarToken,
  criarToken,
  validarToken,
  revogarToken,
  limparTokensExpirados,
  renovarToken,
};
