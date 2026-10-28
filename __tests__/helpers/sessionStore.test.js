// ==============================================================================
// 🧪 TESTES — Session store persistente em Postgres
// ==============================================================================

const queries = [];

jest.mock('../../src/config/db', () => ({
  queryDireto: jest.fn(async (texto, params) => {
    queries.push({ texto, params });
    if (/SELECT sess/.test(texto)) return { rows: [{ sess: JSON.stringify({ cookie: {}, user: { id: 1 } }) }] };
    if (/SELECT COUNT/.test(texto)) return { rows: [{ total: 3 }] };
    return { rows: [] };
  }),
}));

const db = require('../../src/config/db');
const { PostgresSessionStore } = require('../../src/config/sessionStore');

describe('PostgresSessionStore', () => {
  let store;

  beforeEach(() => {
    queries.length = 0;
    jest.clearAllMocks();
    store = new PostgresSessionStore();
  });

  afterEach(() => {
    clearInterval(store._limpeza);
  });

  test('get devolve a sessão desserializada', (done) => {
    store.get('sid-1', (err, sess) => {
      expect(err).toBeNull();
      expect(sess.user).toEqual({ id: 1 });
      expect(queries[0].params).toEqual(['sid-1']);
      done();
    });
  });

  test('get devolve null quando não há linha', (done) => {
    db.queryDireto.mockImplementationOnce(async () => ({ rows: [] }));
    store.get('nao-existe', (err, sess) => {
      expect(err).toBeNull();
      expect(sess).toBeNull();
      done();
    });
  });

  test('set faz upsert com expire no futuro', (done) => {
    store.set('sid-1', { cookie: { maxAge: 60000 }, user: { id: 1 } }, (err) => {
      expect(err).toBeNull();
      const { texto, params } = queries[0];
      expect(texto).toMatch(/INSERT INTO sessoes/);
      expect(texto).toMatch(/ON CONFLICT \(sid\) DO UPDATE/);
      expect(params[0]).toBe('sid-1');
      expect(JSON.parse(params[1]).user).toEqual({ id: 1 });
      expect(new Date(params[2]).getTime()).toBeGreaterThan(Date.now());
      done();
    });
  });

  test('destroy remove a sessão', (done) => {
    store.destroy('sid-1', (err) => {
      expect(err).toBeNull();
      expect(queries[0].texto).toMatch(/DELETE FROM sessoes WHERE sid = \$1/);
      done();
    });
  });

  test('touch renova o expire', (done) => {
    store.touch('sid-1', { cookie: { maxAge: 120000 } }, (err) => {
      expect(err).toBeNull();
      expect(queries[0].texto).toMatch(/UPDATE sessoes SET expire/);
      done();
    });
  });

  test('length devolve a contagem', (done) => {
    store.length((err, total) => {
      expect(err).toBeNull();
      expect(total).toBe(3);
      done();
    });
  });

  test('propaga erro do banco no callback', (done) => {
    db.queryDireto.mockImplementationOnce(async () => {
      throw new Error('banco fora');
    });
    store.get('sid-1', (err) => {
      expect(err.message).toBe('banco fora');
      done();
    });
  });
});
