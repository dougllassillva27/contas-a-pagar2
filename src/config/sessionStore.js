// ==============================================================================
// 💾 Session store persistente (Postgres)
//
// O default do express-session (MemoryStore) perde todas as sessões no restart e
// cresce sem limite. Esta implementação usa a própria tabela `sessoes` (criada no
// initDatabase) através do pool já existente — sem dependência nova.
// ==============================================================================

const session = require('express-session');
const db = require('./db');

const TTL_PADRAO_MS = 24 * 60 * 60 * 1000; // mesma duração do cookie em app.js

// Sem health check: o session store é consultado em toda request
const sql = (texto, params) => (db.queryDireto || db.query)(texto, params);

class PostgresSessionStore extends session.Store {
  constructor(opcoes = {}) {
    super();
    this.ttlMs = opcoes.ttlMs || TTL_PADRAO_MS;

    // Limpeza periódica de sessões expiradas
    this._limpeza = setInterval(() => {
      sql('DELETE FROM sessoes WHERE expire < NOW()').catch((err) => {
        console.error('[SessionStore] Falha ao limpar sessões expiradas:', err.message);
      });
    }, 15 * 60 * 1000);
    if (typeof this._limpeza.unref === 'function') this._limpeza.unref();
  }

  expiraEm(sess) {
    const maxAge = sess && sess.cookie && sess.cookie.maxAge;
    return new Date(Date.now() + (Number(maxAge) || this.ttlMs));
  }

  get(sid, callback) {
    sql('SELECT sess FROM sessoes WHERE sid = $1 AND expire > NOW()', [sid])
      .then((result) => {
        if (!result.rows.length) return callback(null, null);
        const sess = result.rows[0].sess;
        callback(null, typeof sess === 'string' ? JSON.parse(sess) : sess);
      })
      .catch((err) => callback(err));
  }

  set(sid, sess, callback) {
    const expire = this.expiraEm(sess);
    sql(
      `INSERT INTO sessoes (sid, sess, expire) VALUES ($1, $2, $3)
       ON CONFLICT (sid) DO UPDATE SET sess = EXCLUDED.sess, expire = EXCLUDED.expire`,
      [sid, JSON.stringify(sess), expire]
    )
      .then(() => callback && callback(null))
      .catch((err) => callback && callback(err));
  }

  destroy(sid, callback) {
    sql('DELETE FROM sessoes WHERE sid = $1', [sid])
      .then(() => callback && callback(null))
      .catch((err) => callback && callback(err));
  }

  touch(sid, sess, callback) {
    sql('UPDATE sessoes SET expire = $2 WHERE sid = $1', [sid, this.expiraEm(sess)])
      .then(() => callback && callback(null))
      .catch((err) => callback && callback(err));
  }

  length(callback) {
    sql('SELECT COUNT(*)::int AS total FROM sessoes')
      .then((result) => callback(null, result.rows[0].total))
      .catch((err) => callback(err));
  }

  clear(callback) {
    sql('DELETE FROM sessoes')
      .then(() => callback && callback(null))
      .catch((err) => callback && callback(err));
  }
}

module.exports = { PostgresSessionStore };
