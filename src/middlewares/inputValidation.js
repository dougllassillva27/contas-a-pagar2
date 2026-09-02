// ==============================================================================
// 🛡️ Validação de Input Centralizada
// Helpers reutilizáveis para validar/sanitizar inputs em rotas protegidas.
// ==============================================================================

/**
 * Valida se valor é inteiro positivo válido.
 */
function isPositiveInt(val) {
  const n = parseInt(val, 10);
  return !isNaN(n) && n > 0 && Number.isInteger(n);
}

/**
 * Valida se valor é boolean estrito.
 */
function isBoolean(val) {
  return typeof val === 'boolean';
}

/**
 * Sanitiza string para uso seguro em queries/logs.
 * Remove caracteres de controle, limita tamanho.
 */
function sanitizeString(val, maxLen = 500) {
  if (typeof val !== 'string') return null;
  // Remove caracteres de controle (exceto newline/tab)
  const cleaned = val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.substring(0, maxLen).trim();
}

/**
 * Valida month (1-12) e year (2020-2100).
 */
function isValidMonthYear(month, year) {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  return !isNaN(m) && !isNaN(y) && m >= 1 && m <= 12 && y >= 2020 && y <= 2100;
}

/**
 * Valida array de IDs numéricos.
 */
function isValidIdArray(arr, maxLen = 500) {
  if (!Array.isArray(arr) || arr.length === 0 || arr.length > maxLen) return false;
  return arr.every((id) => isPositiveInt(id));
}

/**
 * Middleware factory: valida req.params.id como inteiro positivo.
 */
function validateParamId(req, res, next) {
  if (!isPositiveInt(req.params.id)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }
  next();
}

module.exports = {
  isPositiveInt,
  isBoolean,
  sanitizeString,
  isValidMonthYear,
  isValidIdArray,
  validateParamId,
};
