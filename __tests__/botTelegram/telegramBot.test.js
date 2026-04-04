// ==============================================================================
// 🧪 TESTES UNITÁRIOS E INTEGRAÇÃO — telegramBot.js
// ==============================================================================

const TelegramBot = require('node-telegram-bot-api');
const { criarBot } = require('../../src/modules/botTelegram/telegramBot');
const conversationManager = require('../../src/modules/botTelegram/conversationManager');

// Mockamos as dependências externas para não conectarem de verdade
jest.mock('node-telegram-bot-api');
jest.mock('../../src/modules/botTelegram/conversationManager');

describe('Telegram Bot - Funcionalidades e Travas', () => {
  let botInstance;
  let mockRepo;
  let messageHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Interceptamos a instância do TelegramBot para roubar o 'messageHandler' (que escuta o chat)
    botInstance = {
      on: jest.fn((event, handler) => {
        if (event === 'message') messageHandler = handler;
      }),
      sendMessage: jest.fn(),
    };
    TelegramBot.mockImplementation(() => botInstance);

    // Mockamos o Banco de Dados
    mockRepo = {
      isMesFechado: jest.fn(),
      addLancamento: jest.fn(),
    };

    // Criamos o bot passando as dependências falsas
    criarBot({ token: 'fake-token', chatIdPermitido: '12345', repo: mockRepo });
  });

  describe('Trava de Mês Fechado (Month Lock)', () => {
    const dadosSimulados = {
      usuarioId: 1,
      descricao: 'Conta Teste',
      valor: 100,
      tipo: 'fixa',
    };

    beforeEach(() => {
      // Simulamos que o usuário já respondeu todas as perguntas e está na etapa de finalizar
      conversationManager.obterConversa.mockReturnValue({ etapa: 'TERCEIRO', dados: {} });
      conversationManager.avancarConversa.mockReturnValue(null); // null = Fim das perguntas
      conversationManager.finalizarConversa.mockReturnValue(dadosSimulados); // Devolve o payload montado
    });

    test('deve BLOQUEAR a inserção e avisar o usuário caso o mês esteja fechado', async () => {
      mockRepo.isMesFechado.mockResolvedValue(true); // 🔒 Mês Fechado!

      // Simulamos a mensagem do usuário digitando o último dado
      await messageHandler({ chat: { id: 12345 }, text: 'Pular' });

      // Verificações
      expect(mockRepo.isMesFechado).toHaveBeenCalled();
      expect(mockRepo.addLancamento).not.toHaveBeenCalled(); // Não pode ter salvo no banco!
      expect(botInstance.sendMessage).toHaveBeenCalledWith(
        '12345',
        expect.stringContaining('Acesso Negado'),
        expect.any(Object)
      );
    });

    test('deve PERMITIR a inserção e salvar no banco caso o mês esteja aberto', async () => {
      mockRepo.isMesFechado.mockResolvedValue(false); // 🔓 Mês Aberto!
      await messageHandler({ chat: { id: 12345 }, text: 'Pular' });

      expect(mockRepo.addLancamento).toHaveBeenCalled(); // Sucesso! Salvou no banco.
    });
  });
});
