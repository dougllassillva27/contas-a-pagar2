// ==============================================================================
// 🧪 TESTES — Middleware de normalização de path
// Causa raiz do incidente 30/09: o Apps Script montava a URL com barra dupla
// (`//api/v1/integracao/copiar-mensal`), que não casava a rota montada e
// escapava para o CSRF global → 403.
// ==============================================================================

const request = require('supertest');
const express = require('express');
const normalizePath = require('../../src/middlewares/normalizePath');

function setupApp() {
  const app = express();
  app.use(normalizePath);

  app.post('/api/v1/integracao/copiar-mensal', (req, res) =>
    res.json({ success: true, url: req.url })
  );
  app.get('/api/health', (req, res) => res.json({ ok: true, url: req.url }));

  return app;
}

describe('normalizePath', () => {
  test('colapsa barra dupla no início: //api/... → /api/...', async () => {
    const res = await request(setupApp()).post('//api/v1/integracao/copiar-mensal').send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.url).toBe('/api/v1/integracao/copiar-mensal');
  });

  test('colapsa barras duplas internas', async () => {
    const res = await request(setupApp()).post('/api//v1///integracao/copiar-mensal').send({});

    expect(res.status).toBe(200);
    expect(res.body.url).toBe('/api/v1/integracao/copiar-mensal');
  });

  test('preserva a query string ao normalizar', async () => {
    const res = await request(setupApp()).get('//api/health?mes=10&ano=2026');

    expect(res.status).toBe(200);
    expect(res.body.url).toBe('/api/health?mes=10&ano=2026');
  });

  test('não altera rotas legítimas (sem barra dupla)', async () => {
    const res = await request(setupApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.url).toBe('/api/health');
  });
});
