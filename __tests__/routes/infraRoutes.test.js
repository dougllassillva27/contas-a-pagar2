// ==============================================================================
// 🧪 TESTES DE INTEGRAÇÃO — infraRoutes
//
// Testa health check e ping sem dependência de banco real.
//
// Para rodar APENAS este arquivo:
//   npx jest __tests__/routes/infraRoutes.test.js
// ==============================================================================

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const db = require('../../src/config/db');
const infraRoutes = require('../../src/routes/infraRoutes');

const app = express();
app.use('/', infraRoutes);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /ping', () => {
  test('deve retornar 200 com status ok e serviço', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('contas-a-pagar');
    expect(res.body).toHaveProperty('timestamp');
  });
});

// /health público enxuto: só status (uptime/latência ficam no /health/internal,
// hardening de 02/10 — era vazamento de informações operacionais)
describe('GET /health (público)', () => {
  test('deve retornar 200 quando banco está online', async () => {
    db.query.mockResolvedValueOnce({});
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).not.toHaveProperty('uptime');
    expect(db.query).toHaveBeenCalledWith('SELECT 1');
  });

  test('deve retornar 503 quando banco está offline', async () => {
    db.query.mockRejectedValueOnce(new Error('Connection refused'));
    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
  });
});

// IP simulado como localhost para passar no gate do /health/internal
const originalIp = Symbol('originalIp');

function appComIpLocal() {
  const app = express();
  app.use((req, _res, next) => {
    Object.defineProperty(req, 'ip', { value: '127.0.0.1', configurable: true });
    next();
  });
  app.use('/', infraRoutes);
  return app;
}

describe('GET /health/internal (localhost only)', () => {
  test('deve retornar 200 com detalhes quando banco está online', async () => {
    const app = appComIpLocal();
    db.query.mockResolvedValueOnce({});
    const res = await request(app).get('/health/internal');

    expect(res.status).toBe(200);
    expect(res.body.app).toBe('online');
    expect(res.body.db).toBe('online');
    expect(res.body.latency_ms).toBeGreaterThanOrEqual(0);
    expect(db.query).toHaveBeenCalledWith('SELECT 1');
  });

  test('deve retornar 503 quando banco está offline', async () => {
    const app = appComIpLocal();
    db.query.mockRejectedValueOnce(new Error('Connection refused'));
    const res = await request(app).get('/health/internal');

    expect(res.status).toBe(503);
    expect(res.body.app).toBe('online');
    expect(res.body.db).toBe('offline');
    expect(res.body.status).toBe('error');
  });

  test('deve incluir métricas de uptime na resposta', async () => {
    const app = appComIpLocal();
    db.query.mockResolvedValueOnce({});
    const res = await request(app).get('/health/internal');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body.uptime).toMatch(/\d+d \d+h \d+m \d+s/);
  });

  test('deve bloquear IP externo com 403', async () => {
    const app = express();
    app.use((req, _res, next) => {
      Object.defineProperty(req, 'ip', { value: '203.0.113.10', configurable: true });
      next();
    });
    app.use('/', infraRoutes);
    const res = await request(app).get('/health/internal');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });
});
