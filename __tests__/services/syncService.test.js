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
      getTotalTerceiroParaDivisaoCasa: jest.fn(),
      findAndUpdateOrCreateContaFixa: jest.fn(),
      bulkUpsertContasFixas: jest.fn(),
    };
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('deve processar regra COPIAR_CONTAS corretamente', async () => {
    const valorEsperado = 1200.50;
    mockRepo.getTotalTerceiroCartao.mockResolvedValue(valorEsperado);

    const regras = [
      {
        tipo: 'COPIAR_CONTAS',
        terceiroOrigem: 'Morr',
        usuarioDestino: 2,
        contaDestino: 'Cartão Douglas'
      }
    ];

    await syncService.executarSincronizacaoDinamica(mockRepo, 1, 5, 2026, regras);

    expect(mockRepo.getTotalTerceiroCartao).toHaveBeenCalledWith('Morr', 1, 5, 2026);
    expect(mockRepo.findAndUpdateOrCreateContaFixa).toHaveBeenCalledWith(2, 'Cartão Douglas', valorEsperado, 5, 2026);
  });

  test('deve processar regra DIVISAO_CASA corretamente', async () => {
    // Lógica atual: base fixa 750 + metade do excedente acima de 1500 (2x base).
    // 2000 → excedente 500 / 2 = 250 → 750 + 250 = 1000 por conta.
    mockRepo.getTotalTerceiroParaDivisaoCasa.mockResolvedValue(2000);

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

    expect(mockRepo.getTotalTerceiroParaDivisaoCasa).toHaveBeenCalledWith('Casa', 1, 5, 2026);
    // bulkUpsertContasFixas chamado UMA vez no usuário origem (1) com 2 operações
    expect(mockRepo.bulkUpsertContasFixas).toHaveBeenCalledTimes(1);
    expect(mockRepo.bulkUpsertContasFixas).toHaveBeenCalledWith(1, expect.arrayContaining([
      expect.objectContaining({ nomeConta: 'Casa', valor: 1000, nomeTerceiro: null }),
      expect.objectContaining({ nomeConta: 'Casa', valor: 1000, nomeTerceiro: 'Morr' })
    ]));
  });

  test('deve respeitar o valor mínimo na DIVISAO_CASA', async () => {
    // 1000 <= limite da base (1500) → mantém base fixa de 750 por conta
    mockRepo.getTotalTerceiroParaDivisaoCasa.mockResolvedValue(1000);

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
    const regras = [{ tipo: 'COPIAR_CONTAS', ativo: false }];
    await syncService.executarSincronizacaoDinamica(mockRepo, 1, 5, 2026, regras);
    expect(mockRepo.getTotalTerceiroCartao).not.toHaveBeenCalled();
  });

  test('deve tratar erros de regras individuais sem quebrar o lote', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRepo.getTotalTerceiroCartao.mockRejectedValue(new Error('Erro Fatal'));

    const regras = [
      { tipo: 'COPIAR_CONTAS', terceiroOrigem: 'X', usuarioDestino: 2, contaDestino: 'Y' },
      { tipo: 'DESCONHECIDO' }
    ];

    await expect(syncService.executarSincronizacaoDinamica(mockRepo, 1, 5, 2026, regras)).resolves.not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });
});
