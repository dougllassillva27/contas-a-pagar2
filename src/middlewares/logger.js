// ==============================================================================
// 📋 Logger de Requisições
// Registra método, URL, status e tempo de resposta.
// Útil para diagnosticar problemas em produção (Render).
// ==============================================================================

/**
 * Middleware de logging simples.
 * Loga cada requisição ao finalizar, no formato:
 *   GET /api/rendas 200 12ms
 *
 * Ignora arquivos estáticos (css, js, ico) para não poluir o log.
 */
function requestLogger(req, res, next) {
  // Não loga arquivos estáticos
  const staticExts = ['.css', '.js', '.ico', '.png', '.jpg', '.svg', '.woff', '.woff2'];
  if (staticExts.some((ext) => req.path.endsWith(ext))) {
    return next();
  }

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const icon = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
    console.log(`${icon} ${req.method} ${req.originalUrl} ${status} ${duration}ms`);
  });

  next();
}

module.exports = requestLogger;
