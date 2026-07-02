// Cache singleton usando global para garantir persistência entre módulos
if (!global.__RESUMO_CACHE__) {
  global.__RESUMO_CACHE__ = { data: null, key: null, timestamp: 0 };
}

const TTL = 5000; // 5 segundos

module.exports = {
  get(userId, month, year) {
    const key = `${userId}-${month}-${year}`;
    const now = Date.now();
    const cache = global.__RESUMO_CACHE__;
    if (cache.data && cache.key === key && (now - cache.timestamp) < TTL) {
      console.log('[CACHE] HIT');
      return cache.data;
    }
    console.log('[CACHE] MISS');
    return null;
  },
  set(data, userId, month, year) {
    const cache = global.__RESUMO_CACHE__;
    cache.data = data;
    cache.key = `${userId}-${month}-${year}`;
    cache.timestamp = Date.now();
  }
};