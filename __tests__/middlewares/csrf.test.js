// ==============================================================================
// 🧪 TESTES — Middleware CSRF
// Garante que a isenção de /api/v1/integracao/* é explícita e que o CSRF
// continua valendo em TODAS as outras rotas.
// ==============================================================================

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { csrfProtect } = require('../../src/middlewares/csrf');

function setupApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'teste-csrf', resave: false, saveUninitialized: true }));
  app.use(csrfProtect);

  // Expõe o token da sessão para o teste (como os templates EJS fazem)
  app.get('/csrf-token', (req, res) => res.json({ token: res.locals.csrfToken }));

  // Rota de integração M2M (isenção explícita)
  app.post('/api/v1/integracao/copiar-mensal', (req, res) => res.json({ success: true }));

  // Rota normal do app (CSRF obrigatório)
  app.post('/api/lancamentos', (req, res) => res.json({ success: true }));

  return app;
}

describe('csrfProtect', () => {
  let agent;

  beforeEach(() => {
    agent = request.agent(setupApp());
  });

  test('isenta POST /api/v1/integracao/* do token CSRF', async () => {
    const res = await agent.post('/api/v1/integracao/copiar-mensal').send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('continua bloqueando rota normal sem token CSRF (403)', async () => {
    const res = await agent.post('/api/lancamentos').send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Token CSRF inválido');
  });

  test('aceita rota normal quando o token CSRF é válido', async () => {
    const { body } = await agent.get('/csrf-token');
    expect(typeof body.token).toBe('string');

    const res = await agent
      .post('/api/lancamentos')
      .set('x-csrf-token', body.token)
      .send({});

    expect(res.status).toBe(200);
  });
});
