// ==============================================================================
// 🧪 TESTES UNITÁRIOS — BackupRepository
//
// Testa a exportação de dados para backup JSON.
// Mock do banco de dados para simular comportamento sem conexão real.
//
// Para rodar APENAS este arquivo:
//   npx jest __tests__/repositories/BackupRepository.test.js
// ==============================================================================

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const db = require('../../src/config/db');
const repo = require('../../src/repositories/BackupRepository');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getAllDataForBackup', () => {
  test('deve retornar objeto estruturado com lançamentos e anotações do usuário', async () => {
    const mockLancamentos = [{ id: 1, descricao: 'Netflix', valor: 50 }];
    const mockAnotacoes = [{ id: 1, conteudo: 'Anotação de teste' }];

    db.query.mockResolvedValueOnce({ rows: mockLancamentos }).mockResolvedValueOnce({ rows: mockAnotacoes });

    const resultado = await repo.getAllDataForBackup(1);

    expect(resultado).toHaveProperty('backup_date');
    expect(resultado.lancamentos).toEqual(mockLancamentos);
    expect(resultado.anotacoes).toEqual(mockAnotacoes);

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      'SELECT * FROM Lancamentos WHERE UsuarioId = $1 ORDER BY DataVencimento DESC, Id DESC',
      [1]
    );
    expect(db.query).toHaveBeenNthCalledWith(2, 'SELECT * FROM Anotacoes WHERE UsuarioId = $1', [1]);
  });

  test('deve retornar arrays vazios se usuário não possuir dados', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const resultado = await repo.getAllDataForBackup(99);

    expect(resultado.lancamentos).toEqual([]);
    expect(resultado.anotacoes).toEqual([]);
    expect(db.query).toHaveBeenCalledTimes(2);
  });
});
