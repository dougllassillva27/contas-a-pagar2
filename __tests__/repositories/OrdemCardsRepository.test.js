// ==============================================================================
// 🧪 TESTES UNITÁRIOS — OrdemCardsRepository
//
// Testa a leitura e a transação de atualização da ordem dos cards.
// Mock do banco de dados para simular comportamento sem conexão real.
//
// Para rodar APENAS este arquivo:
//   npx jest __tests__/repositories/OrdemCardsRepository.test.js
// ==============================================================================

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

const db = require('../../src/config/db');
const repo = require('../../src/repositories/OrdemCardsRepository');

beforeEach(() => {
  jest.clearAllMocks();
});

// ==============================================================================
// getOrdemCards — Verifica a leitura da ordem atual
// ==============================================================================

describe('getOrdemCards', () => {
  test('deve retornar lista ordenada por ordem ASC', async () => {
    const mockOrdem = [
      { id: 1, nome: 'Mãe', ordem: 0 },
      { id: 2, nome: 'Casa', ordem: 1 },
    ];

    db.query.mockResolvedValue({ rows: mockOrdem });

    const resultado = await repo.getOrdemCards(1);

    expect(resultado).toEqual(mockOrdem);
    expect(db.query).toHaveBeenCalledWith('SELECT * FROM OrdemCards WHERE UsuarioId = $1 ORDER BY Ordem ASC', [1]);
  });

  test('deve retornar array vazio se não houver cards', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const resultado = await repo.getOrdemCards(1);

    expect(resultado).toEqual([]);
  });
});

// ==============================================================================
// saveOrdemCards — Verifica a transação de salvamento
// ==============================================================================

describe('saveOrdemCards', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    db.getClient.mockResolvedValue(mockClient);
  });

  test('deve salvar a nova ordem usando transação (BEGIN -> DELETE -> INSERTs -> COMMIT)', async () => {
    const listaNomes = ['Mãe', 'Casa', 'Davi'];
    mockClient.query.mockResolvedValue({}); // Resolve todas as queries

    await repo.saveOrdemCards(1, listaNomes);

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM OrdemCards WHERE UsuarioId = $1', [1]);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

    // Verifica os INSERTs gerados dinamicamente
    // Espera-se 3 chamadas de INSERT (uma para cada nome)
    const insertCalls = mockClient.query.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO OrdemCards')
    );

    expect(insertCalls).toHaveLength(3);
    expect(insertCalls[0][1]).toEqual(['Mãe', 0, 1]);
    expect(insertCalls[1][1]).toEqual(['Casa', 1, 1]);
    expect(insertCalls[2][1]).toEqual(['Davi', 2, 1]);

    expect(mockClient.release).toHaveBeenCalled();
  });

  test('deve fazer ROLLBACK em caso de erro durante a transação', async () => {
    const listaNomes = ['Mãe'];

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // DELETE
      .mockRejectedValueOnce(new Error('Erro de Banco')); // INSERT falha

    await expect(repo.saveOrdemCards(1, listaNomes)).rejects.toThrow('Erro de Banco');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});
