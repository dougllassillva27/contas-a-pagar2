// ==============================================================================
// 🧷 Middleware — Normalização de path (colapsa barras duplas)
//
// Causa raiz do incidente de 30/09: a automação montava a URL como
// `${base}/` + `/api/v1/integracao/copiar-mensal` → `//api/v1/...`, que não
// casa a rota montada no Express (src/app.js) e escapa para o CSRF global → 403.
//
// Este middleware roda cedo e colapsa sequências de "/" no pathname
// (`//api/...` → `/api/...`), preservando a query string intacta.
// Rotas legítimas (sem barra dupla) não são tocadas.
// ==============================================================================

function normalizePath(req, res, next) {
  const url = req.url || '';

  // Fast-path: nada a fazer
  if (!url.includes('//')) return next();

  const qIndex = url.indexOf('?');
  const pathname = qIndex === -1 ? url : url.slice(0, qIndex);
  const query = qIndex === -1 ? '' : url.slice(qIndex);

  // Só normaliza origin-form (path iniciando com "/"). Nunca mexe em
  // absolute-form (`http://...`), que contém "//" legítimo.
  if (!pathname.startsWith('/')) return next();

  const pathnameNormalizado = pathname.replace(/\/{2,}/g, '/');
  if (pathnameNormalizado === pathname) return next();

  console.warn(`[Path] Colapsando barras duplas: ${url} -> ${pathnameNormalizado}${query}`);
  req.url = pathnameNormalizado + query;

  next();
}

module.exports = normalizePath;
