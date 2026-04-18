// ==============================================================================
// 🧪 TESTES UNITÁRIOS — asyncHandler (Versão Corrigida)
//
// Valida que o wrapper captura erros síncronos e assíncronos e os repassa corretamente via next().
//
// Para rodar APENAS este arquivo:
//   npx jest __tests__/helpers/asyncHandler.test.js
// ==============================================================================

const asyncHandler = require('../../src/helpers/asyncHandler');

describe('asyncHandler', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn(); // Mock da função next do Express
  });

  test('deve chamar next() com o erro quando ocorre um erro SÍNCRONO', async () => {
    const erroTeste = new Error('Erro síncrono');
    const mockFn = jest.fn(() => {
      throw erroTeste;
    });

    const handler = asyncHandler(mockFn);
    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(erroTeste);
    // Verifica se o handler não tentou responder diretamente (não é responsabilidade dele)
    expect(res.status).not.toHaveBeenCalled();
  });

  test('deve chamar next() com o erro quando ocorre um erro ASSÍNCRONO', async () => {
    const erroTeste = new Error('Erro assíncrono');
    const mockFn = jest.fn(async () => {
      throw erroTeste;
    });

    const handler = asyncHandler(mockFn);
    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(erroTeste);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('deve executar normalmente e chamar next sem erros em caso de sucesso', async () => {
    const mockFn = jest.fn(async (req, res, nextFn) => {
      nextFn();
    });

    const handler = asyncHandler(mockFn);
    await handler(req, res, next);

    expect(next).toHaveBeenCalled();
    // next é chamado sem argumentos (sucesso)
    expect(next.mock.calls[0][0]).toBeUndefined();
  });

  test('deve passar req, res e next corretamente para a função original', async () => {
    const mockFn = jest.fn(async (req, res, nextFn) => {
      // Apenas para verificar se recebeu os argumentos
    });

    const handler = asyncHandler(mockFn);
    await handler(req, res, next);

    expect(mockFn).toHaveBeenCalledWith(req, res, expect.any(Function));
  });
});
