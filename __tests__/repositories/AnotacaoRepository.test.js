// ==============================================================================
// 🧪 TESTES UNITÁRIOS — AnotacaoRepository
//
// Testa a camada de dados do Bloco de Notas (Leitura e UPSERT).
// Mock do banco de dados para simular comportamento sem conexão real.
//
// Para rodar APENAS este arquivo:
//   npx jest __tests__/repositories/AnotacaoRepository.test.js
// ==============================================================================

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

const db = require('../../src/config/db');
const repo = require('../../src/repositories/AnotacaoRepository');

beforeEach(() => {
  jest.clearAllMocks();
});

// ==============================================================================
// getAnotacoes — Verifica a leitura das anotações
// ==============================================================================

describe('getAnotacoes', () => {
  test('deve retornar o conteúdo da anotação quando encontrado', async () => {
    db.query.mockResolvedValue({
      rows: [{ conteudo: 'Minha anotação de teste' }],
    });

    const resultado = await repo.getAnotacoes(1, 4, 2026);

    expect(resultado).toBe('Minha anotação de teste');
    expect(db.query).toHaveBeenCalledWith(
      'SELECT Conteudo FROM Anotacoes WHERE UsuarioId = $1 AND Mes = $2 AND Ano = $3 LIMIT 1',
      [1, 4, 2026]
    );
  });

  test('deve retornar string vazia se nenhuma anotação existir', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const resultado = await repo.getAnotacoes(1, 4, 2026);

    expect(resultado).toBe('');
  });
});

// ==============================================================================
// updateAnotacoes — Verifica o salvamento (UPSERT)
// ==============================================================================

describe('updateAnotacoes', () => {
  test('deve inserir ou atualizar a anotação via ON CONFLICT', async () => {
    db.query.mockResolvedValue({ rowCount: 1 });

    await repo.updateAnotacoes(1, 4, 2026, 'Nova anotação');

    expect(db.query).toHaveBeenCalledTimes(1);

    const [query, params] = db.query.mock.calls[0];
    expect(query).toContain('INSERT INTO Anotacoes');
    expect(query).toContain('ON CONFLICT');
    expect(params).toEqual([1, 4, 2026, 'Nova anotação']);
  });

  test('deve lidar com textos longos (verificação de parâmetros)', async () => {
    const textoLongo = 'A'.repeat(1000);
    db.query.mockResolvedValue({});

    await repo.updateAnotacoes(2, 0, 2026, textoLongo);

    const params = db.query.mock.calls[0][1];
    expect(params[3]).toBe(textoLongo);
  });
});
