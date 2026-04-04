const request = require('supertest');
const app = require('../../src/app');
const repo = require('../../src/repositories/FinanceiroRepository');

// Mockamos o repositório inteiro para não precisarmos de um banco de dados real rodando!
jest.mock('../../src/repositories/FinanceiroRepository');

describe('Integração API (Mocked DB)', () => {
  let agent;

  beforeAll(async () => {
    agent = request.agent(app);

    // Simula um usuário válido para o login e a criação de token
    repo.getUsuarioById.mockResolvedValue({ id: 1, nome: 'Dodo', login: 'dodo' });
    repo.criarToken.mockResolvedValue({ token: 'fake-token' });

    // Fazemos o login para preencher a sessão do Supertest
    await agent.post('/login').send({ password: process.env.SENHA_MESTRA });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Testes para a rota de atualização em lote
  // ==========================================================================
  describe('POST /api/lancamentos/conferido-extrato-lote', () => {
    test('deve marcar múltiplos lançamentos como conferidos', async () => {
      // Simula que o banco atualizou 3 linhas com sucesso
      repo.updateConferidoExtratoLote.mockResolvedValue(3);

      const res = await agent
        .post('/api/lancamentos/conferido-extrato-lote')
        .send({ ids: [10, 11, 12], conferido: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.updated).toBe(3);
      expect(repo.updateConferidoExtratoLote).toHaveBeenCalledWith(1, [10, 11, 12], true);
    });

    test('deve desmarcar múltiplos lançamentos', async () => {
      repo.updateConferidoExtratoLote.mockResolvedValue(3);

      const res = await agent
        .post('/api/lancamentos/conferido-extrato-lote')
        .send({ ids: [10, 11, 12], conferido: false });

      expect(res.status).toBe(200);
      expect(repo.updateConferidoExtratoLote).toHaveBeenCalledWith(1, [10, 11, 12], false);
    });
  });

  // ==========================================================================
  // Testes para a funcionalidade de Mês Fechado (Month Lock)
  // ==========================================================================
  describe('Mes Fechado (Month Lock)', () => {
    const testMonth = 12;
    const testYear = 2099;

    test('POST /api/meses-fechados/toggle - deve trancar o mês com sucesso', async () => {
      // Simula que a ação de toggle retornou true (trancado)
      repo.toggleMesFechado.mockResolvedValue(true);

      const res = await agent.post('/api/meses-fechados/toggle').send({ month: testMonth, year: testYear });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mesFechado).toBe(true);
      expect(repo.toggleMesFechado).toHaveBeenCalledWith(1, testMonth, testYear);
    });

    test('POST /api/lancamentos - deve retornar erro 403 ao tentar lançar conta em mês fechado', async () => {
      // Simula que o mês JÁ ESTÁ fechado
      repo.isMesFechado.mockResolvedValue(true);

      const res = await agent.post('/api/lancamentos').send({
        descricao: 'Tentativa de Fraude',
        valor: '100',
        tipo_transacao: 'CONTA',
        sub_tipo: 'Única',
        context_month: testMonth,
        context_year: testYear,
      });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Este mês está fechado para novos lançamentos.');
    });

    test('POST /api/meses-fechados/toggle - deve reabrir o mês com sucesso', async () => {
      // Simula que a ação de toggle retornou false (aberto)
      repo.toggleMesFechado.mockResolvedValue(false);

      const res = await agent.post('/api/meses-fechados/toggle').send({ month: testMonth, year: testYear });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mesFechado).toBe(false);
    });
  });
});
