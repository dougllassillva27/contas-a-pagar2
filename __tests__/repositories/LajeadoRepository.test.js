// ==============================================================================
// 🧪 TESTES UNITÁRIOS — LajeadoRepository
//
// Testa leitura e UPSERT de dados JSONB e Mural TEXT.
//
// Para rodar APENAS este arquivo:
//   npx jest __tests__/repositories/LajeadoRepository.test.js
// ==============================================================================

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const db = require('../../src/config/db');
const repo = require('../../src/repositories/LajeadoRepository');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getLajeado', () => {
  test('deve retornar registro quando existir', async () => {
    const mockLajeado = { id: 1, usuarioid: 1, dados: { mes: 'abril' }, mural: 'teste' };
    db.query.mockResolvedValue({ rows: [mockLajeado] });

    const resultado = await repo.getLajeado(1);
    expect(resultado).toEqual(mockLajeado);
    expect(db.query).toHaveBeenCalledWith('SELECT * FROM Lajeado WHERE UsuarioId = $1', [1]);
  });

  test('deve retornar undefined se não houver registro', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const resultado = await repo.getLajeado(2);
    expect(resultado).toBeUndefined();
  });
});

describe('saveLajeado', () => {
  test('deve executar UPSERT de dados JSONB', async () => {
    db.query.mockResolvedValue({});
    const dados = { douglas: { meses: [] } };
    await repo.saveLajeado(1, dados);

    const [query, params] = db.query.mock.calls[0];
    expect(query).toContain('INSERT INTO Lajeado (UsuarioId, Dados, AtualizadoEm)');
    expect(query).toContain('ON CONFLICT (UsuarioId)');
    expect(params).toEqual([1, dados]);
  });
});

describe('updateLajeadoMural', () => {
  test('deve executar UPSERT de texto no mural', async () => {
    db.query.mockResolvedValue({});
    await repo.updateLajeadoMural(1, 'Nova anotação');

    const [query, params] = db.query.mock.calls[0];
    expect(query).toContain('INSERT INTO Lajeado (UsuarioId, Mural, AtualizadoEm)');
    expect(query).toContain('ON CONFLICT (UsuarioId)');
    expect(params).toEqual([1, 'Nova anotação']);
  });
});
