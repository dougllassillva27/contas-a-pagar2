// ==============================================================================
// 🧪 TESTES — cacheHelpers
// ==============================================================================

const cache = require('../../src/helpers/cacheHelpers');

describe('cacheHelpers', () => {
  beforeEach(() => {
    cache.clear();
  });

  test('set e get funcionam corretamente', () => {
    cache.set('chave1', 'valor1');
    expect(cache.get('chave1')).toBe('valor1');
  });

  test('TTL expira corretamente', (done) => {
    cache.set('chave_ttl', 'valor_ttl', 100); // 100ms TTL
    expect(cache.get('chave_ttl')).toBe('valor_ttl');

    setTimeout(() => {
      expect(cache.get('chave_ttl')).toBeNull();
      done();
    }, 150);
  });

  test('invalidate por padrão funciona', () => {
    cache.set('dashboard:totais:1:3:2026', { total: 100 });
    cache.set('dashboard:totais:1:4:2026', { total: 200 });
    cache.set('outro:dados', { data: 300 });

    cache.invalidate('dashboard:totais:1:3');

    expect(cache.get('dashboard:totais:1:3:2026')).toBeNull();
    expect(cache.get('dashboard:totais:1:4:2026')).toEqual({ total: 200 });
    expect(cache.get('outro:dados')).toEqual({ data: 300 });
  });

  test('clear limpa todo o cache', () => {
    cache.set('chave1', 'valor1');
    cache.set('chave2', 'valor2');
    cache.clear();

    expect(cache.get('chave1')).toBeNull();
    expect(cache.get('chave2')).toBeNull();
  });
});
