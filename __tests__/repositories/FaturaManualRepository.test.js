// ==============================================================================
// 🧪 TESTES UNITÁRIOS — FaturaManualRepository
//
// Testa a camada de dados da Fatura Manual (Leitura e UPSERT).
// Mock do banco de dados para simular comportamento sem conexão real.
//
// Para rodar APENAS este arquivo:
//   npx jest __tests__/repositories/FaturaManualRepository.test.js
// ==============================================================================

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const db = require('../../src/config/db');
const repo = require('../../src/repositories/FaturaManualRepository');

beforeEach(() => {
  jest.clearAllMocks();
});

// ==============================================================================
// getFaturaManual — Verifica a leitura do valor
// ==============================================================================

describe('getFaturaManual', () => {
  test('deve retornar o valor da fatura quando encontrado', async () => {
    db.query.mockResolvedValue({
      rows: [{ valor: 1500.75 }],
    });

    const resultado = await repo.getFaturaManual(1, 10, 2026);

    expect(resultado).toBe(1500.75);
    expect(db.query).toHaveBeenCalledWith(
      'SELECT Valor FROM FaturaManual WHERE UsuarioId = $1 AND Mes = $2 AND Ano = $3',
      [1, 10, 2026]
    );
  });

  test('deve retornar 0 se a fatura não existir (array vazio)', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const resultado = await repo.getFaturaManual(1, 10, 2026);

    expect(resultado).toBe(0);
  });

  test('deve retornar 0 se o valor retornado for null ou inválido', async () => {
    db.query.mockResolvedValue({ rows: [{ valor: null }] });

    const resultado = await repo.getFaturaManual(1, 10, 2026);

    expect(resultado).toBe(0);
  });

  test('deve capturar erros do banco e retornar 0 silenciosamente', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    db.query.mockRejectedValue(new Error('Erro de conexão'));

    const resultado = await repo.getFaturaManual(1, 10, 2026);

    expect(resultado).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ==============================================================================
// saveFaturaManual — Verifica o salvamento (UPSERT)
// ==============================================================================

describe('saveFaturaManual', () => {
  test('deve inserir ou atualizar o valor via ON CONFLICT', async () => {
    db.query.mockResolvedValue({});

    await repo.saveFaturaManual(1, 10, 2026, 2000.5);

    expect(db.query).toHaveBeenCalledTimes(1);

    const [query, params] = db.query.mock.calls[0];
    expect(query).toContain('INSERT INTO FaturaManual');
    expect(query).toContain('ON CONFLICT (UsuarioId, Mes, Ano) DO UPDATE');
    expect(params).toEqual([1, 10, 2026, 2000.5]);
  });

  test('deve aceitar valores inteiros e decimais', async () => {
    db.query.mockResolvedValue({});

    await repo.saveFaturaManual(1, 5, 2026, 100);

    const params = db.query.mock.calls[0][1];
    expect(params[3]).toBe(100);
  });
});
