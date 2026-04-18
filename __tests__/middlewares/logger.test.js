// ==============================================================================
// 🧪 TESTES UNITÁRIOS — requestLogger middleware
//
// Testa o middleware de logging de requisições sem precisar do Express real.
// Usa mocks para simular req, res e next.
//
// Para rodar APENAS este arquivo:
//   npx jest __tests__/middlewares/logger.test.js
// ==============================================================================

const express = require('express');
const request = require('supertest');
const requestLogger = require('../../src/middlewares/logger');

describe('requestLogger middleware', () => {
  let app;
  let consoleLogSpy;

  beforeEach(() => {
    app = express();
    // Mock do console.log para capturar os logs sem poluir o output dos testes
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  // ==============================================================================
  // Testes de sucesso (status 2xx)
  // ==============================================================================

  test('deve logar requisição com método, URL, status e duração', async () => {
    app.use(requestLogger);
    app.get('/test', (req, res) => res.status(200).json({ ok: true }));

    await request(app).get('/test');

    // Verifica se o log foi chamado com o formato esperado
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/✅ GET \/test 200 \d+ms/));
  });

  test('deve logar requisição POST com corpo JSON', async () => {
    app.use(requestLogger);
    app.use(express.json());
    app.post('/api/lancamentos', (req, res) => res.status(201).json({ id: 1 }));

    await request(app).post('/api/lancamentos').send({ descricao: 'Teste', valor: 100 });

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/✅ POST \/api\/lancamentos 201 \d+ms/));
  });

  // ==============================================================================
  // Testes de erro client-side (status 4xx)
  // ==============================================================================

  test('deve logar erro 4xx com ícone de alerta ⚠️', async () => {
    app.use(requestLogger);
    app.get('/not-found', (req, res) => res.status(404).json({ error: 'Not found' }));

    await request(app).get('/not-found');

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/⚠️ GET \/not-found 404 \d+ms/));
  });

  test('deve logar erro 400 Bad Request', async () => {
    app.use(requestLogger);
    app.post('/api/validate', (req, res) => res.status(400).json({ error: 'Invalid' }));

    await request(app).post('/api/validate').send({ invalid: true });

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/⚠️ POST \/api\/validate 400 \d+ms/));
  });

  // ==============================================================================
  // Testes de erro server-side (status 5xx)
  // ==============================================================================

  test('deve logar erro 5xx com ícone de erro ❌', async () => {
    app.use(requestLogger);
    app.get('/error', (req, res) => res.status(500).json({ error: 'Server error' }));

    await request(app).get('/error');

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/❌ GET \/error 500 \d+ms/));
  });

  test('deve logar erro 503 Service Unavailable', async () => {
    app.use(requestLogger);
    app.get('/health', (req, res) => res.status(503).json({ status: 'unavailable' }));

    await request(app).get('/health');

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/❌ GET \/health 503 \d+ms/));
  });

  // ==============================================================================
  // Testes de arquivos estáticos (devem ser ignorados)
  // ==============================================================================

  test('deve ignorar arquivos .css', async () => {
    app.use(requestLogger);
    app.get('/style.css', (req, res) => res.status(200).send('body { color: red; }'));

    await request(app).get('/style.css');

    // Não deve logar para arquivos estáticos
    const cssLogs = consoleLogSpy.mock.calls.filter((call) => call[0]?.includes('/style.css'));
    expect(cssLogs).toHaveLength(0);
  });

  test('deve ignorar arquivos .js', async () => {
    app.use(requestLogger);
    app.get('/app.js', (req, res) => res.status(200).send('console.log("hi")'));

    await request(app).get('/app.js');

    const jsLogs = consoleLogSpy.mock.calls.filter((call) => call[0]?.includes('/app.js'));
    expect(jsLogs).toHaveLength(0);
  });

  test('deve ignorar outros arquivos estáticos (.ico, .png, .woff, .woff2)', async () => {
    app.use(requestLogger);

    const staticPaths = ['/favicon.ico', '/icons/icon.png', '/fonts/inter.woff', '/fonts/inter.woff2'];

    for (const path of staticPaths) {
      consoleLogSpy.mockClear();
      app.get(path, (req, res) => res.status(200).send(''));
      await request(app).get(path);

      const logs = consoleLogSpy.mock.calls.filter((call) => call[0]?.includes(path));
      expect(logs).toHaveLength(0);
    }
  });

  // ==============================================================================
  // Testes de URL e query params
  // ==============================================================================

  test('deve logar requisições com query params na URL original', async () => {
    app.use(requestLogger);
    app.get('/api/search', (req, res) => res.status(200).json({ results: [] }));

    await request(app).get('/api/search?q=test&page=1');

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/✅ GET \/api\/search\?q=test&page=1 200 \d+ms/));
  });

  test('deve usar req.originalUrl para capturar a URL completa', async () => {
    app.use(requestLogger);
    app.get('/relatorio', (req, res) => res.status(200).send('OK'));

    await request(app).get('/relatorio?month=3&year=2026');

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('/relatorio?month=3&year=2026'));
  });

  // ==============================================================================
  // Testes de duração e performance
  // ==============================================================================

  test('deve incluir duração em milissegundos no log', async () => {
    app.use(requestLogger);
    // Simula uma requisição com pequeno delay
    app.get('/slow', (req, res) => {
      setTimeout(() => res.status(200).json({ ok: true }), 10);
    });

    await request(app).get('/slow');

    // Verifica se o log contém o padrão de duração (número seguido de "ms")
    const logCall = consoleLogSpy.mock.calls.find((call) => call[0]?.includes('/slow'));
    expect(logCall[0]).toMatch(/\d+ms$/);
  });
});
