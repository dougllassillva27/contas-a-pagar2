// ==============================================================================
// 🧪 TESTES DE INTEGRAÇÃO — calcularLuzRoutes (Refatorado e Blindado)
// ==============================================================================

const request = require('supertest');
const express = require('express');

// 1. Mock do DB Nativo (Cobre rotas que executam SQL direto bypassando o repository)
jest.mock('../../../src/config/db', () => ({
  query: jest.fn(),
}));

// 2. Mock do repository ANTES de importar o roteador
jest.mock('../../../src/repositories/FinanceiroRepository', () => ({
  getRegistrosLuz: jest.fn(),
  criarRegistroLuz: jest.fn(),
  deletarRegistroLuz: jest.fn(),
}));

const db = require('../../../src/config/db');
const repo = require('../../../src/repositories/FinanceiroRepository');
const calcularLuzRoutes = require('../../../src/modules/calcularLuz/calcularLuzRoutes');

// 3. Fábrica do App de Teste (Isolado e Resiliente)
function setupTestApp() {
  const app = express();
  app.use(express.json());

  // Middleware que simula a sessão perfeita (evita 500 por variáveis undefined)
  app.use((req, res, next) => {
    req.session = { user: { id: 1, nome: 'Teste', login: 'teste' } };
    next();
  });

  // Monta o roteador diretamente na raiz. Assim evitamos conflitos de 404.
  app.use('/', calcularLuzRoutes);

  // Error handler final para capturar exceções internas (ex: TypeError) e devolvê-las no JSON
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message, stack: err.stack });
  });

  return app;
}

describe('Módulo Calcular Luz - Suíte Refatorada', () => {
  let agent;
  let endpoints = { get: '/', post: '/', delete: '/1' };

  beforeAll(() => {
    const app = setupTestApp();
    agent = request(app);

    // 4. Introspecção do Roteador (Lê os caminhos reais diretamente da memória do Express)
    const stack = calcularLuzRoutes.stack || [];
    const rGet = stack.find((l) => l.route && l.route.methods.get);
    const rPost = stack.find((l) => l.route && l.route.methods.post);
    const rDel = stack.find((l) => l.route && l.route.methods.delete);

    if (rGet) endpoints.get = rGet.route.path;
    if (rPost) endpoints.post = rPost.route.path;
    if (rDel) endpoints.delete = rDel.route.path.replace(/:[^\/]+/, '1');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // TESTES DE SUCESSO (Caminho Feliz)
  // ============================================================================

  test('GET - deve retornar lista de registros (200)', async () => {
    repo.getRegistrosLuz.mockResolvedValue([{ id: 1, mes_referencia: '04/2026', consumo_kwh: 150 }]);
    // Cobre o cenário real onde a rota usa db.query direto
    db.query.mockResolvedValue({ rows: [{ id: 1, mes_referencia: '04/2026', consumo_kwh: 150 }] });

    const res = await agent.get(endpoints.get).query({ month: 4, year: 2026 });

    // Se falhar no servidor, o throw abaixo imprime o motivo real no terminal do Jest!
    if (res.status === 500) throw new Error(`Falha Interna API: ${JSON.stringify(res.body)}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST - deve criar novo registro (200/201)', async () => {
    repo.criarRegistroLuz.mockResolvedValue({ id: 1, consumo_kwh: 150 });
    // Adicionado usuario_id para blindar a resposta
    db.query.mockResolvedValue({ rows: [{ id: 1, usuario_id: 1, consumo_kwh: 150 }], rowCount: 1 });

    // Payload ultra-abrangente para garantir o match exato das chaves obrigatórias
    // seja em snake_case, camelCase ou desmembrado (month/year)
    const payload = {
      mes_referencia: '04/2026',
      mesReferencia: '04/2026',
      month: 4,
      year: 2026,
      leitura_anterior: 1000,
      leituraAnterior: 1000,
      leitura_atual: 1150,
      leituraAtual: 1150,
      consumo_kwh: 150,
      valor_estimado: 120.5,
    };
    const res = await agent.post(endpoints.post).send(payload);

    if (res.status >= 400) throw new Error(`Falha POST: ${res.status} - ${JSON.stringify(res.body)}`);

    expect([200, 201]).toContain(res.status); // Aceita ambas as respostas de sucesso
  });

  test('DELETE - deve deletar registro (200/204)', async () => {
    repo.deletarRegistroLuz.mockResolvedValue(true);
    // Retorna usuario_id: 1 para passar no SELECT pré-exclusão
    db.query.mockResolvedValue({ rows: [{ id: 1, usuario_id: 1 }], rowCount: 1 });

    const res = await agent.delete(endpoints.delete);

    if (res.status >= 400) throw new Error(`Falha DELETE: ${res.status} - ${JSON.stringify(res.body)}`);

    expect([200, 204]).toContain(res.status);
  });

  // ============================================================================
  // TESTES DE EXCEÇÃO E VALIDAÇÃO (Caminho Triste)
  // ============================================================================

  test('GET - deve retornar erro 500 se o DB falhar', async () => {
    repo.getRegistrosLuz.mockRejectedValue(new Error('Simulacao DB Error'));
    db.query.mockRejectedValue(new Error('Simulacao DB Error'));

    const res = await agent.get(endpoints.get).query({ month: 4, year: 2026 });

    expect(res.status).toBe(500);
  });

  test('POST - deve rejeitar requisição sem dados obrigatórios (400)', async () => {
    const res = await agent.post(endpoints.post).send({}); // Envia vazio propositalmente

    expect(res.status).toBe(400); // Valida apenas o status, ignorando o texto exato da mensagem
  });
});
