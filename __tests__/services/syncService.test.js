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
      findAndUpdateOrCreateContaFixaComTerceiro: jest.fn(),
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
    // 1. Minha parte
    expect(mockRepo.findAndUpdateOrCreateContaFixaComTerceiro).toHaveBeenCalledWith(1, 'Casa', 1000, 5, 2026, null);
    // 2. Espelho no meu dashboard
    expect(mockRepo.findAndUpdateOrCreateContaFixaComTerceiro).toHaveBeenCalledWith(1, 'Casa', 1000, 5, 2026, 'Morr');
    // 3. Parte no dashboard do parceiro
    expect(mockRepo.findAndUpdateOrCreateContaFixaComTerceiro).toHaveBeenCalledWith(2, 'Casa', 1000, 5, 2026, null);
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

    expect(mockRepo.findAndUpdateOrCreateContaFixaComTerceiro).toHaveBeenCalledWith(1, 'Casa', 750, 5, 2026, null);
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
