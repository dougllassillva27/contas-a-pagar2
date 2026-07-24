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

async function criarUsuario(nome, login, senhaHash) {
  const result = await db.query(
    'INSERT INTO Usuarios (Nome, Login, SenhaHash) VALUES ($1, $2, $3) RETURNING *',
    [nome, login, senhaHash]
  );
  return result.rows[0];
}

/**
 * Atualiza a senha do usuário e incrementa passwordVersion em transação.
 * passwordVersion é usado pelo middleware para invalidar sessões antigas.
 * @param {number} userId - ID do usuário
 * @param {string} novaSenhaHash - Hash bcrypt da nova senha
 * @returns {Promise<{senhaAtualizada: boolean, novoPasswordVersion: number}>}
 */
async function atualizarSenha(userId, novaSenhaHash) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE Usuarios
       SET SenhaHash = $1, passwordversion = passwordversion + 1
       WHERE Id = $2
       RETURNING passwordversion`,
      [novaSenhaHash, userId]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return { senhaAtualizada: false, novoPasswordVersion: null };
    }
    await client.query('COMMIT');
    console.log(`[UsuarioRepository] atualizarSenha - Novo passwordVersion: ${result.rows[0].passwordversion}`);
    return { senhaAtualizada: true, novoPasswordVersion: result.rows[0].passwordversion };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Retorna o passwordVersion atual do usuário.
 * @param {number} userId
 * @returns {Promise<number|null>}
 */
async function obterPasswordVersion(userId) {
  const result = await db.query(
    'SELECT passwordVersion FROM Usuarios WHERE Id = $1',
    [userId]
  );
  const version = result.rows[0]?.passwordversion ?? 0;
  console.log(`[UsuarioRepository] obterPasswordVersion(${userId}): ${version}`);
  return version;
}

/**
 * Remove todos os tokens persistentes do usuário (força logout em todos dispositivos).
 * @param {number} userId
 * @returns {Promise<number>} quantidade de tokens removidos
 */
async function limparTokensPersistentes(userId) {
  const result = await db.query(
    'DELETE FROM TokensPersistentes WHERE UsuarioId = $1',
    [userId]
  );
  return result.rowCount;
}

module.exports = {
  obterUsuarioPorLogin,
  getUsuarioById,
  getTodosUsuarios,
  criarUsuario,
  atualizarSenha,
  obterPasswordVersion,
  limparTokensPersistentes,
};
