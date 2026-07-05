/**
 * Teste de duplicação de lançamentos
 *
 * Objetivo: Verificar se a remoção do ON CONFLICT DO NOTHING causa erro esperado
 * ao inserir dois lançamentos idênticos (mesmo usuario, descricao, tipo, valor, data)
 */

const request = require('supertest');

// Mock do TelegramBot para evitar "Open Handles" de rede na inicialização do app
jest.mock('node-telegram-bot-api', () => {
  return jest.fn().mockImplementation(() => ({
    setMyCommands: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
  }));
});

jest.mock('../../src/middlewares/rateLimiter', () => ({
  loginLimiter: (req, res, next) => next(),
  apiLimiter: (req, res, next) => next(),
}));

const app = require('../../src/app');
const repo = require('../../src/repositories/FinanceiroRepository');
const bcrypt = require('bcrypt');

// Mockamos o repositório inteiro para não precisarmos de um banco de dados real rodando!
jest.mock('../../src/repositories/FinanceiroRepository');

// Precisamos mockar o DB também, pois as rotas de terceiros fazem chamadas diretas ao db.query
jest.mock('../../src/config/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

// Mock do syncService para evitar "Open Handles" no Jest após o fire-and-forget (otimização de performance)
jest.mock('../../src/services/syncService', () => ({
  sincronizarFaturaMorr: jest.fn().mockResolvedValue(),
  sincronizarDivisaoCasa: jest.fn().mockResolvedValue(),
}));

describe('Teste de Duplicação de Lançamentos (Mocked DB)', () => {
  let agent;

  beforeAll(async () => {
    agent = request.agent(app);

    // Cria um hash real rápido para o teste passar na validação do bcrypt
    const testHash = bcrypt.hashSync('senha_teste', 4);
    repo.obterUsuarioPorLogin.mockImplementation(async (login) => {
      if (login === 'dodo') return { id: 1, nome: 'Dodo', login: 'dodo', senhahash: testHash };
      return null;
    });
    repo.criarToken.mockResolvedValue({ token: 'fake-token' });
    repo.isMesFechado.mockResolvedValue(false);
    repo.getConfiguracoes.mockResolvedValue({ divisao_casa_minimo: '750.00', regras_sync: [] });

    // Fazemos o login para preencher a sessão do Supertest
    await agent.post('/login').send({ password: 'senha_teste' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Deve permitir duas inserções idênticas sem ON CONFLICT DO NOTHING', async () => {
    // Configura o mock do db.query para simular sucesso nas inserções
    const db = require('../../src/config/db');
    db.query.mockResolvedValue({ rows: [] });

    const lancamentoDados = {
      descricao: 'Teste Duplicacao Netflix',
      valor: '55.90',
      tipo_transacao: 'CONTA',
      sub_tipo: 'Única',
      nome_terceiro: 'Mae',
      context_month: 7,
      context_year: 2026,
    };

    // Primeira inserção
    const res1 = await agent.post('/api/lancamentos').send(lancamentoDados);
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    // Segunda inserção idêntica
    const res2 = await agent.post('/api/lancamentos').send(lancamentoDados);
    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);

    // Verifica que foram feitas duas chamadas INSERT
    const insertCalls = db.query.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO Lancamentos')
    );
    expect(insertCalls.length).toBeGreaterThanOrEqual(2);
  });
});
