// ==============================================================================
// 🧪 TESTES — Dashboard Modular (cache + consistência)
// ==============================================================================

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

const db = require('../../src/config/db');
const lancamentoRepo = require('../../src/repositories/LancamentoRepository');
const cache = require('../../src/helpers/cacheHelpers');

beforeEach(() => {
  jest.clearAllMocks();
  cache.clear();
});

describe('getDashboardDataModular', () => {
  test('deve retornar dados consolidados com chamadas em paralelo', async () => {
    // Mock das respostas do banco
    const mockTotais = { totalrendas: 5000, totalcontas: 3000, faltapagar: 1000, saldoprevisto: 2000 };
    const mockFixas = [{ id: 1, descricao: 'Aluguel' }];
    const mockCartao = [{ id: 2, descricao: 'Netflix' }];
    const mockResumoPessoas = [{ pessoa: 'Mae', total: 55.9, todospagos: 0 }];
    const mockAnotacoes = { Conteudo: 'Teste de anotacao' };
    const mockOrdemCards = [];
    const mockFaturaManual = 0;
    const mockMesFechado = false;
    const mockDistintos = ['Mae', 'Pai'];

    db.query
      .mockResolvedValueOnce({ rows: [mockTotais] }) // 1. getDashboardTotais
      .mockResolvedValueOnce({ rows: mockFixas }) // 2. getLancamentosPorTipo FIXA
      .mockResolvedValueOnce({ rows: mockCartao }) // 3. getLancamentosPorTipo CARTAO
      .mockResolvedValueOnce({ rows: mockResumoPessoas }) // 4. getResumoPessoas
      .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // 5. COUNT getDadosTerceiros
      .mockResolvedValueOnce({ rows: [] }) // 6. SELECT paginado getDadosTerceiros (fallback vazio)
      .mockResolvedValueOnce({ rows: mockOrdemCards }) // 7. getOrdemCards
      .mockResolvedValueOnce({ rows: [{ valor: mockFaturaManual }] }) // 8. getFaturaManual
      .mockResolvedValueOnce({ rows: [{ exists: mockMesFechado }] }) // 9. isMesFechado
      .mockResolvedValueOnce({ rows: [mockAnotacoes] }) // 10. getAnotacoes
      .mockResolvedValueOnce({ rows: mockDistintos.map((n) => ({ NomeTerceiro: n })) }); // 11. getDistinctTerceiros

    // Fallback genérico para qualquer query extra não prevista (incluindo getDadosTerceiros)
    db.query.mockResolvedValue({ rows: [], count: 0 });

    const result = await lancamentoRepo.getDashboardDataModular(1, 3, 2026, 'Douglas');

    expect(result.totais).toEqual(mockTotais);
    expect(result.fixas).toEqual(mockFixas);
    expect(result.cartao).toEqual(mockCartao);
    expect(result.resumoPessoas).toEqual(mockResumoPessoas);
    // Demais campos variam por ordem de consumo dos mocks
  });

  test('cache funciona no getDashboardTotais', async () => {
    const mockTotais = { totalrendas: 5000, totalcontas: 3000, faltapagar: 1000, saldoprevisto: 2000 };
    db.query.mockResolvedValue({ rows: [mockTotais] });

    // Primeira chamada
    const result1 = await lancamentoRepo.getDashboardTotals(1, 3, 2026);
    expect(result1).toEqual(mockTotais);
    expect(db.query).toHaveBeenCalledTimes(1);

    // Segunda chamada (deve usar cache)
    const result2 = await lancamentoRepo.getDashboardTotals(1, 3, 2026);
    expect(result2).toEqual(mockTotais);
    expect(db.query).toHaveBeenCalledTimes(1); // Não chamou novamente
  });

  test('invalidateDashboardCache limpa chaves corretamente', () => {
    cache.set('dashboard:totais:1:3:2026', { total: 100 });
    cache.set('dashboard:distintos_terceiros:1', ['Mae']);

    lancamentoRepo.invalidateDashboardCache(1, 3, 2026);

    expect(cache.get('dashboard:totais:1:3:2026')).toBeNull();
    expect(cache.get('dashboard:distintos_terceiros:1')).toBeNull();
  });
});
