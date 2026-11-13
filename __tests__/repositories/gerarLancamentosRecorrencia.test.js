// ==============================================================================
// Testes da geração de lançamentos a partir das recorrências.
// Regressão do bug "cliquei em gerar e duplicou": o gerador precisa vincular ao
// lançamento que já existe em vez de criar outro.
// ==============================================================================

jest.mock('../../src/config/db', () => ({ query: jest.fn() }));

const db = require('../../src/config/db');
const repo = require('../../src/repositories/RecorrenciaRepository');

const recorrencia = {
  id: 1,
  descricao: 'Claro Flex dia 21',
  valor_total: '49.99',
  dia_cobranca: 21,
  participantes: [{ dono: '', valor: 49.99 }],
  ativo: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('vincula ao lançamento existente em vez de criar duplicata', async () => {
  db.query
    .mockResolvedValueOnce({ rows: [recorrencia] }) // listarRecorrencias
    .mockResolvedValueOnce({ rows: [] }) // não tem FK ainda
    .mockResolvedValueOnce({ rows: [{ id: 42, descricao: 'Claro Flex dia 21', valor: 49.99 }] }) // já lançado a mão
    .mockResolvedValueOnce({ rows: [] }); // UPDATE

  const r = await repo.gerarLancamentosDoMes(1, 11, 2026);

  expect(r.criados).toHaveLength(0);
  expect(r.vinculados).toHaveLength(1);
  expect(r.vinculados[0].lancamentoId).toBe(42);

  const sqls = db.query.mock.calls.map((c) => String(c[0]));
  expect(sqls.some((s) => s.includes('INSERT INTO Lancamentos'))).toBe(false);
  expect(sqls.some((s) => s.includes('UPDATE Lancamentos SET RecorrenciaId'))).toBe(true);
});

test('cria quando não existe nada no mês', async () => {
  db.query
    .mockResolvedValueOnce({ rows: [recorrencia] })
    .mockResolvedValueOnce({ rows: [] }) // sem FK
    .mockResolvedValueOnce({ rows: [] }) // nenhum equivalente
    .mockResolvedValueOnce({ rows: [] }); // INSERT

  const r = await repo.gerarLancamentosDoMes(1, 11, 2026);

  expect(r.criados).toHaveLength(1);
  expect(r.criados[0]).toMatchObject({ recorrencia: 'Claro Flex dia 21', valor: 49.99, data: '2026-11-21' });
  expect(r.vinculados).toHaveLength(0);
  expect(db.query.mock.calls.some((c) => String(c[0]).includes('INSERT INTO Lancamentos'))).toBe(true);
});

test('não repete quando a recorrência já tem lançamento com FK no mês', async () => {
  db.query
    .mockResolvedValueOnce({ rows: [recorrencia] })
    .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }); // já existe com FK

  const r = await repo.gerarLancamentosDoMes(1, 11, 2026);

  expect(r.criados).toHaveLength(0);
  expect(r.vinculados).toHaveLength(0);
  expect(r.pulados).toHaveLength(1);
  expect(r.pulados[0].motivo).toBe('já existe no mês');
});

test('respeita o rateio: uma recorrência gera N lançamentos', async () => {
  const petz = {
    id: 3,
    descricao: 'Petz (ração)',
    valor_total: '293.70',
    dia_cobranca: 8,
    ativo: true,
    participantes: [
      { dono: 'Mãe', valor: 97.9 },
      { dono: 'Vô', valor: 97.9 },
      { dono: '', valor: 97.9 },
    ],
  };

  db.query.mockResolvedValueOnce({ rows: [petz] });
  // 3 participantes x (sem FK + sem equivalente + INSERT)
  for (let i = 0; i < 3; i++) {
    db.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
  }

  const r = await repo.gerarLancamentosDoMes(1, 11, 2026);

  expect(r.criados).toHaveLength(3);
  expect(r.criados.map((c) => c.dono)).toEqual(['Mãe', 'Vô', null]);
});

test('limita o dia a 28 para não gerar data inválida em fevereiro', async () => {
  const dia31 = { ...recorrencia, dia_cobranca: 31 };
  db.query
    .mockResolvedValueOnce({ rows: [dia31] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] });

  const r = await repo.gerarLancamentosDoMes(1, 2, 2026);
  expect(r.criados[0].data).toBe('2026-02-28');
});
