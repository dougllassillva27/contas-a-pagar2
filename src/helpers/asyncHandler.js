// ==============================================================================
// 🛠️ WRAPPER DE TRATAMENTO DE ERROS ASSÍNCRONOS
//
// Permite que rotas async/await sejam usadas sem try/catch manual em cada rota.
// Captura erros síncronos e assíncronos e os encaminha para o middleware de erro.
// ==============================================================================

const asyncHandler = (fn) => {
  return (req, res, next) => {
    try {
      // Garante que qualquer Promise retornada seja tratada,
      // e erros lançados dentro da execução assíncrona sejam capturados.
      Promise.resolve(fn(req, res, next)).catch(next);
    } catch (err) {
      // Captura erros lançados SINCROFAMENTE antes da Promise ser criada.
      next(err);
    }
  };
};

module.exports = asyncHandler;
