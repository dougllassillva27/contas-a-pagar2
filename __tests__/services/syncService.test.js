// ==============================================================================
// 🧪 TESTES UNITÁRIOS — syncService
//
// Testa o serviço de sincronização automática entre usuários (Morr -> Cartão Douglas).
// Mock do repositório para validar chamadas de método.
//
// Para rodar APENAS este arquivo:
//   npx jest __tests__/services/syncService.test.js
// ==============================================================================

const syncService = require('../../src/services/syncService');

describe('syncService', () => {
  let mockRepo;
  let consoleLogSpy;

  beforeEach(() => {
    // Cria um mock do repositório com os métodos usados pelo serviço
    mockRepo = {
      getTotalTerceiroCartao: jest.fn(),
      findAndUpdateOrCreateContaFixa: jest.fn(),
    };

    // Espiona console.log para validar o log de sucesso
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test('deve sincronizar o valor total corretamente', async () => {
    const valorEsperado = 1500.75;

    // Configura o retorno do mock para captar o total
    mockRepo.getTotalTerceiroCartao.mockResolvedValue(valorEsperado);
    mockRepo.findAndUpdateOrCreateContaFixa.mockResolvedValue();

    // Executa o serviço: Dodo(1) -> Vitória(2), Mês 4/2026
    await syncService.sincronizarFaturaMorr(mockRepo, 1, 2, 4, 2026);

    // Verifica se chamou o repositório para buscar o total de 'Morr' do usuário 1
    expect(mockRepo.getTotalTerceiroCartao).toHaveBeenCalledWith('Morr', 1, 4, 2026);

    // Verifica se atualizou a conta 'Cartão Douglas' do usuário 2 com o valor correto
    expect(mockRepo.findAndUpdateOrCreateContaFixa).toHaveBeenCalledWith(2, 'Cartão Douglas', valorEsperado, 4, 2026);

    // Verifica o log de sucesso
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[SYNC]'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1500.75'));
  });

  test('deve tratar erros silenciosamente (não quebrar a aplicação)', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Simula falha na busca do total
    mockRepo.getTotalTerceiroCartao.mockRejectedValue(new Error('Falha na conexão'));

    // A função não deve lançar erro para fora
    await expect(syncService.sincronizarFaturaMorr(mockRepo, 1, 2, 4, 2026)).resolves.not.toThrow();

    // Deve logar o erro internamente
    expect(consoleErrorSpy).toHaveBeenCalledWith('[SYNC] Erro ao sincronizar fatura Morr:', 'Falha na conexão');

    consoleErrorSpy.mockRestore();
  });
});
