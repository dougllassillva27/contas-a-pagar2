// ==============================================================================
// 🧪 TESTES DE INTEGRAÇÃO — Rotas Públicas (Login/Terceiros)
// ==============================================================================

const request = require('supertest');
const express = require('express');
const session = require('express-session');

const repo = {
  buscarUsuarioPorLogin: jest.fn(),
  revogarToken: jest.fn(),
  getLancamentosCartaoPorPessoa: jest.fn().mockResolvedValue([]),
  getLancamentosPorTipo: jest.fn().mockResolvedValue([]),
  getLancamentosTerceiro: jest.fn().mockResolvedValue([]),
  isMesFechado: jest.fn().mockResolvedValue(false),
};

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));
const bcrypt = require('bcryptjs');

jest.mock('../../src/middlewares/rateLimiter', () => ({
  loginLimiter: (req, res, next) => next(),
  apiLimiter: (req, res, next) => next(),
}));

const publicRoutes = require('../../src/routes/publicRoutes');

function setupApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: true,
    })
  );

  // Mock do EJS render E envia HTML para o supertest processar
  app.response.render = jest.fn(function (view, data) {
    this.send(`Rendered ${view}`);
  });

  app.use('/', publicRoutes(repo));
  return app;
}

describe('Rotas Públicas (publicRoutes)', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = setupApp();
  });

  test('GET /login - deve renderizar view de login', async () => {
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(app.response.render).toHaveBeenCalledWith('login', expect.any(Object));
  });

  test('GET /logout - deve redirecionar para login', async () => {
    const res = await request(app).get('/logout');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('GET /contas/:userId/:nome - deve renderizar portal de terceiros', async () => {
    const res = await request(app).get('/contas/1/Teste');
    expect(res.status).toBe(200);
  });
});
