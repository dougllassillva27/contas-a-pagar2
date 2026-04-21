// ==============================================================================
// 🧪 TESTES UNITÁRIOS — TokenRepository
// Mock do db e validação de todas as funções de token persistente
// ==============================================================================

// Mock do módulo db ANTES de importar o repository
jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const db = require('../../src/config/db');
const TokenRepository = require('../../src/repositories/TokenRepository');

beforeEach(() => {
  jest.clearAllMocks();
});

// ==============================================================================
// gerarToken
// ==============================================================================
describe('gerarToken', () => {
  test('deve gerar um token hexadecimal de 64 caracteres', () => {
    const token = TokenRepository.gerarToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  test('deve gerar tokens únicos a cada chamada', () => {
    const token1 = TokenRepository.gerarToken();
    const token2 = TokenRepository.gerarToken();
    expect(token1).not.toBe(token2);
  });
});

// ==============================================================================
// criarToken
// ==============================================================================
describe('criarToken', () => {
  const mockToken = 'abc123def456'.padEnd(64, '0');
  const hashedToken = require('crypto').createHash('sha256').update(mockToken).digest('hex');
  const mockExpiresAt = new Date('2026-07-17T00:00:00.000Z');

  beforeEach(() => {
    // Mock do crypto para retornar token previsível
    jest.spyOn(require('crypto'), 'randomBytes').mockReturnValue(Buffer.from(mockToken, 'hex'));
    // Mock da data para expiração previsível
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-17').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('deve inserir token no banco e retornar dados formatados', async () => {
    db.query.mockResolvedValue({
      rows: [{ ExpiresAt: mockExpiresAt }],
    });

    const result = await TokenRepository.criarToken(1, 90);

    expect(db.query).toHaveBeenCalledTimes(1);
    const [query, params] = db.query.mock.calls[0];
    expect(query).toContain('INSERT INTO TokensPersistentes');
    expect(params).toEqual(expect.arrayContaining([1, hashedToken, expect.any(Date)]));

    const returnedToken = result.Token || result.token;
    const returnedExpiresAt = result.ExpiresAt || result.expiresAt;
    expect(returnedToken).toBe(mockToken);
    expect(returnedExpiresAt).toEqual(mockExpiresAt);
  });

  test('deve usar 90 dias como padrão de expiração', async () => {
    db.query.mockResolvedValue({ rows: [{ ExpiresAt: mockExpiresAt }] });

    await TokenRepository.criarToken(1);

    const [, params] = db.query.mock.calls[0];
    const expiresAt = params[2];
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + 90);
    expect(expiresAt.getTime()).toBeCloseTo(expectedDate.getTime(), -2);
  });
});

// ==============================================================================
// validarToken
// ==============================================================================
describe('validarToken', () => {
  test('deve retornar usuário quando token é válido e não expirado', async () => {
    const mockUser = { Id: 1, Nome: 'Dodo', Login: 'dodo' };
    const hashedToken = require('crypto').createHash('sha256').update('valid-token').digest('hex');
    db.query.mockResolvedValue({ rows: [mockUser] });

    const result = await TokenRepository.validarToken('valid-token');

    expect(result).toEqual(mockUser);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), expect.arrayContaining([hashedToken]));
  });

  test('deve retornar null quando token não existe', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const result = await TokenRepository.validarToken('invalid-token');

    expect(result).toBeNull();
  });

  test('deve retornar null quando token está expirado', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const result = await TokenRepository.validarToken('expired-token');

    expect(result).toBeNull();
    const [query] = db.query.mock.calls[0];
    expect(query).toContain('DataExpiracao > NOW()');
  });
});

// ==============================================================================
// revogarToken
// ==============================================================================
describe('revogarToken', () => {
  test('deve deletar o token do banco', async () => {
    db.query.mockResolvedValue({ rowCount: 1 });
    const hashedToken = require('crypto').createHash('sha256').update('token-to-revoke').digest('hex');

    await TokenRepository.revogarToken('token-to-revoke');

    expect(db.query).toHaveBeenCalledTimes(1);
    const [query, params] = db.query.mock.calls[0];
    expect(query).toContain('DELETE FROM TokensPersistentes');
    expect(params).toEqual([hashedToken]);
  });

  test('deve funcionar mesmo se token não existir', async () => {
    db.query.mockResolvedValue({ rowCount: 0 });

    await expect(TokenRepository.revogarToken('nonexistent')).resolves.not.toThrow();
  });
});

// ==============================================================================
// limparTokensExpirados
// ==============================================================================
describe('limparTokensExpirados', () => {
  test('deve deletar tokens expirados e retornar contador', async () => {
    db.query.mockResolvedValue({ rowCount: 5 });

    const result = await TokenRepository.limparTokensExpirados();

    expect(result).toBe(5);
    const [query] = db.query.mock.calls[0];
    expect(query).toContain('DELETE FROM TokensPersistentes');
    expect(query).toContain('DataExpiracao < NOW()');
  });

  test('deve retornar 0 se nenhum token for deletado', async () => {
    db.query.mockResolvedValue({ rowCount: 0 });

    const result = await TokenRepository.limparTokensExpirados();

    expect(result).toBe(0);
  });
});

// ==============================================================================
// renovarToken
// ==============================================================================
describe('renovarToken', () => {
  const mockExpiresAt = new Date('2026-07-17T00:00:00.000Z');
  const hashedToken = require('crypto').createHash('sha256').update('renewed-token').digest('hex');

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-17').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('deve estender expiração de token válido e retornar dados atualizados', async () => {
    db.query.mockResolvedValue({
      rows: [{ ExpiresAt: mockExpiresAt }],
    });

    const result = await TokenRepository.renovarToken('renewed-token', 90);

    expect(result).toEqual({
      Token: 'renewed-token',
      token: 'renewed-token',
      ExpiresAt: mockExpiresAt,
      expiresAt: mockExpiresAt,
    });
    const [query, params] = db.query.mock.calls[0];
    expect(query).toContain('UPDATE TokensPersistentes');
    expect(query).toContain('SET DataExpiracao = $2');
    expect(params[0]).toBe(hashedToken);
    expect(params[1]).toBeInstanceOf(Date);
  });

  test('deve retornar null se token não for encontrado ou estiver inválido', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const result = await TokenRepository.renovarToken('invalid-token');

    expect(result).toBeNull();
  });

  test('deve usar 90 dias como padrão de renovação', async () => {
    db.query.mockResolvedValue({ rows: [{ ExpiresAt: mockExpiresAt }] });

    await TokenRepository.renovarToken('t');

    const [, params] = db.query.mock.calls[0];
    const newExpires = params[1];
    const expected = new Date();
    expected.setDate(expected.getDate() + 90);
    expect(newExpires.getTime()).toBeCloseTo(expected.getTime(), -2);
  });
});
