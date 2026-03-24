// ==============================================================================
// UsuarioRepository — Consultas de usuários
// ==============================================================================

const db = require('../config/db');
const crypto = require('crypto');

async function obterUsuarioPorLogin(login) {
  try {
    const result = await db.query('SELECT * FROM Usuarios WHERE Login = $1', [login]);
    return result.rows[0];
  } catch (err) {
    console.error('Erro ao buscar usuário por login:', err.message);
    return null;
  }
}

async function getUsuarioById(id) {
  try {
    const result = await db.query('SELECT * FROM Usuarios WHERE Id = $1', [id]);
    return result.rows[0];
  } catch (err) {
    console.error('Erro ao buscar usuário por ID:', err.message);
    return null;
  }
}

async function criarToken(usuarioId, diasValidade = 90) {
  const token = crypto.randomBytes(32).toString('hex');
  const dataExpiracao = new Date();
  dataExpiracao.setDate(dataExpiracao.getDate() + diasValidade);

  try {
    const query = `
      INSERT INTO TokensPersistentes (UsuarioId, Token, DataExpiracao)
      VALUES ($1, $2, $3)
      RETURNING Token as token
    `;
    const result = await db.query(query, [usuarioId, token, dataExpiracao]);
    return result.rows[0];
  } catch (err) {
    console.error('Erro ao criar token:', err.message);
    throw err;
  }
}

async function revogarToken(token) {
  try {
    await db.query('DELETE FROM TokensPersistentes WHERE Token = $1', [token]);
    return true;
  } catch (err) {
    console.error('Erro ao revogar token:', err.message);
    throw err;
  }
}

// NOVA FUNÇÃO: Busca usuário pelo token para reidratar a sessão
async function buscarUsuarioPorToken(token) {
  try {
    const query = `
      SELECT u.Id as id, u.Nome as nome, u.Login as login
      FROM Usuarios u
      INNER JOIN TokensPersistentes t ON u.Id = t.UsuarioId
      WHERE t.Token = $1 AND t.DataExpiracao > NOW()
    `;
    const result = await db.query(query, [token]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('[REPO] Erro ao buscar usuário por token:', err.message);
    return null;
  }
}

module.exports = { 
  obterUsuarioPorLogin, 
  getUsuarioById, 
  criarToken, 
  revogarToken, 
  buscarUsuarioPorToken 
};
