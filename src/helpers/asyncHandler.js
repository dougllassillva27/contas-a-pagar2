// ==============================================================================
// asyncHandler — Elimina try-catch repetitivo nas rotas Express
//
// Em vez de cada rota ter seu próprio try-catch:
//   router.get('/api/x', async (req, res) => {
//     try { ... } catch (err) { res.status(500).json({ error: err.message }) }
//   });
//
// Basta envolver com asyncHandler:
//   router.get('/api/x', asyncHandler(async (req, res) => { ... }));
//
// Se der erro, ele loga no console e retorna 500 com mensagem genérica
// (sem vazar err.message para o cliente).
// ==============================================================================

/**
 * Envolve um handler async do Express, capturando erros automaticamente.
 * - Loga o erro real no servidor (console.error)
 * - Retorna mensagem genérica para o cliente (sem vazar detalhes internos)
 *
 * @param {Function} fn - Handler async (req, res, next) => { ... }
 * @returns {Function} Handler com tratamento de erro embutido
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(`❌ Erro em ${req.method} ${req.originalUrl}:`, err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro interno do servidor.' });
      }
    });
  };
}

module.exports = asyncHandler;
