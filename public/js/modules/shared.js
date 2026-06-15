// ==============================================================================
// ✅ SHARED — Helpers comuns
// ==============================================================================

export function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const softRefreshCache = new Map();
export const SOFT_REFRESH_TTL = 30 * 1000;
