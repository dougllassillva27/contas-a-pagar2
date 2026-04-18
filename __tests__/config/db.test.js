// ==============================================================================
// 🧪 TESTES UNITÁRIOS — DB Config
// ==============================================================================

jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn(),
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

  test('deve configurar o pool com client_encoding UTF8', () => {
    expect(Pool).toHaveBeenCalled();
    // Valida o primeiro argumento passado para o construtor do Pool
    const config = Pool.mock.calls[0][0];
    expect(config).toHaveProperty('client_encoding', 'UTF8');
  });
});
