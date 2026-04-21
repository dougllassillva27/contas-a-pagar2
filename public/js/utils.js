// ==============================================================================
// ✅ public/js/utils.js — Utilitários Globais do Frontend
// ==============================================================================

/**
 * Atrasa a execução da função até que `delay` milissegundos tenham se passado
 * desde a última vez que ela foi invocada. Útil para otimização de eventos de UI
 * e prevenção de flood de requisições na API.
 *
 * @param {Function} func Função a ser executada
 * @param {number} delay Atraso em milissegundos (padrão 500)
 * @returns {Function} Função debounced
 */
function debounce(func, delay = 500) {
  let timeoutId;
  return function (...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}
