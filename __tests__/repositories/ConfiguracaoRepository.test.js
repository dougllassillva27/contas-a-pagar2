// ==============================================================================
// 🧪 TESTES UNITÁRIOS — ConfiguracaoRepository
// ==============================================================================

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const db = require('../../src/config/db');
const repo = require('../../src/repositories/ConfiguracaoRepository');

describe('ConfiguracaoRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getConfiguracoes — deve retornar configurações do usuário', async () => {
    const mockConfig = { usuario_id: 1, divisao_casa_minimo: 750, regras_sync: [] };
    db.query.mockResolvedValue({ rows: [mockConfig] });

    const resultado = await repo.getConfiguracoes(1);

    expect(resultado).toEqual(mockConfig);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [1]);
  });

  test('saveConfiguracao — deve salvar chave permitida usando UPSERT', async () => {
    db.query.mockResolvedValue({});

    await repo.saveConfiguracao(1, 'divisao_casa_minimo', 800);

    const [query, params] = db.query.mock.calls[0];
    expect(query).toContain('INSERT INTO configuracoes');
    expect(query).toContain('ON CONFLICT (usuario_id) DO UPDATE');
    expect(params).toEqual([1, 800]);
  });

  test('saveConfiguracao — deve permitir salvar onboarding_completed', async () => {
    db.query.mockResolvedValue({});

    await repo.saveConfiguracao(1, 'onboarding_completed', true);

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1]).toEqual([1, true]);
  });

  test('saveConfiguracao — deve rejeitar chaves não permitidas', async () => {
    await expect(repo.saveConfiguracao(1, 'chave_maliciosa', 'valor')).rejects.toThrow('Chave de configuração inválida.');
    expect(db.query).not.toHaveBeenCalled();
  });
});
