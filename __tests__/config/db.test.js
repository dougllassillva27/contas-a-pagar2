// ==============================================================================
// 🧪 TESTES UNITÁRIOS — DB Config
// ==============================================================================

const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn();
const mockPoolQuery = jest.fn();

jest.mock('pg', () => {
  const mPool = {
    query: mockPoolQuery,
    connect: mockConnect,
    on: jest.fn(),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0,
  };
  return {
    Pool: jest.fn(() => mPool),
    types: {
      setTypeParser: jest.fn(),
    },
  };
});

const { Pool } = require('pg');

describe('Configuração de Banco de Dados (db.js)', () => {
  test('deve exportar query e getClient', () => {
    const db = require('../../src/config/db');
    expect(typeof db.query).toBe('function');
    expect(typeof db.getClient).toBe('function');
  });

  test('deve configurar o pool com client_encoding UTF8 e propriedades de timeout', () => {
    expect(Pool).toHaveBeenCalled();
    const config = Pool.mock.calls[0][0];
    expect(config).toHaveProperty('client_encoding', 'UTF8');
    expect(config).toHaveProperty('max', 10);
    expect(config).toHaveProperty('idleTimeoutMillis', 5000);
    expect(config).toHaveProperty('connectionTimeoutMillis', 10000);
    expect(config).toHaveProperty('allowExitOnIdle', true);
  });

  test('deve registrar um manipulador de erro no pool', () => {
    const mockPoolInstance = Pool.mock.results[0].value;
    expect(mockPoolInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
  });
});

describe('queryWithHealthCheck', () => {
  let db;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    db = require('../../src/config/db');
  });

  test('deve executar query com sucesso quando health check passa', async () => {
    const mockClient = {
      query: mockQuery.mockResolvedValue({ rows: [{ id: 1 }] }),
      release: mockRelease,
    };
    mockConnect.mockResolvedValue(mockClient);

    const promise = db.query('SELECT * FROM users');
    const result = await promise;

    expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users', undefined);
    expect(mockRelease).toHaveBeenCalledWith();
    expect(result.rows).toEqual([{ id: 1 }]);
  });

  test('deve retry quando health check falha com connection error', async () => {
    const staleClient = {
      query: mockQuery.mockRejectedValueOnce(new Error('Connection terminated')),
      release: mockRelease,
    };
    mockConnect.mockResolvedValueOnce(staleClient);
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 2 }] });

    const promise = db.query('SELECT * FROM users');
    const result = await promise;

    expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
    expect(mockRelease).toHaveBeenCalledWith(expect.any(Error));
    expect(mockPoolQuery).toHaveBeenCalledWith('SELECT * FROM users', undefined);
    expect(result.rows).toEqual([{ id: 2 }]);
  });

  test('deve retry quando health check timeout', async () => {
    jest.useRealTimers();
    const staleClient = {
      query: mockQuery.mockImplementation((q) => {
        if (q === 'SELECT 1') {
          return new Promise(() => {}); // nunca resolve
        }
        return Promise.resolve({ rows: [] });
      }),
      release: mockRelease,
    };
    mockConnect.mockResolvedValueOnce(staleClient);
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 3 }] });

    const promise = db.query('SELECT * FROM users');
    const result = await promise;

    expect(mockRelease).toHaveBeenCalledWith(expect.any(Error));
    expect(mockPoolQuery).toHaveBeenCalledWith('SELECT * FROM users', undefined);
    expect(result.rows).toEqual([{ id: 3 }]);
  });

  test('deve throw quando query real falha (não é connection error)', async () => {
    const mockClient = {
      query: mockQuery
        .mockResolvedValueOnce() // health check passa
        .mockRejectedValueOnce(new Error('Syntax error')),
      release: mockRelease,
    };
    mockConnect.mockResolvedValue(mockClient);

    await expect(db.query('SELECT INVALID')).rejects.toThrow('Syntax error');
    expect(mockRelease).toHaveBeenCalledWith();
  });
});

describe('getClient', () => {
  let db;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    db = require('../../src/config/db');
  });

  test('deve retornar client quando health check passa', async () => {
    const mockClient = {
      query: mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] }),
      release: mockRelease,
    };
    mockConnect.mockResolvedValue(mockClient);

    const client = await db.getClient();

    expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
    expect(mockRelease).not.toHaveBeenCalled();
    expect(client).toBe(mockClient);
  });

  test('deve retry quando health check falha no getClient', async () => {
    const staleClient = {
      query: mockQuery.mockRejectedValueOnce(new Error('Connection terminated')),
      release: mockRelease,
    };
    const newClient = {
      query: mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] }),
      release: mockRelease,
    };
    mockConnect.mockResolvedValueOnce(staleClient).mockResolvedValueOnce(newClient);

    const client = await db.getClient();

    expect(mockRelease).toHaveBeenCalledWith(expect.any(Error));
    expect(client).toBe(newClient);
  });

  test('deve throw quando segundo client também está stale', async () => {
    const staleClient1 = {
      query: mockQuery.mockRejectedValueOnce(new Error('Connection terminated')),
      release: mockRelease,
    };
    const staleClient2 = {
      query: mockQuery.mockRejectedValueOnce(new Error('Connection terminated')),
      release: mockRelease,
    };
    mockConnect.mockResolvedValueOnce(staleClient1).mockResolvedValueOnce(staleClient2);

    await expect(db.getClient()).rejects.toThrow('Connection terminated');
    expect(mockRelease).toHaveBeenCalledTimes(2);
  });
});

describe('isConnectionError', () => {
  let db;

  beforeEach(() => {
    jest.resetModules();
    db = require('../../src/config/db');
  });

  test('deve retornar false para null/undefined', () => {
    // isConnectionError é interno, testamos via comportamento
    // Se err não é connection error, não deve retry
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce() // health check
        .mockRejectedValueOnce(new Error('Out of memory')),
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(mockClient);

    expect(db.query('SELECT 1')).rejects.toThrow('Out of memory');
  });
});
