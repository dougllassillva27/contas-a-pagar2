// ==============================================================================
// 🧪 TESTES UNITÁRIOS — Middlewares de Autenticação
//
// Testa authMiddleware e createApiAuth sem precisar do Express real.
// Usamos "mocks" — objetos falsos que simulam req, res e next.
//
// 💡 O QUE É UM MOCK?
// É um objeto "fake" que simula o comportamento de algo real.
// Ex: Em vez de usar o Express de verdade, criamos um objeto que
// finge ser o "req" e o "res", e verificamos se o middleware chamou
// as funções certas (redirect, status, json, next).
//
// Para rodar APENAS este arquivo:
//   npx jest __tests__/middlewares/auth.test.js
// ==============================================================================

const { authMiddleware, createApiAuth } = require('../../src/middlewares/auth');

// ==========================================================================
// authMiddleware — protege rotas web via sessão
// ==========================================================================
describe('authMiddleware', () => {
  // Função auxiliar: cria objetos fake de req, res, next
  function criarMocks(sessionUser = null) {
    return {
      req: {
        session: sessionUser ? { user: sessionUser } : {},
      },
      res: {
        redirect: jest.fn(), // jest.fn() = função espiã (registra se foi chamada)
      },
      next: jest.fn(),
    };
  }

  test('se tem sessão com user, chama next() (acesso liberado)', () => {
    const { req, res, next } = criarMocks({ id: 1, nome: 'Dodo' });

    authMiddleware(req, res, next);

    // next foi chamado = middleware deixou passar
    expect(next).toHaveBeenCalled();
    // redirect NÃO foi chamado
    expect(res.redirect).not.toHaveBeenCalled();
  });

  test('se NÃO tem sessão, redireciona para /login', () => {
    const { req, res, next } = criarMocks(null);

    authMiddleware(req, res, next);

    // redirect foi chamado com '/login'
    expect(res.redirect).toHaveBeenCalledWith('/login');
    // next NÃO foi chamado
    expect(next).not.toHaveBeenCalled();
  });

  test('se sessão existe mas sem user, redireciona para /login', () => {
    const req = { session: {} }; // session sem propriedade "user"
    const res = { redirect: jest.fn() };
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/login');
    expect(next).not.toHaveBeenCalled();
  });
});

// ==========================================================================
// createApiAuth — protege APIs via header x-api-key
// ==========================================================================
describe('createApiAuth', () => {
  const TOKEN_CORRETO = 'meu-token-secreto';
  const apiAuth = createApiAuth(TOKEN_CORRETO);

  // Função auxiliar: cria req com headers
  function criarReq(apiKey) {
    return {
      headers: apiKey !== undefined ? { 'x-api-key': apiKey } : {},
    };
  }

  function criarRes() {
    const res = {
      status: jest.fn().mockReturnThis(), // mockReturnThis() permite encadear: res.status(401).json(...)
      json: jest.fn(),
    };
    return res;
  }

  test('token correto → chama next() (acesso liberado)', () => {
    const req = criarReq(TOKEN_CORRETO);
    const res = criarRes();
    const next = jest.fn();

    apiAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('token errado → retorna 401', () => {
    const req = criarReq('token-errado');
    const res = criarRes();
    const next = jest.fn();

    apiAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Acesso Negado',
    });
  });

  test('sem header x-api-key → retorna 401', () => {
    const req = criarReq(undefined);
    const res = criarRes();
    const next = jest.fn();

    apiAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('token vazio → retorna 401', () => {
    const req = criarReq('');
    const res = criarRes();
    const next = jest.fn();

    apiAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
