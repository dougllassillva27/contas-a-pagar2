// ==============================================================================
// UsuarioRepository — Consultas de usuários
// ==============================================================================

const db = require('../config/db');

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

module.exports = { obterUsuarioPorLogin, getUsuarioById };
