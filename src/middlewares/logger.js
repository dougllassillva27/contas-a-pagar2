// ==============================================================================
// 📋 Logger de Requisições — AVANÇADO
// Com timestamps e detalhes para debug em produção
// ==============================================================================

/**
 * Middleware de logging detalhado.
 * Loga cada requisição ao finalizar, com timestamp ISO e detalhes.
 * 
 * Formato: [TIMESTAMP] [METHOD] PATH - STATUS - DURATIONms - USER
 */
function requestLogger(req, res, next) {
  // Não loga arquivos estáticos
  const staticExts = ['.css', '.js', '.ico', '.png', '.jpg', '.svg', '.woff', '.woff2'];
  if (staticExts.some((ext) => req.path.endsWith(ext))) {
    return next();
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress || 'N/A';

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const user = req.session?.user?.nome || 'GUEST';
    
    // Ícone baseado no status
    const icon = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
    
    // Log colorido (funciona no Render)
    console.log(`[${timestamp}] [${method}] ${path} - ${status} - ${duration}ms - User: ${user} - IP: ${ip}`);
    
    // Log adicional para erros
    if (status >= 400) {
      console.warn(`[${timestamp}] [WARNING] ${method} ${path} returned ${status}`);
    }
  });

  next();
}

module.exports = requestLogger;