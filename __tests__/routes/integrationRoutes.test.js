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
  getLancamento: jest.fn(),
  updateLancamento: jest.fn(),
  deleteLancamento: jest.fn(),
};

// Mock da função normalizarTerceiro exportada pelo LancamentoRepository
jest.mock('../../src/repositories/LancamentoRepository', () => ({
  normalizarTerceiro: jest.fn((nome) => {
    const nomeNormalizado = (nome || '').trim().toLowerCase();
    if (['eu', 'dodo', ''].includes(nomeNormalizado)) {
      return null;
    }
    return (nome || '').trim();
  }),
}));

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
    // Mock nativo do fetch para anular a notificação assíncrona (fire and forget) do Telegram
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    app = setupApp();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      .send({ descricao: 'Lançamento Bot', valor: 100, tipo: 'fixa', usuario_id: 1 });

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

  // ============================================================================
  // PUT /api/v1/integracao/lancamentos/:id
  // ============================================================================
  describe('PUT /api/v1/integracao/lancamentos/:id', () => {
    test('deve bloquear requisições sem x-api-key (401)', async () => {
      const res = await request(app).put('/api/v1/integracao/lancamentos/1').send({ usuario_id: 1 });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Acesso Negado');
    });

    test('deve retornar 400 se usuario_id estiver ausente', async () => {
      const res = await request(app)
        .put('/api/v1/integracao/lancamentos/1')
        .set('x-api-key', 'teste-m2m-token')
        .send({ descricao: 'Teste' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('deve retornar 400 se id for inválido', async () => {
      const res = await request(app)
        .put('/api/v1/integracao/lancamentos/abc')
        .set('x-api-key', 'teste-m2m-token')
        .send({ usuario_id: 1, descricao: 'Teste' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('deve retornar 404 se lançamento não existir', async () => {
      repo.getLancamento.mockResolvedValue(null);
      const res = await request(app)
        .put('/api/v1/integracao/lancamentos/999')
        .set('x-api-key', 'teste-m2m-token')
        .send({ usuario_id: 1, descricao: 'Teste' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('deve atualizar parcialmente e retornar 200', async () => {
      repo.getLancamento.mockResolvedValue({
        id: 1,
        descricao: 'Original',
        valor: 100,
        tipo: 'CARTAO',
        categoria: null,
        parcelaatual: null,
        totalparcelas: null,
        nometerceiro: null,
      });
      repo.updateLancamento.mockResolvedValue();

      const res = await request(app)
        .put('/api/v1/integracao/lancamentos/1')
        .set('x-api-key', 'teste-m2m-token')
        .send({ usuario_id: 1, descricao: 'Atualizada', valor: '150,00' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(repo.updateLancamento).toHaveBeenCalledWith(1, 1, expect.objectContaining({
        descricao: 'Atualizada',
        valor: 150,
      }));
    });
  });

  // ============================================================================
  // DELETE /api/v1/integracao/lancamentos/:id
  // ============================================================================
  describe('DELETE /api/v1/integracao/lancamentos/:id', () => {
    test('deve bloquear requisições sem x-api-key (401)', async () => {
      const res = await request(app).delete('/api/v1/integracao/lancamentos/1').send({ usuario_id: 1 });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Acesso Negado');
    });

    test('deve retornar 400 se usuario_id estiver ausente', async () => {
      const res = await request(app)
        .delete('/api/v1/integracao/lancamentos/1')
        .set('x-api-key', 'teste-m2m-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('deve retornar 400 se id for inválido', async () => {
      const res = await request(app)
        .delete('/api/v1/integracao/lancamentos/abc')
        .set('x-api-key', 'teste-m2m-token')
        .send({ usuario_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('deve retornar 404 se lançamento não existir', async () => {
      repo.getLancamento.mockResolvedValue(null);
      const res = await request(app)
        .delete('/api/v1/integracao/lancamentos/999')
        .set('x-api-key', 'teste-m2m-token')
        .send({ usuario_id: 1 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('deve deletar e retornar 200', async () => {
      repo.getLancamento.mockResolvedValue({ id: 1, descricao: 'Conta' });
      repo.deleteLancamento.mockResolvedValue();

      const res = await request(app)
        .delete('/api/v1/integracao/lancamentos/1')
        .set('x-api-key', 'teste-m2m-token')
        .send({ usuario_id: 1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(repo.deleteLancamento).toHaveBeenCalledWith(1, 1);
    });
  });
});
