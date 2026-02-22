// ==============================================================================
// 🧪 TESTES DE INTEGRAÇÃO — Rotas da API
//
// Usa o Supertest para simular requisições HTTP reais ao Express.
// O app é importado SEM iniciar o servidor (graças ao module.exports).
//
// 💡 O QUE É INTEGRAÇÃO?
// Diferente dos testes unitários (que testam funções isoladas),
// aqui testamos o sistema "de ponta a ponta" — o Express recebe a
// requisição, passa pelo middleware, chama a rota, e retorna a resposta.
//
// ⚠️ ATENÇÃO: Estes testes acessam o banco de dados REAL (Neon).
// Para rodar, você precisa estar com o .env configurado.
//
// Para rodar APENAS este arquivo:
//   npx jest __tests__/integration/api.test.js
// ==============================================================================

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');

// Fecha a conexão com o banco ao terminar todos os testes
// (evita o warning "worker process has failed to exit gracefully")
afterAll(async () => {
  await db.end();
});

// ==========================================================================
// Health Check — rota pública (não precisa de login)
// ==========================================================================
describe('GET /health', () => {
  test('retorna status 200 e JSON com status "ok"', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

// ==========================================================================
// Rotas protegidas — sem login devem redirecionar
// ==========================================================================
describe('Rotas protegidas (sem login)', () => {
  test('GET / redireciona para /login', async () => {
    const res = await request(app).get('/');

    // Express retorna 302 (redirect) para /login
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('GET /api/rendas redireciona para /login', async () => {
    const res = await request(app).get('/api/rendas');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('GET /api/backup redireciona para /login', async () => {
    const res = await request(app).get('/api/backup');

    expect(res.status).toBe(302);
  });
});

// ==========================================================================
// API de Integração Android — autenticação via token
// ==========================================================================
describe('POST /api/v1/integracao/lancamentos', () => {
  test('sem token retorna 401', async () => {
    const res = await request(app).post('/api/v1/integracao/lancamentos').send({ descricao: 'Teste', valor: '100' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Acesso Negado');
  });

  test('com token errado retorna 401', async () => {
    const res = await request(app).post('/api/v1/integracao/lancamentos').set('x-api-key', 'token-invalido').send({ descricao: 'Teste', valor: '100' });

    expect(res.status).toBe(401);
  });
});

// ==========================================================================
// Login — rota pública
// ==========================================================================
describe('Login', () => {
  test('GET /login retorna 200 (página de login)', async () => {
    const res = await request(app).get('/login');

    expect(res.status).toBe(200);
    // Verifica que o HTML contém o formulário de login
    expect(res.text).toContain('Entrar no Sistema');
  });

  test('POST /login com senha errada não redireciona para /', async () => {
    const res = await request(app).post('/login').send({ password: 'senha-errada' });

    // Pode retornar 200 (re-renderiza login com erro) ou 302 mas NÃO para "/"
    expect(res.headers.location).not.toBe('/');
  });
});

// ==========================================================================
// Fluxo completo: Login → Dashboard → API
// ==========================================================================
describe('Fluxo autenticado', () => {
  let agent;

  // Antes de todos os testes deste bloco, faz login
  beforeAll(async () => {
    agent = request.agent(app); // agent mantém cookies/sessão entre requests
    await agent.post('/login').send({ password: process.env.SENHA_MESTRA });
  });

  test('GET / após login retorna 200 (dashboard)', async () => {
    const res = await agent.get('/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Painel');
  });

  test('GET /api/dashboard/totals retorna os 4 totais', async () => {
    const res = await agent.get('/api/dashboard/totals?month=2&year=2026');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalrendas');
    expect(res.body).toHaveProperty('totalcontas');
    expect(res.body).toHaveProperty('faltapagar');
    expect(res.body).toHaveProperty('saldoprevisto');
    // Verifica que são números
    expect(typeof res.body.totalrendas).toBe('number');
  });

  test('GET /api/lancamentos/recentes retorna array', async () => {
    const res = await agent.get('/api/lancamentos/recentes');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/rendas retorna array', async () => {
    const res = await agent.get('/api/rendas?month=2&year=2026');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
