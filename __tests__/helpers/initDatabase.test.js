// ==============================================================================
// 🧪 TESTES UNITÁRIOS — initDatabase
// ==============================================================================

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const db = require('../../src/config/db');
const initDatabase = require('../../src/helpers/initDatabase');

describe('initDatabase.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('deve rodar todos os scripts de criação (11 queries)', async () => {
    db.query.mockResolvedValue();
    await initDatabase();

    // Conta exata de queries no initDatabase.js
    expect(db.query).toHaveBeenCalledTimes(11);
    expect(console.log).toHaveBeenCalledWith('✅ Database inicializado com sucesso.');
  });

  test('deve capturar e logar erros se o banco falhar no startup', async () => {
    db.query.mockRejectedValueOnce(new Error('Falha de conexão'));
    await initDatabase();

    expect(console.error).toHaveBeenCalledWith('❌ Erro ao inicializar o database:', 'Falha de conexão');
  });
});
