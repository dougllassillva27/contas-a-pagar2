// ==============================================================================
// 🧪 TESTES UNITÁRIOS — LancamentoRepository
//
// Testa os métodos principais do repository de lançamentos com mock do banco.
// Foco nas funções mais críticas e com lógica de negócio.
// ==============================================================================

// Mock do módulo db ANTES de importar o repository
jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

const db = require('../../src/config/db');
const lancamentoRepo = require('../../src/repositories/LancamentoRepository');

// Limpa os mocks entre cada teste
beforeEach(() => {
  jest.clearAllMocks();
});

// ==========================================================================
// addLancamento — verifica que monta a query corretamente
// ==========================================================================
describe('addLancamento', () => {
  test('insere lançamento com todos os campos', async () => {
    db.query.mockResolvedValue({ rows: [] });

    await lancamentoRepo.addLancamento(1, {
      descricao: 'Internet',
      valor: 120.5,
      tipo: 'FIXA',
      categoria: null,
      status: 'PENDENTE',
      parcelaAtual: null,
      totalParcelas: null,
      nomeTerceiro: null,
      dataBase: new Date(2026, 1, 10),
    });

    expect(db.query).toHaveBeenCalledTimes(1);
    const [querySQL, params] = db.query.mock.calls[0];
    expect(querySQL).toContain('INSERT INTO Lancamentos');
    expect(params[0]).toBe(1); // userId
    expect(params[1]).toBe('Internet'); // descricao
    expect(params[2]).toBe(120.5); // valor
    expect(params[3]).toBe('FIXA'); // tipo
  });

  test('usa STATUS.PENDENTE como padrão quando status não fornecido', async () => {
    db.query.mockResolvedValue({ rows: [] });

    await lancamentoRepo.addLancamento(1, {
      descricao: 'Teste',
      valor: 50,
      tipo: 'CARTAO',
      dataBase: new Date(),
    });

    const params = db.query.mock.calls[0][1];
    expect(params[5]).toBe('PENDENTE'); // status padrão
  });
});

// ==========================================================================
// updateStatus — verifica parâmetros corretos
// ==========================================================================
describe('updateStatus', () => {
  test('atualiza status de um lançamento específico', async () => {
    db.query.mockResolvedValue({ rowCount: 1 });

    await lancamentoRepo.updateStatus(1, 42, 'PAGO');

    expect(db.query).toHaveBeenCalledWith('UPDATE Lancamentos SET Status = $1 WHERE Id = $2 AND UsuarioId = $3', [
      'PAGO',
      42,
      1,
    ]);
  });
});

// ==========================================================================
// updateConferido — verifica parâmetros corretos
// ==========================================================================
describe('updateConferido', () => {
  test('marca lançamento como conferido', async () => {
    db.query.mockResolvedValue({ rowCount: 1 });

    await lancamentoRepo.updateConferido(1, 55, true);

    expect(db.query).toHaveBeenCalledWith('UPDATE Lancamentos SET Conferido = $1 WHERE Id = $2 AND UsuarioId = $3', [
      true,
      55,
      1,
    ]);
  });

  test('desmarca lançamento conferido', async () => {
    db.query.mockResolvedValue({ rowCount: 1 });

    await lancamentoRepo.updateConferido(1, 55, false);

    expect(db.query).toHaveBeenCalledWith('UPDATE Lancamentos SET Conferido = $1 WHERE Id = $2 AND UsuarioId = $3', [
      false,
      55,
      1,
    ]);
  });
});

// ==========================================================================
// updateConferidoBatchRecent — verifica parâmetros e query
// ==========================================================================
describe('updateConferidoBatchRecent', () => {
  test('marca os últimos lançamentos como conferidos', async () => {
    db.query.mockResolvedValue({ rowCount: 1 });

    await lancamentoRepo.updateConferidoBatchRecent(1);

    expect(db.query).toHaveBeenCalledTimes(1);
    const [querySQL, params] = db.query.mock.calls[0];
    expect(querySQL).toContain('UPDATE Lancamentos');
    expect(querySQL).toContain('SET Conferido = true');
    expect(querySQL).toContain('LIMIT');
    expect(params[0]).toBe(1); // userId
  });
});

// ==========================================================================
// deleteLancamento — verifica que usa userId para segurança
// ==========================================================================
describe('deleteLancamento', () => {
  test('deleta lançamento filtrando por userId', async () => {
    db.query.mockResolvedValue({ rowCount: 1 });

    await lancamentoRepo.deleteLancamento(1, 99);

    expect(db.query).toHaveBeenCalledWith('DELETE FROM Lancamentos WHERE Id = $1 AND UsuarioId = $2', [99, 1]);
  });
});

// ==========================================================================
// getDetalhesRendas — verifica que delega corretamente
// ==========================================================================
describe('getDetalhesRendas', () => {
  test('chama getLancamentosPorTipo com tipo RENDA', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, tipo: 'RENDA' }] });

    const resultado = await lancamentoRepo.getDetalhesRendas(1, 2, 2026);

    expect(resultado).toEqual([{ id: 1, tipo: 'RENDA' }]);
    const params = db.query.mock.calls[0][1];
    expect(params[1]).toBe('RENDA'); // tipo
  });
});

// ==========================================================================
// copyMonth — lógica de incremento de parcelas e virada de ano
// ==========================================================================
describe('copyMonth', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    db.getClient.mockResolvedValue(mockClient);
  });

  test('virada de ano: dezembro (12) → janeiro (1) do ano seguinte', async () => {
    // Simula uma conta fixa em dezembro
    mockClient.query
      .mockResolvedValueOnce({
        // SELECT — items to copy
        rows: [
          {
            descricao: 'Aluguel',
            valor: 1500,
            tipo: 'FIXA',
            categoria: null,
            parcelaatual: null,
            totalparcelas: null,
            datavencimento: new Date(2026, 11, 10), // dezembro 2026
            nometerceiro: null,
            ordem: 1,
            datacriacao: new Date(2026, 0, 1),
          },
        ],
      })
      .mockResolvedValue({ rows: [] }); // BEGIN, INSERT, COMMIT

    await lancamentoRepo.copyMonth(1, 12, 2026);

    // Verifica que o INSERT usou janeiro 2027
    const insertCall = mockClient.query.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO Lancamentos')
    );
    expect(insertCall).toBeDefined();
    const insertParams = insertCall[1];
    const newDate = insertParams[6]; // DataVencimento
    expect(newDate.getMonth()).toBe(0); // janeiro (0-indexed)
    expect(newDate.getFullYear()).toBe(2027); // próximo ano
  });

  test('não copia parcela quando parcelaAtual >= totalParcelas', async () => {
    mockClient.query
      .mockResolvedValueOnce({
        rows: [
          {
            descricao: 'Parcela TV',
            valor: 200,
            tipo: 'CARTAO',
            categoria: null,
            parcelaatual: 10, // última parcela
            totalparcelas: 10, // total = 10
            datavencimento: new Date(2026, 1, 10),
            nometerceiro: null,
            ordem: 1,
            datacriacao: new Date(),
          },
        ],
      })
      .mockResolvedValue({ rows: [] });

    await lancamentoRepo.copyMonth(1, 2, 2026);

    // Deve ter chamado BEGIN e COMMIT, mas NENHUM INSERT
    const insertCalls = mockClient.query.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO Lancamentos')
    );
    expect(insertCalls).toHaveLength(0);
  });

  test('incrementa parcelaAtual quando há parcelas pendentes', async () => {
    mockClient.query
      .mockResolvedValueOnce({
        rows: [
          {
            descricao: 'Notebook',
            valor: 300,
            tipo: 'CARTAO',
            categoria: null,
            parcelaatual: 3,
            totalparcelas: 12,
            datavencimento: new Date(2026, 1, 10),
            nometerceiro: null,
            ordem: 1,
            datacriacao: new Date(),
          },
        ],
      })
      .mockResolvedValue({ rows: [] });

    await lancamentoRepo.copyMonth(1, 2, 2026);

    const insertCall = mockClient.query.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO Lancamentos')
    );
    expect(insertCall).toBeDefined();
    const params = insertCall[1];
    expect(params[7]).toBe(4); // parcelaAtual incrementada de 3 → 4
    expect(params[8]).toBe(12); // totalParcelas mantido
  });

  test('não copia se não houver itens no mês', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT vazio

    await lancamentoRepo.copyMonth(1, 2, 2026);

    // Não deve ter chamado BEGIN (nem INSERT nem COMMIT)
    const beginCalls = mockClient.query.mock.calls.filter((call) => call[0] === 'BEGIN');
    expect(beginCalls).toHaveLength(0);
  });

  test('faz rollback em caso de erro', async () => {
    mockClient.query
      .mockResolvedValueOnce({
        rows: [
          {
            descricao: 'Teste',
            valor: 100,
            tipo: 'FIXA',
            categoria: null,
            parcelaatual: null,
            totalparcelas: null,
            datavencimento: new Date(2026, 1, 10),
            nometerceiro: null,
            ordem: 1,
            datacriacao: new Date(),
          },
        ],
      })
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error('DB Error')); // INSERT falha

    await expect(lancamentoRepo.copyMonth(1, 2, 2026)).rejects.toThrow('DB Error');

    // Verifica que ROLLBACK foi chamado
    const rollbackCalls = mockClient.query.mock.calls.filter((call) => call[0] === 'ROLLBACK');
    expect(rollbackCalls).toHaveLength(1);

    // Verifica que release() foi chamado (finally)
    expect(mockClient.release).toHaveBeenCalled();
  });
});

// ==========================================================================
// getLancamentosTerceiro — Portal público de terceiros
// ==========================================================================
describe('getLancamentosTerceiro', () => {
  test('busca lançamentos pelo nome do terceiro, mês e ano', async () => {
    const mockRows = [
      { id: 1, descricao: 'Internet', valor: 120, tipo: 'FIXA', nometerceiro: 'Mae' },
      { id: 2, descricao: 'Netflix', valor: 55.9, tipo: 'CARTAO', nometerceiro: 'Mae' },
    ];
    db.query.mockResolvedValue({ rows: mockRows });

    const result = await lancamentoRepo.getLancamentosTerceiro('Mae', 3, 2026);

    expect(result).toEqual(mockRows);
    expect(db.query).toHaveBeenCalledTimes(1);

    // Verifica os parâmetros da query
    const [query, params] = db.query.mock.calls[0];
    expect(params).toEqual(['Mae', 3, 2026]);
    expect(query).toContain('NomeTerceiro');
    expect(query).toContain('FIXA');
    expect(query).toContain('CARTAO');
    // Não deve incluir RENDA
    expect(query).not.toContain('RENDA');
  });

  test('retorna array vazio se terceiro não tem lançamentos', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const result = await lancamentoRepo.getLancamentosTerceiro('Inexistente', 1, 2026);

    expect(result).toEqual([]);
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});

// ==========================================================================
// getDashboardTotals — verifica mapeamento e parâmetros de totais
// ==========================================================================
describe('getDashboardTotals', () => {
  test('deve retornar os totais consolidados do mês corretamente', async () => {
    const mockTotais = {
      totalrendas: 5000,
      totalcontas: 3000,
      faltapagar: 1000,
      saldoprevisto: 2000,
    };

    db.query.mockResolvedValueOnce({ rows: [mockTotais] });

    const result = await lancamentoRepo.getDashboardTotals(1, 4, 2026);

    expect(result).toEqual(mockTotais);
    expect(db.query).toHaveBeenCalledTimes(1);

    const [querySQL, params] = db.query.mock.calls[0];
    expect(params).toEqual([1, 4, 2026]);
    expect(querySQL).toContain('totalrendas');
    expect(querySQL).toContain('totalcontas');
    expect(querySQL).toContain('faltapagar');
    expect(querySQL).toContain('saldoprevisto');
  });
});

// ==========================================================================
// addLancamentosBulk — inserção em massa com transação
// ==========================================================================
describe('addLancamentosBulk', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    db.getClient.mockResolvedValue(mockClient);
  });

  test('deve inserir múltiplos lançamentos e usar transação (BEGIN/COMMIT)', async () => {
    const dadosBase = { descricao: 'Netflix', valor: 50, tipo: 'CARTAO' };
    const terceiros = ['Mae', 'Dodo', 'Pai']; // 'Dodo' vira null na normalização

    mockClient.query.mockResolvedValue({}); // Resolve todas as queries da transação

    const result = await lancamentoRepo.addLancamentosBulk(1, dadosBase, terceiros);

    expect(result.criados).toBe(3);
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();

    // 3 inserts efetuados
    const insertCalls = mockClient.query.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO Lancamentos')
    );
    expect(insertCalls).toHaveLength(3);

    // Verifica a normalização do terceiro "Dodo" para null
    const paramsDodo = insertCalls[1][1]; // O segundo terceiro do array, params é o índice 1
    expect(paramsDodo[9]).toBeNull(); // O índice 9 no array de inserção é o NomeTerceiro
  });

  test('deve fazer ROLLBACK em caso de falha', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error('Falha no Insert'));

    await expect(lancamentoRepo.addLancamentosBulk(1, {}, ['Mae'])).rejects.toThrow('Falha no Insert');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});

// ==========================================================================
// deleteLancamentosEmLote — exclusão em massa com verificação de array
// ==========================================================================
describe('deleteLancamentosEmLote', () => {
  test('deve deletar múltiplos lançamentos e retornar a quantidade de linhas afetadas', async () => {
    db.query.mockResolvedValueOnce({ rowCount: 3 });
    const result = await lancamentoRepo.deleteLancamentosEmLote(1, [10, 11, 12]);
    expect(result).toBe(3);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1]).toEqual([[10, 11, 12], 1]);
  });

  test('deve retornar 0 se array for vazio ou inválido', async () => {
    const result = await lancamentoRepo.deleteLancamentosEmLote(1, []);
    expect(result).toBe(0);
    expect(db.query).not.toHaveBeenCalled();
  });
});
