// ==============================================================================
// 🧪 TESTES UNITÁRIOS — MesFechadoRepository
// ==============================================================================

const db = require('../../src/config/db');
const { isMesFechado, toggleMesFechado } = require('../../src/repositories/MesFechadoRepository');

// Mockamos o pool de conexões do banco de dados
jest.mock('../../src/config/db');

describe('MesFechadoRepository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isMesFechado', () => {
    test('deve retornar true se o mês estiver trancado (registro existente)', async () => {
      // Simula o DB retornando 1 linha (mês está na tabela)
      db.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await isMesFechado(1, 4, 2026);
      expect(result).toBe(true);
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [1, 4, 2026]);
    });

    test('deve retornar false se o mês estiver aberto (registro inexistente)', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 0 });
      const result = await isMesFechado(1, 4, 2026);
      expect(result).toBe(false);
    });
  });

  describe('toggleMesFechado', () => {
    test('deve fechar o mês (inserir) caso ele esteja aberto', async () => {
      // A primeira query é o SELECT (isMesFechado) -> Retorna 0
      db.query.mockResolvedValueOnce({ rowCount: 0 });
      // A segunda query é o INSERT -> Mock vazio
      db.query.mockResolvedValueOnce({});

      const result = await toggleMesFechado(1, 4, 2026);
      expect(result).toBe(true); // Status resultante: Fechado
    });

    test('deve reabrir o mês (deletar) caso ele esteja fechado', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 1 }); // SELECT -> Existe
      db.query.mockResolvedValueOnce({}); // DELETE -> Remove
      const result = await toggleMesFechado(1, 4, 2026);
      expect(result).toBe(false); // Status resultante: Aberto
    });
  });
});
