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
  temLancamentosCopiaveis: jest.fn().mockResolvedValue(false),
  getTodosUsuarios: jest.fn().mockResolvedValue([{ id: 1, nome: 'Teste' }]),
  getLancamento: jest.fn(),
  updateLancamento: jest.fn(),
  deleteLancamento: jest.fn(),
  getLancamentosPorFiltro: jest.fn(),
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

// O limiter real (20 req/15min por IP) bloquearia a suíte inteira (429).
// O rate limiting tem teste próprio em __tests__/middlewares/rateLimiter.test.js.
jest.mock('../../src/middlewares/rateLimiter', () => ({
  integracaoLimiter: (req, res, next) => next(),
}));

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

  // ============================================================================
  // POST /api/v1/integracao/copiar-mensal — automação mensal (timer local)
  // ============================================================================
  describe('POST /api/v1/integracao/copiar-mensal', () => {
    // 15/10/2026 12:00 BRT — meio do mês: resultado independe do fuso do runner
    const HOJE = new Date('2026-10-15T15:00:00Z');
    const TIMERS_REAIS = [
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask',
      'performance', 'hrtime', 'requestAnimationFrame', 'cancelAnimationFrame',
      'requestIdleCallback', 'cancelIdleCallback',
    ];

    beforeEach(() => {
      jest.useFakeTimers({ now: HOJE, doNotFake: TIMERS_REAIS });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('bloqueia requisições sem x-api-key (401)', async () => {
      const res = await request(app).post('/api/v1/integracao/copiar-mensal').send({});

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Acesso Negado');
    });

    test('copia e retorna contexto do mês destino, resumo por usuário e total', async () => {
      repo.getTodosUsuarios.mockResolvedValue([
        { id: 1, nome: 'Dodo' },
        { id: 2, nome: 'Vitoria' },
      ]);
      repo.copyMonth.mockResolvedValue({ copiados: 3, resetados: 1 });

      const res = await request(app)
        .post('/api/v1/integracao/copiar-mensal')
        .set('x-api-key', 'teste-m2m-token')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.contexto).toEqual({ mes: 11, ano: 2026 });
      expect(res.body.usuarios).toEqual([
        { nome: 'Dodo', status: 'copiado', copiados: 3, resetados: 1 },
        { nome: 'Vitoria', status: 'copiado', copiados: 3, resetados: 1 },
      ]);
      expect(res.body.total).toEqual({ usuarios: 2, copiados: 6, ja_copiado: 0, erros: 0 });

      // Sempre do mês corrente para o seguinte
      expect(repo.copyMonth).toHaveBeenCalledWith(1, 10, 2026);
      expect(repo.copyMonth).toHaveBeenCalledWith(2, 10, 2026);
    });

    test('marca ja_copiado e não copia de novo quando o mês destino já tem lançamentos copiáveis', async () => {
      repo.getTodosUsuarios.mockResolvedValue([
        { id: 1, nome: 'Dodo' },
        { id: 2, nome: 'Vitoria' },
      ]);
      repo.temLancamentosCopiaveis.mockImplementation(async (id) => id === 1);
      repo.copyMonth.mockResolvedValue({ copiados: 3, resetados: 0 });

      const res = await request(app)
        .post('/api/v1/integracao/copiar-mensal')
        .set('x-api-key', 'teste-m2m-token')
        .send({});

      expect(res.status).toBe(200);
      expect(repo.temLancamentosCopiaveis).toHaveBeenCalledWith(1, 11, 2026);
      expect(repo.temLancamentosCopiaveis).toHaveBeenCalledWith(2, 11, 2026);

      expect(res.body.usuarios).toEqual([
        { nome: 'Dodo', status: 'ja_copiado', copiados: 0, resetados: 0 },
        { nome: 'Vitoria', status: 'copiado', copiados: 3, resetados: 0 },
      ]);
      expect(res.body.total).toEqual({ usuarios: 2, copiados: 3, ja_copiado: 1, erros: 0 });

      // Só o usuário 2 é efetivamente copiado
      expect(repo.copyMonth).toHaveBeenCalledTimes(1);
      expect(repo.copyMonth).toHaveBeenCalledWith(2, 10, 2026);
    });

    test('registra erro por usuário sem interromper os demais', async () => {
      repo.getTodosUsuarios.mockResolvedValue([
        { id: 1, nome: 'Dodo' },
        { id: 2, nome: 'Vitoria' },
      ]);
      repo.temLancamentosCopiaveis.mockResolvedValue(false);
      repo.copyMonth
        .mockRejectedValueOnce(new Error('deadlock detected'))
        .mockResolvedValueOnce({ copiados: 2, resetados: 0 });

      const res = await request(app)
        .post('/api/v1/integracao/copiar-mensal')
        .set('x-api-key', 'teste-m2m-token')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.usuarios[0]).toEqual({
        nome: 'Dodo',
        status: 'erro',
        copiados: 0,
        resetados: 0,
        error: 'deadlock detected',
      });
      expect(res.body.usuarios[1]).toEqual({
        nome: 'Vitoria',
        status: 'copiado',
        copiados: 2,
        resetados: 0,
      });
      expect(res.body.total).toEqual({ usuarios: 2, copiados: 2, ja_copiado: 0, erros: 1 });
    });

    test('não dispara mais notificação Telegram no endpoint (quem notifica é o timer)', async () => {
      global.fetch = jest.fn();

      const res = await request(app)
        .post('/api/v1/integracao/copiar-mensal')
        .set('x-api-key', 'teste-m2m-token')
        .send({});

      expect(res.status).toBe(200);
      expect(global.fetch).not.toHaveBeenCalled();

      delete global.fetch;
    });
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

  // ============================================================================
  // GET /api/v1/integracao/lancamentos
  // ============================================================================
  describe('GET /api/v1/integracao/lancamentos', () => {
    test('deve bloquear requisições sem x-api-key (401)', async () => {
      const res = await request(app).get('/api/v1/integracao/lancamentos').query({ usuario_id: 1 });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Acesso Negado');
    });

    test('deve retornar 400 se usuario_id estiver ausente', async () => {
      const res = await request(app)
        .get('/api/v1/integracao/lancamentos')
        .set('x-api-key', 'teste-m2m-token');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('deve retornar 400 se usuario_id for inválido', async () => {
      const res = await request(app)
        .get('/api/v1/integracao/lancamentos')
        .set('x-api-key', 'teste-m2m-token')
        .query({ usuario_id: 'abc' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('deve buscar por descricao e retornar 200', async () => {
      repo.getLancamentosPorFiltro.mockResolvedValue([
        { id: 10, descricao: 'Conta de luz', valor: 150, tipo: 'CARTAO', status: 'PENDENTE', nometerceiro: null },
      ]);

      const res = await request(app)
        .get('/api/v1/integracao/lancamentos')
        .set('x-api-key', 'teste-m2m-token')
        .query({ usuario_id: 1, descricao: 'conta de luz' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(10);
      expect(repo.getLancamentosPorFiltro).toHaveBeenCalledWith(1, expect.objectContaining({ descricao: 'conta de luz' }));
    });

    test('deve buscar por mes e ano e retornar 200', async () => {
      repo.getLancamentosPorFiltro.mockResolvedValue([
        { id: 11, descricao: 'Netflix', valor: 50, tipo: 'FIXA', status: 'PENDENTE', nometerceiro: null },
      ]);

      const res = await request(app)
        .get('/api/v1/integracao/lancamentos')
        .set('x-api-key', 'teste-m2m-token')
        .query({ usuario_id: 1, mes: 9, ano: 2026 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(repo.getLancamentosPorFiltro).toHaveBeenCalledWith(1, expect.objectContaining({ mes: 9, ano: 2026 }));
    });

    test('deve retornar lista vazia quando não houver resultados', async () => {
      repo.getLancamentosPorFiltro.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/integracao/lancamentos')
        .set('x-api-key', 'teste-m2m-token')
        .query({ usuario_id: 1, descricao: 'inexistente' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    test('deve listar ultimos lancamentos sem filtros adicionais', async () => {
      repo.getLancamentosPorFiltro.mockResolvedValue([
        { id: 12, descricao: 'Teste', valor: 10, tipo: 'CARTAO', status: 'PENDENTE', nometerceiro: null },
      ]);

      const res = await request(app)
        .get('/api/v1/integracao/lancamentos')
        .set('x-api-key', 'teste-m2m-token')
        .query({ usuario_id: 1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(repo.getLancamentosPorFiltro).toHaveBeenCalledWith(1, {});
    });
  });
});
