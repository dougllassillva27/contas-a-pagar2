// ==============================================================================
// 🧠 Cache em Memória (Map) com TTL Configurável
// ==============================================================================

const cache = new Map();

/**
 * Define um valor no cache com TTL (ms).
 */
function set(key, value, ttl = 5 * 60 * 1000) {
  const expiry = Date.now() + ttl;
  cache.set(key, { value, expiry });
}

/**
 * Obtém um valor do cache. Retorna null se expirado ou inexistente.
 */
function get(key) {
  const item = cache.get(key);
  if (!item) return null;

  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }

  return item.value;
}

/**
 * Invalida chaves que correspondem a um padrão (prefixo).
 */
function invalidate(pattern) {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Limpa todo o cache.
 */
function clear() {
  cache.clear();
}

module.exports = { set, get, invalidate, clear };
