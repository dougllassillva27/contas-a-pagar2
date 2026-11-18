// ==============================================================================
// RecorrenciaRepository — recorrências do cartão + cache da sync com a Pluggy
// ==============================================================================

const db = require('../config/db');

// Coluna DATE/DATETIME do driver pg vem como objeto Date: formatar antes de expor.
function diaISO(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return isNaN(valor) ? null : valor.toISOString().slice(0, 10);
  const texto = String(valor);
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);
  const d = new Date(texto);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

// --- Recorrências ------------------------------------------------------------

function normalizarRecorrencia(row) {
  if (!row) return null;
  return {
    id: row.id,
    descricao: row.descricao,
    valorTotal: Number(row.valor_total),
    diaCobranca: row.dia_cobranca != null ? Number(row.dia_cobranca) : null,
    cartaoLabel: row.cartao_label || null,
    participantes: Array.isArray(row.participantes) ? row.participantes : [],
    ativo: row.ativo,
    inicioMes: row.inicio_mes,
    inicioAno: row.inicio_ano,
  };
}

async function listarRecorrencias(userId, { somenteAtivas = true } = {}) {
  const filtro = somenteAtivas ? 'AND ativo = TRUE' : '';
  const r = await db.query(
    `SELECT * FROM recorrencias WHERE usuario_id = $1 ${filtro} ORDER BY ativo DESC, descricao ASC`,
    [userId]
  );
  return r.rows.map(normalizarRecorrencia);
}

async function criarRecorrencia(userId, { descricao, valorTotal, diaCobranca, cartaoLabel, participantes, inicioMes, inicioAno }) {
  const r = await db.query(
    `INSERT INTO recorrencias
       (usuario_id, descricao, valor_total, dia_cobranca, cartao_label, participantes, inicio_mes, inicio_ano)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
     RETURNING *`,
    [
      userId,
      String(descricao).trim(),
      Number(valorTotal) || 0,
      diaCobranca ? Number(diaCobranca) : null,
      cartaoLabel || null,
      JSON.stringify(Array.isArray(participantes) ? participantes : []),
      inicioMes || null,
      inicioAno || null,
    ]
  );
  return normalizarRecorrencia(r.rows[0]);
}

async function atualizarRecorrencia(userId, id, dados) {
  const campos = [];
  const valores = [];
  let i = 1;

  if (dados.descricao !== undefined) {
    campos.push(`descricao = $${i++}`);
    valores.push(String(dados.descricao).trim());
  }
  if (dados.valorTotal !== undefined) {
    campos.push(`valor_total = $${i++}`);
    valores.push(Number(dados.valorTotal));
  }
  if (dados.diaCobranca !== undefined) {
    campos.push(`dia_cobranca = $${i++}`);
    valores.push(dados.diaCobranca ? Number(dados.diaCobranca) : null);
  }
  if (dados.participantes !== undefined) {
    campos.push(`participantes = $${i++}::jsonb`);
    valores.push(JSON.stringify(dados.participantes || []));
  }
  if (dados.ativo !== undefined) {
    campos.push(`ativo = $${i++}`);
    valores.push(Boolean(dados.ativo));
  }
  if (!campos.length) return null;

  valores.push(id, userId);
  const r = await db.query(
    `UPDATE recorrencias SET ${campos.join(', ')} WHERE id = $${i++} AND usuario_id = $${i} RETURNING *`,
    valores
  );
  return normalizarRecorrencia(r.rows[0]);
}

async function desativarRecorrencia(userId, id) {
  return atualizarRecorrencia(userId, id, { ativo: false });
}

// Normaliza para comparar descrição (sem acento, sem pontuação, minúscula)
function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function descricaoParecida(a, b) {
  const x = normalizarTexto(a);
  const y = normalizarTexto(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const menor = x.length <= y.length ? x : y;
  const maior = x.length <= y.length ? y : x;
  return menor.length >= 6 && maior.includes(menor);
}

// Procura lançamento já existente no mês que "seja" essa recorrência, mesmo sem FK.
// É a trava anti-duplicação: quem já lançou a mão não recebe uma cópia.
async function acharLancamentoExistente(userId, recorrencia, dono, valor, inicio, fim) {
  const res = await db.query(
    `SELECT id, descricao, valor::float AS valor
       FROM Lancamentos
      WHERE UsuarioId = $1
        AND RecorrenciaId IS NULL
        AND COALESCE(NomeTerceiro, '') = COALESCE($2, '')
        AND DataVencimento >= $3 AND DataVencimento < $4
        AND abs(Valor - $5) <= 0.01`,
    [userId, dono, inicio, fim, valor]
  );
  if (!res.rows.length) return null;
  if (res.rows.length === 1) return res.rows[0];
  return res.rows.find((x) => descricaoParecida(x.descricao, recorrencia.descricao)) || null;
}

// Gera os lançamentos do mês a partir das recorrências ativas.
// Idempotente em três níveis, para não duplicar o que já foi lançado na mão:
//   1. já existe lançamento com RecorrenciaId dessa recorrência e mesmo dono
//   2. já existe lançamento sem FK, mesmo dono e mesmo valor -> vincula em vez de criar
//   3. senão, cria
// Tipo CARTAO + TotalParcelas 99 preserva o comportamento do copiar-mensal.
async function gerarLancamentosDoMes(userId, mes, ano) {
  const recorrencias = await listarRecorrencias(userId);
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const proximoMes = Number(mes) === 12 ? 1 : Number(mes) + 1;
  const proximoAno = Number(mes) === 12 ? Number(ano) + 1 : Number(ano);
  const fim = `${proximoAno}-${String(proximoMes).padStart(2, '0')}-01`;

  const criados = [];
  const vinculados = [];
  const pulados = [];

  for (const r of recorrencias) {
    const partes =
      Array.isArray(r.participantes) && r.participantes.length ? r.participantes : [{ dono: '', valor: r.valorTotal }];

    for (const parte of partes) {
      const dono = String(parte.dono || '').trim() || null;
      const valor = Number(parte.valor) || 0;

      if (!(valor > 0)) {
        pulados.push({ recorrencia: r.descricao, dono, motivo: 'valor zero' });
        continue;
      }

      const jaTem = await db.query(
        `SELECT 1 FROM Lancamentos
          WHERE UsuarioId = $1 AND RecorrenciaId = $2
            AND COALESCE(NomeTerceiro, '') = COALESCE($3, '')
            AND DataVencimento >= $4 AND DataVencimento < $5
          LIMIT 1`,
        [userId, r.id, dono, inicio, fim]
      );
      if (jaTem.rows.length) {
        pulados.push({ recorrencia: r.descricao, dono, motivo: 'já existe no mês' });
        continue;
      }

      const existente = await acharLancamentoExistente(userId, r, dono, valor, inicio, fim);
      if (existente) {
        await db.query('UPDATE Lancamentos SET RecorrenciaId = $1 WHERE Id = $2 AND UsuarioId = $3', [
          r.id,
          existente.id,
          userId,
        ]);
        vinculados.push({ recorrencia: r.descricao, dono, valor, lancamentoId: existente.id });
        continue;
      }

      // dia 29-31 não existe em todo mês: limita a 28 para não gerar data inválida
      const dia = Math.min(Math.max(Number(r.diaCobranca) || 1, 1), 28);
      const data = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

      await db.query(
        `INSERT INTO Lancamentos
           (UsuarioId, Descricao, Valor, Tipo, Status, DataVencimento,
            ParcelaAtual, TotalParcelas, NomeTerceiro, RecorrenciaId)
         VALUES ($1, $2, $3, 'CARTAO', 'PENDENTE', $4, 1, 99, $5, $6)`,
        [userId, r.descricao, valor, data, dono, r.id]
      );
      criados.push({ recorrencia: r.descricao, dono, valor, data });
    }
  }

  return { criados, vinculados, pulados };
}

// --- Cache da sincronização com a Pluggy -------------------------------------

async function getPluggySync(userId) {
  const r = await db.query('SELECT * FROM pluggy_sync WHERE usuario_id = $1', [userId]);
  const row = r.rows[0];
  if (!row) return null;
  return {
    itemId: row.item_id,
    accountId: row.account_id,
    cartaoLabel: row.cartao_label,
    faturaId: row.fatura_id,
    faturaTotal: row.fatura_total != null ? Number(row.fatura_total) : null,
    faturaVencimento: diaISO(row.fatura_vencimento),
    dataFechamento: diaISO(row.data_fechamento),
    transacoes: Array.isArray(row.transacoes) ? row.transacoes : [],
    atualizadoEm: row.atualizado_em,
  };
}

async function salvarPluggySync(userId, dados) {
  await db.query(
    `INSERT INTO pluggy_sync
       (usuario_id, item_id, account_id, cartao_label, fatura_id, fatura_total,
        fatura_vencimento, data_fechamento, transacoes, atualizado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW())
     ON CONFLICT (usuario_id) DO UPDATE SET
       item_id = EXCLUDED.item_id,
       account_id = EXCLUDED.account_id,
       cartao_label = EXCLUDED.cartao_label,
       fatura_id = EXCLUDED.fatura_id,
       fatura_total = EXCLUDED.fatura_total,
       fatura_vencimento = EXCLUDED.fatura_vencimento,
       data_fechamento = EXCLUDED.data_fechamento,
       transacoes = EXCLUDED.transacoes,
       atualizado_em = NOW()`,
    [
      userId,
      dados.itemId || null,
      dados.accountId || null,
      dados.cartaoLabel || null,
      dados.faturaId || null,
      dados.faturaTotal != null ? Number(dados.faturaTotal) : null,
      dados.faturaVencimento || null,
      dados.dataFechamento || null,
      JSON.stringify(dados.transacoes || []),
    ]
  );
}

// --- Histórico de faturas ----------------------------------------------------
// Um snapshot por fatura: a aberta é atualizada a cada sync e, quando ela fecha,
// o registro fica com o último estado observado. Serve para calibrar o motor
// contra vários meses (o pluggy_sync só tem o mês corrente).
async function salvarPluggyFatura(userId, dados) {
  if (!dados || !dados.faturaId) return null;
  await db.query(
    `INSERT INTO pluggy_faturas
       (usuario_id, fatura_id, cartao_label, fatura_total, fatura_vencimento,
        data_fechamento, transacoes, atualizado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
     ON CONFLICT (usuario_id, fatura_id) DO UPDATE SET
       cartao_label = EXCLUDED.cartao_label,
       fatura_total = EXCLUDED.fatura_total,
       fatura_vencimento = EXCLUDED.fatura_vencimento,
       data_fechamento = EXCLUDED.data_fechamento,
       transacoes = EXCLUDED.transacoes,
       atualizado_em = NOW()`,
    [
      userId,
      String(dados.faturaId),
      dados.cartaoLabel || null,
      dados.faturaTotal != null ? Number(dados.faturaTotal) : null,
      dados.faturaVencimento || null,
      dados.dataFechamento || null,
      JSON.stringify(dados.transacoes || []),
    ]
  );
  return String(dados.faturaId);
}

// Faturas do usuário, da mais recente para a mais antiga (para a bateria de testes).
async function listarPluggyFaturas(userId) {
  const res = await db.query(
    `SELECT fatura_id, cartao_label, fatura_total::float AS fatura_total,
            fatura_vencimento, data_fechamento, transacoes, atualizado_em
       FROM pluggy_faturas
      WHERE usuario_id = $1
      ORDER BY COALESCE(fatura_vencimento, data_fechamento, atualizado_em::date) DESC, fatura_id DESC`,
    [userId]
  );
  return res.rows.map((row) => ({
    faturaId: row.fatura_id,
    cartaoLabel: row.cartao_label,
    faturaTotal: Number(row.fatura_total) || 0,
    faturaVencimento: diaISO(row.fatura_vencimento),
    dataFechamento: diaISO(row.data_fechamento),
    transacoes: Array.isArray(row.transacoes) ? row.transacoes : [],
    atualizadoEm: row.atualizado_em,
  }));
}

module.exports = {
  listarRecorrencias,
  criarRecorrencia,
  atualizarRecorrencia,
  desativarRecorrencia,
  gerarLancamentosDoMes,
  getPluggySync,
  salvarPluggySync,
  salvarPluggyFatura,
  listarPluggyFaturas,
};
