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

let consoleLogSpy;

beforeEach(() => {
  jest.clearAllMocks();
  cache.clear();
  // Suprime logs de DEBUG (ex: getDistinctTerceiros) para output limpo
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy.mockRestore();
});

describe('getDataModular', () => {
  test('deve retornar dados consolidados com chamadas em paralelo', async () => {
    const mockTotais = { totalrendas: 5000, totalcontas: 3000, faltapagar: 1000, saldoprevisto: 2000 };
    // Fase 2.5: FIXA e CARTAO vêm de UMA query merged; o código separa pelo campo `tipo`
    const mockFixas = [{ id: 1, descricao: 'Aluguel', tipo: 'FIXA' }];
    const mockCartao = [{ id: 2, descricao: 'Netflix', tipo: 'CARTAO' }];
    const mockResumoPessoas = [{ pessoa: 'Mae', total: 55.9, todospagos: 0 }];
    const mockTerceirosRows = [{ id: 5, descricao: 'Conta', total_count: '1' }];
    const mockDistintos = [{ nometerceiro: 'Mae' }, { nometerceiro: 'Pai' }];
    // Fase 2.5: queries auxiliares vêm de UMA CTE única (colunas tipo/fonte/row_data)
    const auxRows = [
      { tipo: 'mes_fechado', fonte: 'mes_fechado', row_data: 'false' },
      { tipo: 'fatura_manual', fonte: 'fatura_manual', row_data: '0' },
    ];

    // getDashboardDataModular dispara 6 db.query em paralelo, nesta ordem:
    db.query
      .mockResolvedValueOnce({ rows: [mockTotais] }) // 1. getDashboardTotais
      .mockResolvedValueOnce({ rows: [...mockFixas, ...mockCartao] }) // 2. FIXA+CARTAO merged
      .mockResolvedValueOnce({ rows: mockResumoPessoas }) // 3. getResumoPessoas
      .mockResolvedValueOnce({ rows: mockTerceirosRows }) // 4. getDadosTerceiros
      .mockResolvedValueOnce({ rows: auxRows }) // 5. getAuxQueries (CTE)
      .mockResolvedValueOnce({ rows: mockDistintos }); // 6. getDistinctTerceiros

    const result = await lancamentoRepo.getDashboardDataModular(1, 3, 2026, 'Douglas');

    expect(result.totais).toEqual(mockTotais);
    expect(result.fixas).toEqual(mockFixas);
    expect(result.cartao).toEqual(mockCartao);
    expect(result.resumoPessoas).toEqual(mockResumoPessoas);
    expect(result.mesFechado).toBe(false);
    expect(result.faturaManualVal).toBe(0);
    expect(result.terceirosDistinct).toEqual(['Mae', 'Pai']);
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
