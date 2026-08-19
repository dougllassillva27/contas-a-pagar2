// ==============================================================================
// 🧪 TESTES UNITÁRIOS — ConfiguracaoRepository
// ==============================================================================

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const db = require('../../src/config/db');
const repo = require('../../src/repositories/ConfiguracaoRepository');
const cache = require('../../src/helpers/cacheHelpers');

describe('ConfiguracaoRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cache.clear(); // isola os testes do cache em memória do repositório
  });

  test('getConfiguracoes — deve retornar configurações do usuário', async () => {
    const mockConfig = { usuario_id: 1, divisao_casa_minimo: 750, regras_sync: [] };
    db.query.mockResolvedValue({ rows: [mockConfig] });

    const resultado = await repo.getConfiguracoes(1);

    expect(resultado).toEqual(mockConfig);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [1]);
  });

  test('saveConfiguracao — deve salvar chave permitida usando UPSERT', async () => {
    // rows vazio → getConfiguracoes retorna {} e o ramo de regras_sync é pulado,
    // restando apenas o UPSERT principal como chamada ao banco
    db.query.mockResolvedValue({ rows: [] });

    await repo.saveConfiguracao(1, 'divisao_casa_minimo', 800);

    // calls[0] é o SELECT do getConfiguracoes; localiza a chamada de UPSERT
    const insertCall = db.query.mock.calls.find(([q]) => q.includes('INSERT INTO configuracoes'));
    expect(insertCall).toBeDefined();
    const [query, params] = insertCall;
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
