// ==============================================================================
// 🧪 TESTES UNITÁRIOS — syncService (Modernizado SaaS)
// ==============================================================================

const syncService = require('../../src/services/syncService');

describe('syncService (Dinâmico)', () => {
  let mockRepo;
  let consoleLogSpy;

  beforeEach(() => {
    mockRepo = {
      getTotalTerceiroCartao: jest.fn(),
      findAndUpdateOrCreateContaFixa: jest.fn(),
      bulkUpsertContasFixas: jest.fn(),
    };
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('deve processar regra COPIA_TOTAL corretamente', async () => {
    const valorEsperado = 1200.50;
    mockRepo.getTotalTerceiroCartao.mockResolvedValue(valorEsperado);
    
    const regras = [
      {
        tipo: 'COPIA_TOTAL',
        terceiroOrigem: 'Morr',
        usuarioDestino: 2,
        contaDestino: 'Cartão Douglas'
      }
    ];

    await syncService.executarSincronizacaoDinamica(mockRepo, 1, 5, 2026, regras);

    expect(mockRepo.getTotalTerceiroCartao).toHaveBeenCalledWith('Morr', 1, 5, 2026);
    expect(mockRepo.findAndUpdateOrCreateContaFixa).toHaveBeenCalledWith(2, 'Cartão Douglas', valorEsperado, 5, 2026);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[SYNC]'));
  });

  test('deve processar regra DIVISAO_CASA corretamente', async () => {
    mockRepo.getTotalTerceiroCartao.mockResolvedValue(2000); // 2000 / 2 = 1000

    const regras = [
      {
        tipo: 'DIVISAO_CASA',
        terceiroOrigem: 'Casa',
        usuarioDestino: 2,
        valorMinimo: 750,
        terceiroEspelhoNoOrigem: 'Morr'
      }
    ];

    await syncService.executarSincronizacaoDinamica(mockRepo, 1, 5, 2026, regras);

    expect(mockRepo.getTotalTerceiroCartao).toHaveBeenCalledWith('Casa', 1, 5, 2026);
    // bulkUpsertContasFixas chamado para sourceUserId e usuarioDestino
    expect(mockRepo.bulkUpsertContasFixas).toHaveBeenCalledTimes(2);
    // Verifica se chamou com o sourceUserId (1) primeiro
    expect(mockRepo.bulkUpsertContasFixas).toHaveBeenNthCalledWith(1, 1, expect.arrayContaining([
      expect.objectContaining({ nomeConta: 'Casa', valor: 1000 }),
      expect.objectContaining({ nomeConta: 'Casa', valor: 1000, nomeTerceiro: 'Morr' })
    ]));
    // Verifica se chamou com o usuarioDestino (2)
    expect(mockRepo.bulkUpsertContasFixas).toHaveBeenNthCalledWith(2, 2, expect.arrayContaining([
      expect.objectContaining({ nomeConta: 'Casa', valor: 1000 })
    ]));
  });

  test('deve respeitar o valor mínimo na DIVISAO_CASA', async () => {
    mockRepo.getTotalTerceiroCartao.mockResolvedValue(1000); // 1000 / 2 = 500 < 750

    const regras = [
      {
        tipo: 'DIVISAO_CASA',
        terceiroOrigem: 'Casa',
        usuarioDestino: 2,
        valorMinimo: 750
      }
    ];

    await syncService.executarSincronizacaoDinamica(mockRepo, 1, 5, 2026, regras);

    // bulkUpsertContasFixas deve ter sido chamado com valor mínimo (750)
    expect(mockRepo.bulkUpsertContasFixas).toHaveBeenCalled();
    const callArgs = mockRepo.bulkUpsertContasFixas.mock.calls[0];
    const operations = callArgs[1];
    expect(operations.some(op => op.valor === 750)).toBe(true);
  });

  test('deve ignorar regras inativas', async () => {
    const regras = [{ tipo: 'COPIA_TOTAL', ativo: false }];
    await syncService.executarSincronizacaoDinamica(mockRepo, 1, 5, 2026, regras);
    expect(mockRepo.getTotalTerceiroCartao).not.toHaveBeenCalled();
  });

  test('deve tratar erros de regras individuais sem quebrar o lote', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRepo.getTotalTerceiroCartao.mockRejectedValue(new Error('Erro Fatal'));

    const regras = [
      { tipo: 'COPIA_TOTAL', terceiroOrigem: 'X', usuarioDestino: 2, contaDestino: 'Y' },
      { tipo: 'DESCONHECIDO' }
    ];

    await expect(syncService.executarSincronizacaoDinamica(mockRepo, 1, 5, 2026, regras)).resolves.not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });
});
