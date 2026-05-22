// ==============================================================================
// 🧪 TESTES UNITÁRIOS — DB Config
// ==============================================================================

jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn(),
    on: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mPool),
    types: {
      setTypeParser: jest.fn(),
    },
  };
});

const { Pool } = require('pg');
const db = require('../../src/config/db');

describe('Configuração de Banco de Dados (db.js)', () => {
  test('deve exportar query e getClient', () => {
    expect(typeof db.query).toBe('function');
    expect(typeof db.getClient).toBe('function');
  });

  test('deve configurar o pool com client_encoding UTF8 e propriedades de timeout', () => {
    expect(Pool).toHaveBeenCalled();
    // Valida o primeiro argumento passado para o construtor do Pool
    const config = Pool.mock.calls[0][0];
    expect(config).toHaveProperty('client_encoding', 'UTF8');
    expect(config).toHaveProperty('max', 10);
    expect(config).toHaveProperty('idleTimeoutMillis', 30000);
    expect(config).toHaveProperty('connectionTimeoutMillis', 5000);
  });

  test('deve registrar um manipulador de erro no pool', () => {
    const mockPoolInstance = Pool.mock.results[0].value;
    expect(mockPoolInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
  });
});
