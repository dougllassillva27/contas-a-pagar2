// ==============================================================================
// 🧪 TESTES DE INTEGRAÇÃO — Rotas de Automação M2M
// ==============================================================================

const request = require('supertest');
const express = require('express');
const { createApiAuth } = require('../../src/middlewares/auth');

// Mock do repository
const repo = {
  addLancamento: jest.fn(),
  copyMonth: jest.fn(),
  getTodosUsuarios: jest.fn().mockResolvedValue([{ id: 1, nome: 'Teste' }]),
};

const integrationRoutes = require('../../src/routes/integrationRoutes');

function setupApp() {
  const app = express();
  app.use(express.json());
  // Mock API Token injetado como 2º argumento (espelhando a arquitetura do app.js real)
  app.use(integrationRoutes(repo, createApiAuth('teste-m2m-token')));
  return app;
}

describe('Rotas de Integração M2M (integrationRoutes)', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = setupApp();
  });

  test('deve bloquear requisições sem x-api-key (401)', async () => {
    const res = await request(app).post('/api/v1/integracao/lancamentos').send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Acesso Negado');
  });

  test('POST /lancamentos - deve chamar repo e retornar 201', async () => {
    repo.addLancamento.mockResolvedValue({ id: 1 });
    const res = await request(app)
      .post('/api/v1/integracao/lancamentos')
      .set('x-api-key', 'teste-m2m-token')
      .send({ descricao: 'Lançamento Bot', valor: 100 });

    expect(res.status).toBe(201);
    expect(repo.addLancamento).toHaveBeenCalled();
  });

  test('POST /copiar-mensal - deve invocar a cópia e retornar sucesso', async () => {
    const res = await request(app)
      .post('/api/v1/integracao/copiar-mensal')
      .set('x-api-key', 'teste-m2m-token')
      .send({});

    expect(res.status).toBe(200);
  });
});
