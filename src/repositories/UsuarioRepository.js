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

async function getTodosUsuarios() {
  try {
    const result = await db.query('SELECT Id as id, Nome as nome FROM Usuarios');
    return result.rows;
  } catch (err) {
    console.error('Erro ao buscar todos os usuários:', err.message);
    return [];
  }
}

module.exports = {
  obterUsuarioPorLogin,
  getUsuarioById,
  getTodosUsuarios,
};
