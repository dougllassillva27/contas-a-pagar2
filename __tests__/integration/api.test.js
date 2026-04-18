const request = require('supertest');
const app = require('../../src/app');
const repo = require('../../src/repositories/FinanceiroRepository');
const bcrypt = require('bcryptjs');

// Mockamos o repositório inteiro para não precisarmos de um banco de dados real rodando!
jest.mock('../../src/repositories/FinanceiroRepository');

// Precisamos mockar o DB também, pois as rotas de terceiros fazem chamadas diretas ao db.query
jest.mock('../../src/config/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

describe('Integração API (Mocked DB)', () => {
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

    // Fazemos o login para preencher a sessão do Supertest
    await agent.post('/login').send({ password: 'senha_teste' });
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

  // ==========================================================================
  // Testes de Renderização de Views (Dashboard e Terceiros)
  // ==========================================================================
  describe('Renderização de Views (GET / e GET /terceiros)', () => {
    beforeEach(() => {
      // Configura retornos padrão blindados para evitar crashes de null pointer no render do EJS
      repo.getDashboardTotals.mockResolvedValue({ totalrendas: 0, totalcontas: 0, faltapagar: 0, saldoprevisto: 0 });
      repo.getLancamentosPorTipo.mockResolvedValue([]);
      repo.getAnotacoes.mockResolvedValue({ conteudo: '' });
      repo.getResumoPessoas.mockResolvedValue([]);
      repo.getOrdemCards.mockResolvedValue([]);
      repo.getFaturaManual.mockResolvedValue(0);
      repo.isMesFechado.mockResolvedValue(false);
      repo.getDistinctTerceiros.mockResolvedValue([]);
    });

    test('GET / - deve buscar as anotações globais (0, 0) por padrão na inicialização', async () => {
      repo.getDadosTerceiros.mockResolvedValue([]);

      const res = await agent.get('/');

      expect(res.status).toBe(200);
      // Verifica se a injeção via SSR alterou de mês atual para Mês Global (0, 0)
      expect(repo.getAnotacoes).toHaveBeenCalledWith(1, 0, 0);
    });

    test('GET /terceiros - deve filtrar nomes nulos (contas próprias) para evitar Erro 500 na ordenação', async () => {
      // Simula o retorno bruto do banco onde a conta própria retorna nometerceiro = null
      repo.getDadosTerceiros.mockResolvedValue([
        { nometerceiro: 'Mae', status: 'PENDENTE', tipo: 'CARTAO', valor: 100 },
        { nometerceiro: null, status: 'PENDENTE', tipo: 'FIXA', valor: 50 }, // Conta própria (causadora do crash)
        { nometerceiro: '   ', status: 'PAGO', tipo: 'CARTAO', valor: 30 }, // Cadastro com espaço em branco
      ]);

      const res = await agent.get('/terceiros');

      // O sucesso (200) prova que o erro "Cannot read properties of null (reading 'localeCompare')" foi interceptado pelo .filter()
      expect(res.status).toBe(200);
      // O HTML retornado deve ser renderizado apenas com os cards válidos
      expect(res.text).toContain('Mae');
      expect(res.text).not.toContain('null');
    });
  });
});
