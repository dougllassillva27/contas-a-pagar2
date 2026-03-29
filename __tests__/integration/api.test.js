  });
});

// ==========================================================================
// ✅ NOVO: Testes para a nova rota de atualização em lote
// ==========================================================================
describe('POST /api/lancamentos/conferido-extrato-lote', () => {
  let agent;
  let lancamentoIds = [];

  // Antes de tudo, loga e cria alguns lançamentos para testar
  beforeAll(async () => {
    agent = request.agent(app);
    await agent.post('/login').send({ password: process.env.SENHA_MESTRA });

    // Cria 3 lançamentos de teste
    for (let i = 0; i < 3; i++) {
      const res = await db.query(
        "INSERT INTO Lancamentos (UsuarioId, Descricao, Valor, Tipo, Status, DataVencimento) VALUES (1, $1, 10.0, 'CARTAO', 'PENDENTE', NOW()) RETURNING Id",
        [`Lançamento Lote Teste ${i}`]
      );
      lancamentoIds.push(res.rows[0].id);
    }
  });

  // Depois de tudo, limpa os lançamentos de teste
  afterAll(async () => {
    if (lancamentoIds.length > 0) {
      await db.query('DELETE FROM Lancamentos WHERE Id = ANY($1::int[])', [lancamentoIds]);
    }
  });

  test('deve marcar múltiplos lançamentos como conferidos', async () => {
    const res = await agent.post('/api/lancamentos/conferido-extrato-lote').send({ ids: lancamentoIds, conferido: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.updated).toBe(lancamentoIds.length);

    // Verifica no banco
    const { rows } = await db.query('SELECT COUNT(*) FROM Lancamentos WHERE Id = ANY($1::int[]) AND ConferidoExtrato = true', [lancamentoIds]);
    expect(parseInt(rows[0].count, 10)).toBe(lancamentoIds.length);
  });

  test('deve desmarcar múltiplos lançamentos', async () => {
    await agent.post('/api/lancamentos/conferido-extrato-lote').send({ ids: lancamentoIds, conferido: false });
    const { rows } = await db.query('SELECT COUNT(*) FROM Lancamentos WHERE Id = ANY($1::int[]) AND ConferidoExtrato = false', [lancamentoIds]);
    expect(parseInt(rows[0].count, 10)).toBe(lancamentoIds.length);
  });
});

// ==========================================================================
// Fluxo completo: Login → Dashboard → API
// ==========================================================================

