// ==============================================================================
// 🧪 TESTES UNITÁRIOS — UsuarioRepository
//
// Testa os métodos de consulta de usuários com mock do banco.
// Não precisa de banco real — usa jest.mock para simular o db.
// ==============================================================================

// Mock do módulo db ANTES de importar o repository
jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const db = require('../../src/config/db');
const { obterUsuarioPorLogin, getUsuarioById, criarUsuario, getTodosUsuarios } = require('../../src/repositories/UsuarioRepository');

// Limpa os mocks entre cada teste
beforeEach(() => {
  jest.clearAllMocks();
});

// ==========================================================================
// getTodosUsuarios
// ==========================================================================
describe('getTodosUsuarios', () => {
  test('retorna lista de usuários resumida', async () => {
    const usuariosFake = [{ id: 1, nome: 'Dodo' }, { id: 2, nome: 'Vitoria' }];
    db.query.mockResolvedValue({ rows: usuariosFake });

    const resultado = await getTodosUsuarios();

    expect(resultado).toEqual(usuariosFake);
    expect(db.query).toHaveBeenCalledWith('SELECT Id as id, Nome as nome FROM Usuarios');
  });

  test('retorna array vazio e loga erro em caso de falha', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    db.query.mockRejectedValue(new Error('DB Error'));

    const resultado = await getTodosUsuarios();

    expect(resultado).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ==========================================================================
// criarUsuario
// ==========================================================================
describe('criarUsuario', () => {
  test('insere novo usuário e retorna os dados', async () => {
    const novoUser = { id: 3, nome: 'Novo', login: 'novo', senhahash: 'hash' };
    db.query.mockResolvedValue({ rows: [novoUser] });

    const resultado = await criarUsuario('Novo', 'novo', 'hash');

    expect(resultado).toEqual(novoUser);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO Usuarios'),
      ['Novo', 'novo', 'hash']
    );
  });
});

// ==========================================================================
// obterUsuarioPorLogin
// ==========================================================================
describe('obterUsuarioPorLogin', () => {
  test('retorna o usuário quando encontrado', async () => {
    const usuarioFake = { id: 1, nome: 'Dodo', login: 'dodo' };
    db.query.mockResolvedValue({ rows: [usuarioFake] });

    const resultado = await obterUsuarioPorLogin('dodo');

    expect(resultado).toEqual(usuarioFake);
    expect(db.query).toHaveBeenCalledWith('SELECT * FROM Usuarios WHERE Login = $1', ['dodo']);
  });

  test('retorna undefined quando não encontrado', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const resultado = await obterUsuarioPorLogin('inexistente');

    expect(resultado).toBeUndefined();
  });

  test('retorna null e loga erro quando o banco falha', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    db.query.mockRejectedValue(new Error('Connection refused'));

    const resultado = await obterUsuarioPorLogin('dodo');

    expect(resultado).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Erro ao buscar usuário por login:', 'Connection refused');
    consoleSpy.mockRestore();
  });
});

// ==========================================================================
// getUsuarioById
// ==========================================================================
describe('getUsuarioById', () => {
  test('retorna o usuário quando encontrado pelo ID', async () => {
    const usuarioFake = { id: 2, nome: 'Vitoria', login: 'vitoria' };
    db.query.mockResolvedValue({ rows: [usuarioFake] });

    const resultado = await getUsuarioById(2);

    expect(resultado).toEqual(usuarioFake);
    expect(db.query).toHaveBeenCalledWith('SELECT * FROM Usuarios WHERE Id = $1', [2]);
  });

  test('retorna undefined quando ID não existe', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const resultado = await getUsuarioById(999);

    expect(resultado).toBeUndefined();
  });

  test('retorna null e loga erro quando o banco falha', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    db.query.mockRejectedValue(new Error('Timeout'));

    const resultado = await getUsuarioById(1);

    expect(resultado).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Erro ao buscar usuário por ID:', 'Timeout');
    consoleSpy.mockRestore();
  });
});
