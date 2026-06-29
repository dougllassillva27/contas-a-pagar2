// ==============================================================================
// LancamentoRepository — Todas as queries e CRUD de Lançamentos
// ==============================================================================

const db = require('../config/db');
const { STATUS, TIPO, LIMITES, SQL_SEM_TERCEIRO } = require('../constants');
const cache = require('../helpers/cacheHelpers');

// ==============================================================================
// ✅ NOVO: Helper para normalizar palavras-chave "Eu" ou "Dodo" para NULL
// ==============================================================================
// ==============================================================================
// Helper para otimizar queries por mês/ano (B-Tree friendly)
// ==============================================================================
function getMesRange(month, year) {
  // Gera datas como 'YYYY-MM-DD' para evitar problemas de timezone
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  let nextMonth = parseInt(month, 10) + 1;
  let nextYear = parseInt(year, 10);
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  return { startDate, endDate };
}

function normalizarTerceiro(nome) {
  const nomeNormalizado = (nome || '').trim().toLowerCase();
  // Palavras-chave que representam "conta própria"
  if (['eu', 'dodo', ''].includes(nomeNormalizado)) {
    return null;
  }
  return (nome || '').trim();
}

// Exporta para uso em outros módulos
module.exports.normalizarTerceiro = normalizarTerceiro;

// --- LISTAGENS E DASHBOARD ---

async function getUltimosLancamentos(userId) {
  // Otimização: Restringe a busca aos últimos 100 registros (usando o índice idx_lancamentos_usuario_criacao)
  // antes de aplicar o DISTINCT ON pesado em memória, erradicando o Full Table Scan.
  const query = `
      WITH UltimosCem AS (
          SELECT * 
          FROM Lancamentos 
          WHERE UsuarioId = $1 
          ORDER BY DataCriacao DESC NULLS LAST, Id DESC 
          LIMIT 20
      ),
      Unicos AS (
          SELECT DISTINCT ON (date_trunc('second', DataCriacao), Descricao, COALESCE(NomeTerceiro, '')) 
            * 
          FROM UltimosCem 
          ORDER BY date_trunc('second', DataCriacao) DESC NULLS LAST, Descricao ASC, COALESCE(NomeTerceiro, '') ASC, Id ASC
      )
      SELECT * FROM Unicos 
      ORDER BY DataCriacao DESC NULLS LAST, Id DESC 
      LIMIT ${LIMITES.ULTIMOS_LANCAMENTOS}
   `;
  const result = await db.query(query, [userId]);
  return result.rows;
}

async function getRelatorioMensal(userId, month, year) {
  const query = `
      SELECT * FROM Lancamentos 
      WHERE UsuarioId = $1 
        AND Tipo = '${TIPO.CARTAO}' 
        AND DataVencimento >= $2 AND DataVencimento < $3
      ORDER BY 
          CASE WHEN ${SQL_SEM_TERCEIRO} THEN 0 ELSE 1 END, 
          NomeTerceiro, 
          Ordem
   `;
  const { startDate, endDate } = getMesRange(month, year);
  const result = await db.query(query, [userId, startDate, endDate]);
  return result.rows;
}

async function getDashboardTotais(userId, month, year) {
  const cacheKey = `dashboard:totais:${userId}:${month}:${year}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const tiposContas = `'${TIPO.FIXA}', '${TIPO.CARTAO}'`;
  const { startDate, endDate } = getMesRange(month, year);
  const query = `
      SELECT
          COALESCE(SUM(CASE WHEN Tipo = '${TIPO.RENDA}' THEN Valor ELSE 0 END), 0)::float AS totalrendas,
          COALESCE(SUM(CASE WHEN Tipo IN (${tiposContas}) AND ${SQL_SEM_TERCEIRO} THEN Valor ELSE 0 END), 0)::float AS totalcontas,
          COALESCE(SUM(CASE WHEN Tipo IN (${tiposContas}) AND ${SQL_SEM_TERCEIRO} AND Status = '${STATUS.PENDENTE}' THEN Valor ELSE 0 END), 0)::float AS faltapagar,
          COALESCE(SUM(CASE WHEN Tipo = '${TIPO.RENDA}' THEN Valor ELSE 0 END) -
                 SUM(CASE WHEN Tipo IN (${tiposContas}) AND ${SQL_SEM_TERCEIRO} THEN Valor ELSE 0 END), 0)::float AS saldoprevisto
      FROM Lancamentos
      WHERE UsuarioId = $1
        AND DataVencimento >= $2 AND DataVencimento < $3
   `;
  const result = await db.query(query, [userId, startDate, endDate]);
  const totais = result.rows[0];
  cache.set(cacheKey, totais, 5 * 60 * 1000);
  return totais;
}

async function getDashboardDataModular(userId, month, year, userName) {
  const startTime = Date.now();
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    console.log(`[🔍 DEBUG-MODULAR] >>> INICIANDO getDashboardDataModular para userId=${userId}`);
  }

  try {
    // Executa queries em paralelo — são independentes
    // Pool com max=10 suporta até 10 conexões simultâneas
    const queries = [
      ['1/9 getDashboardTotais', () => getDashboardTotais(userId, month, year)],
      ['2/9 getLancamentosPorTipo(FIXA)', () => getLancamentosPorTipo(userId, TIPO.FIXA, month, year)],
      ['3/9 getLancamentosPorTipo(CARTAO)', () => getLancamentosPorTipo(userId, TIPO.CARTAO, month, year)],
      ['4/9 getResumoPessoas', () => getResumoPessoas(userId, month, year, userName)],
      ['5/9 getDadosTerceiros', () => getDadosTerceiros(userId, month, year, 500)],
      ['6/9 getAnotacoes', () => getAnotacoes(userId, month, year)],
      ['7/9 getOrdemCards', () => getOrdemCards(userId)],
      ['8/9 getFaturaManual', () => getFaturaManual(userId, month, year).then(r => r || 0)],
      ['9/9 isMesFechado + getDistinctTerceiros', async () => {
        const [mesFechado, terceirosDistinct] = await Promise.all([
          isMesFechado(userId, month, year),
          getDistinctTerceiros(userId),
        ]);
        return { mesFechado, terceirosDistinct };
      }],
    ];

    // Executa todas em paralelo com logs individuais (apenas dev)
    const results = await Promise.all(
      queries.map(async ([label, fn]) => {
        const qStart = Date.now();
        const result = await fn();
        const elapsed = Date.now() - qStart;

        // Log crítico: query individual lenta (>1000ms)
        if (elapsed > 1000 && !isProd) {
          console.warn(`[⚠️ PERF-SLOW] [${label}] demorou ${elapsed}ms`);
        }
        return result;
      })
    );

    const totalElapsed = Date.now() - startTime;

    // Log crítico: tempo total da função
    if (totalElapsed > 2000 && !isProd) {
      console.warn(`[⚠️ PERF-SLOW] getDashboardDataModular demorou ${totalElapsed}ms`);
    }

    return {
      totais: results[0],
      fixas: results[1],
      cartao: results[2],
      resumoPessoas: results[3],
      dadosTerceirosRaw: results[4],
      anotacoes: results[5],
      ordemCardsRaw: results[6],
      faturaManualVal: results[7],
      mesFechado: results[8].mesFechado,
      terceirosDistinct: results[8].terceirosDistinct,
    };
  } catch (err) {
    console.error('[getDashboardDataModular] Erro:', err.message);
    throw err;
  }
}


async function getLancamentosPorTipo(userId, tipo, month, year) {
  const query = `
      SELECT * FROM Lancamentos 
      WHERE UsuarioId = $1 
        AND Tipo = $2 
        AND ${SQL_SEM_TERCEIRO} 
        AND DataVencimento >= $3 AND DataVencimento < $4 
      ORDER BY Ordem ASC
   `;
  const { startDate, endDate } = getMesRange(month, year);
  const result = await db.query(query, [userId, tipo, startDate, endDate]);
  return result.rows;
}

async function getDadosTerceiros(userId, month, year, limit = 500, offset = 0) {
  // Conta total de registros para paginação frontend
  const countQuery = `
     SELECT COUNT(*) FROM Lancamentos
     WHERE UsuarioId = $1
       AND DataVencimento >= $2 AND DataVencimento < $3
  `;
 const { startDate, endDate } = getMesRange(month, year);
  const countResult = await db.query(countQuery, [userId, startDate, endDate]);
  const total = parseInt(countResult.rows[0].count, 10);

  // Query paginada com LIMIT/OFFSET
  const query = `
      SELECT * FROM Lancamentos
      WHERE UsuarioId = $1
        AND DataVencimento >= $2 AND DataVencimento < $3
     ORDER BY NomeTerceiro, Tipo, Ordem
   LIMIT $4 OFFSET $5
 `;
 const result = await db.query(query, [userId, startDate, endDate, limit, offset]);
  return { rows: result.rows, total };
}

async function getLancamentosCartaoPorPessoa(userId, pessoa, month, year, userName) {
  let query = `
      SELECT * FROM Lancamentos 
      WHERE UsuarioId = $1 
        AND Tipo = '${TIPO.CARTAO}' 
        AND DataVencimento >= $2 AND DataVencimento < $3
   `;
  const { startDate, endDate } = getMesRange(month, year);
  const params = [userId, startDate, endDate];
  if (pessoa === userName) {
    query += ` AND ${SQL_SEM_TERCEIRO}`;
  } else {
    query += ' AND NomeTerceiro = $4';
    params.push(pessoa);
  }
  query += ' ORDER BY Ordem ASC';
  const result = await db.query(query, params);
  return result.rows;
}

async function getResumoPessoas(userId, month, year, userName) {
  const query = `
      SELECT 
          CASE WHEN ${SQL_SEM_TERCEIRO} THEN $4 ELSE NomeTerceiro END AS pessoa, 
          SUM(CASE WHEN Status = '${STATUS.PENDENTE}' THEN Valor ELSE 0 END)::float AS total, 
          CASE WHEN COUNT(*) = SUM(CASE WHEN Status = '${STATUS.PAGO}' THEN 1 ELSE 0 END) THEN 1 ELSE 0 END AS todospagos 
      FROM Lancamentos 
      WHERE UsuarioId = $1 
        AND Tipo = '${TIPO.CARTAO}' 
        AND DataVencimento >= $2 AND DataVencimento < $3 
      GROUP BY NomeTerceiro 
      ORDER BY CASE WHEN ${SQL_SEM_TERCEIRO} THEN 0 ELSE 1 END, NomeTerceiro
   `;
  const { startDate, endDate } = getMesRange(month, year);
  const result = await db.query(query, [userId, startDate, endDate, userName]);
  return result.rows;
}

async function getDetalhesRendas(userId, month, year) {
  return getLancamentosPorTipo(userId, TIPO.RENDA, month, year);
}

async function getDistinctTerceiros(userId) {
  const cacheKey = `dashboard:distintos_terceiros:${userId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const result = await db.query(
    `SELECT DISTINCT NomeTerceiro FROM Lancamentos
     WHERE UsuarioId = $1 AND NomeTerceiro IS NOT NULL AND NomeTerceiro != ''
     ORDER BY NomeTerceiro`,
    [userId]
  );
  const terceiros = result.rows.map((r) => r.nometerceiro);
  console.log(`[DEBUG-DISTINCT-TERCEIROS] userId=${userId}, terceiros encontrados: ${terceiros.length}`);
  console.log(`[DEBUG-DISTINCT-TERCEIROS] Lista:`, terceiros.join(', '));
  cache.set(cacheKey, terceiros, 5 * 60 * 1000);
  return terceiros;
}

// ✅ OBS-20260601-03: Query leve para resumo de terceiros (grid do dashboard)
// Evita a CTE pesada do getDashboardDataBatched — usada apenas para atualização pós-divisão
async function getResumoTerceirosGrid(userId, month, year) {
  const { startDate, endDate } = getMesRange(month, year);
  const query = `
    SELECT
      NomeTerceiro AS nome,
      SUM(CASE WHEN Tipo = '${TIPO.CARTAO}' THEN Valor ELSE 0 END)::float AS totalCartao,
      SUM(Valor)::float AS totalGeral,
      COUNT(*) FILTER (WHERE Status = '${STATUS.PENDENTE}') AS contasPendentes,
      COUNT(*) FILTER (WHERE Status = '${STATUS.PAGO}') AS contasPagas
    FROM Lancamentos
    WHERE UsuarioId = $1
      AND NomeTerceiro IS NOT NULL
      AND NomeTerceiro != ''
      AND DataVencimento >= $2
      AND DataVencimento < $3
    GROUP BY NomeTerceiro
    ORDER BY NomeTerceiro
  `;
  const result = await db.query(query, [userId, startDate, endDate]);
  return result.rows;
}

// --- CRUD ---

async function addLancamento(userId, dados) {
  const dataVencimento = dados.dataBase ? new Date(dados.dataBase) : new Date();

  // ✅ FIX: Normaliza terceiro "Eu", "Dodo" ou vazio para NULL (mesma lógica de addLancamentosBulk)
  const terceiroNormalizado = normalizarTerceiro(dados.nomeTerceiro);

  console.log('[DEBUG] addLancamento - tipo:', dados.tipo, 'TIPO.FIXA:', TIPO.FIXA, 'igual:', dados.tipo === TIPO.FIXA);

  // ✅ Para contas fixas, usa UPSERT para evitar violação de constraint única
  if (dados.tipo === TIPO.FIXA) {
    const query = `
      WITH existing AS (
        SELECT Id FROM Lancamentos
        WHERE UsuarioId = $1 AND Descricao = $2 AND Tipo = '${TIPO.FIXA}'
          AND MesVencimento = EXTRACT(MONTH FROM $7::timestamptz)::integer
          AND AnoVencimento = EXTRACT(YEAR FROM $7::timestamptz)::integer
          AND COALESCE(NomeTerceiro, '') = COALESCE($10, '')
        LIMIT 1
      ),
      updated AS (
        UPDATE Lancamentos SET Valor = $3, Categoria = $5, Status = $6,
          ParcelaAtual = $8, TotalParcelas = $9
        WHERE Id = (SELECT Id FROM existing)
        RETURNING Id
      )
      INSERT INTO Lancamentos
        (UsuarioId, Descricao, Valor, Tipo, Categoria, Status, DataVencimento,
         ParcelaAtual, TotalParcelas, NomeTerceiro, Ordem, MesVencimento, AnoVencimento)
      SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        (SELECT COALESCE(MAX(Ordem), 0) + 1 FROM Lancamentos WHERE UsuarioId = $1),
        EXTRACT(MONTH FROM $7::timestamptz)::integer, EXTRACT(YEAR FROM $7::timestamptz)::integer
      WHERE NOT EXISTS (SELECT 1 FROM updated) AND NOT EXISTS (SELECT 1 FROM existing)
    `;
    await db.query(query, [
      userId,
      dados.descricao,
      dados.valor,
      dados.tipo,
      dados.categoria,
      dados.status || STATUS.PENDENTE,
      dataVencimento,
      dados.parcelaAtual || null,
      dados.totalParcelas || null,
      terceiroNormalizado,
    ]);
  } else {
    const query = `
      WITH mes_ano AS (
        SELECT EXTRACT(MONTH FROM $7::timestamptz)::integer AS mes,
               EXTRACT(YEAR FROM $7::timestamptz)::integer AS ano
      )
      INSERT INTO Lancamentos
        (UsuarioId, Descricao, Valor, Tipo, Categoria, Status, DataVencimento,
         ParcelaAtual, TotalParcelas, NomeTerceiro, Ordem, MesVencimento, AnoVencimento)
      SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        (SELECT COALESCE(MAX(Ordem), 0) + 1 FROM Lancamentos WHERE UsuarioId = $1),
        mes, ano
      FROM mes_ano
      ON CONFLICT (usuarioid, descricao, tipo, COALESCE(nometerceiro, ''), mesvencimento, anovencimento)
      DO NOTHING
    `;
    await db.query(query, [
      userId,
      dados.descricao,
      dados.valor,
      dados.tipo,
      dados.categoria,
      dados.status || STATUS.PENDENTE,
      dataVencimento,
      dados.parcelaAtual || null,
      dados.totalParcelas || null,
      terceiroNormalizado,
    ]);
  }
}

// ==============================================================================
// ✅ NOVO: Lançamento em massa (bulk) — transação segura
// ==============================================================================
async function addLancamentosBulk(userId, dadosBase, terceiros) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    let criados = 0;
    const dataVencimento = dadosBase.dataBase ? new Date(dadosBase.dataBase) : new Date();

    for (const terceiro of terceiros) {
      // ✅ CORREÇÃO: Normaliza "Eu" ou "Dodo" para NULL
      const terceiroNormalizado = normalizarTerceiro(terceiro);

      const query = `
        INSERT INTO Lancamentos 
          (UsuarioId, Descricao, Valor, Tipo, Categoria, Status, DataVencimento, 
           ParcelaAtual, TotalParcelas, NomeTerceiro, Ordem)  
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
          (SELECT COALESCE(MAX(Ordem), 0) + 1 FROM Lancamentos WHERE UsuarioId = $1))
      `;

      await client.query(query, [
        userId,
        dadosBase.descricao,
        dadosBase.valor,
        dadosBase.tipo,
        dadosBase.categoria,
        dadosBase.status || STATUS.PENDENTE,
        dataVencimento,
        dadosBase.parcelaAtual || null,
        dadosBase.totalParcelas || null,
        terceiroNormalizado, // NULL se for "Eu" ou "Dodo"
      ]);

      criados++;
    }

    await client.query('COMMIT');
    return { criados };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateLancamento(userId, id, dados) {
  await db.query(
    `UPDATE Lancamentos 
     SET Descricao = $1, Valor = $2, Tipo = $3, Categoria = $4, 
         ParcelaAtual = $5, TotalParcelas = $6, NomeTerceiro = $7 
     WHERE Id = $8 AND UsuarioId = $9`,
    [
      dados.descricao,
      dados.valor,
      dados.tipo,
      dados.categoria,
      dados.parcelaAtual || null,
      dados.totalParcelas || null,
      dados.nomeTerceiro || null,
      id,
      userId,
    ]
  );
}

async function updateStatus(userId, id, novoStatus) {
  await db.query('UPDATE Lancamentos SET Status = $1 WHERE Id = $2 AND UsuarioId = $3', [novoStatus, id, userId]);
}

async function updateConferido(userId, id, valor) {
  await db.query('UPDATE Lancamentos SET Conferido = $1 WHERE Id = $2 AND UsuarioId = $3', [valor, id, userId]);
}

async function updateConferidoExtrato(userId, id, valor) {
  await db.query('UPDATE Lancamentos SET ConferidoExtrato = $1 WHERE Id = $2 AND UsuarioId = $3', [valor, id, userId]);
}

// ✅ NOVO: Atualização em lote da flag `ConferidoExtrato`
async function updateConferidoExtratoLote(userId, ids, conferido) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return 0;
  }
  const query = `
    UPDATE Lancamentos
    SET ConferidoExtrato = $1
    WHERE Id = ANY($2::int[]) AND UsuarioId = $3
  `;
  const result = await db.query(query, [conferido, ids, userId]);
  return result.rowCount;
}

async function updateStatusBatchPessoa(userId, pessoa, novoStatus, month, year, userName) {
  let query = `
      UPDATE Lancamentos SET Status = $1 
      WHERE UsuarioId = $2 
        AND Tipo = '${TIPO.CARTAO}' 
        AND DataVencimento >= $3 AND DataVencimento < $4
   `;
  const { startDate, endDate } = getMesRange(month, year);
  const params = [novoStatus, userId, startDate, endDate];
  if (pessoa === userName) {
    query += ` AND ${SQL_SEM_TERCEIRO}`;
  } else {
    query += ' AND NomeTerceiro = $5';
    params.push(pessoa);
  }
  await db.query(query, params);
}

async function updateConferidoBatchRecent(userId) {
  const query = `
      UPDATE Lancamentos 
      SET Conferido = true 
      WHERE Id IN (
          SELECT Id FROM (
              SELECT DISTINCT ON (date_trunc('second', DataCriacao), Descricao, COALESCE(NomeTerceiro, '')) 
                Id, DataCriacao 
              FROM Lancamentos 
              WHERE UsuarioId = $1 
              ORDER BY date_trunc('second', DataCriacao) DESC NULLS LAST, Descricao ASC, COALESCE(NomeTerceiro, '') ASC, Id ASC
          ) sub
          ORDER BY DataCriacao DESC NULLS LAST, Id DESC 
          LIMIT ${LIMITES.ULTIMOS_LANCAMENTOS}
      )
   `;
  await db.query(query, [userId]);
}

async function reorderLancamentos(userId, itens) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Bulk UPDATE via UNNEST — 1 query em vez de N
    const ids = itens.map(i => i.id);
    const ordens = itens.map((_, i) => i);
    const userIds = itens.map(() => userId);
    await client.query(
      `UPDATE Lancamentos SET Ordem = data.ordem
       FROM (SELECT UNNEST($1::int[]) AS id, UNNEST($2::int[]) AS ordem) AS data
       WHERE Lancamentos.Id = data.id AND Lancamentos.UsuarioId = $3`,
      [ids, ordens, userId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getLancamento(userId, id) {
  const res = await db.query('SELECT * FROM Lancamentos WHERE Id = $1 AND UsuarioId = $2', [id, userId]);
  return res.rows[0];
}

async function getMesesAnosPorIds(userId, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const res = await db.query(
    'SELECT DISTINCT EXTRACT(MONTH FROM DataVencimento) as mes, EXTRACT(YEAR FROM DataVencimento) as ano FROM Lancamentos WHERE Id = ANY($1::int[]) AND UsuarioId = $2',
    [ids, userId]
  );
  return res.rows;
}

async function deleteLancamento(userId, id) {
  await db.query('DELETE FROM Lancamentos WHERE Id = $1 AND UsuarioId = $2', [id, userId]);
}

async function deleteLancamentosPorPessoa(userId, pessoa, month, year, userName) {
  let query = `DELETE FROM Lancamentos WHERE UsuarioId = $1 AND Tipo = '${TIPO.CARTAO}' AND DataVencimento >= $2 AND DataVencimento < $3`;
  const { startDate, endDate } = getMesRange(month, year);
  const params = [userId, startDate, endDate];
  if (pessoa === userName) {
    query += ` AND ${SQL_SEM_TERCEIRO}`;
  } else {
    query += ' AND NomeTerceiro = $4';
    params.push(pessoa);
  }
  await db.query(query, params);
}

async function deleteMonth(userId, month, year) {
  console.log('[deleteMonth] === INICIO ===');
  console.log('[deleteMonth] userId:', userId, 'month:', month, 'year:', year);

  // Primeiro, verificar se existem registros
  const checkResult = await db.query(
    'SELECT Id, DataVencimento, EXTRACT(MONTH FROM DataVencimento) as mes, EXTRACT(YEAR FROM DataVencimento) as ano FROM Lancamentos WHERE UsuarioId = $1 LIMIT 5',
    [userId]
  );
  console.log('[deleteMonth] Primeiros 5 registros do usuario:', JSON.stringify(checkResult.rows));

  // Verificar quantos registros existem no mes/ano alvo
  const countResult = await db.query(
    'SELECT COUNT(*) FROM Lancamentos WHERE UsuarioId = $1 AND EXTRACT(MONTH FROM DataVencimento) = $2 AND EXTRACT(YEAR FROM DataVencimento) = $3',
    [userId, month, year]
  );
  console.log('[deleteMonth] Total de registros no mes/ano alvo:', countResult.rows[0].count);

  // Agora deletar
  const result = await db.query(
    'DELETE FROM Lancamentos WHERE UsuarioId = $1 AND EXTRACT(MONTH FROM DataVencimento) = $2 AND EXTRACT(YEAR FROM DataVencimento) = $3',
    [userId, month, year]
  );
  console.log('[deleteMonth] Linhas deletadas:', result.rowCount);
  console.log('[deleteMonth] === FIM ===');
  return result.rowCount;
}

// ==============================================================================
// ✅ NOVO: Exclusão em lote por IDs
// ==============================================================================
async function deleteLancamentosEmLote(userId, ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return 0;
  }
  const query = `DELETE FROM Lancamentos WHERE Id = ANY($1::int[]) AND UsuarioId = $2`;
  const result = await db.query(query, [ids, userId]);
  return result.rowCount;
}

// ==============================================================================
// ✅ NOVO: Deslocamento de mês (Anterior/Seguinte)
// ==============================================================================
async function moverLancamentosMes(userId, ids, offsetMeses) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const intervalStr = `${offsetMeses} month`;
  const query = `
    UPDATE Lancamentos 
    SET DataVencimento = DataVencimento + $1::interval 
    WHERE Id = ANY($2::int[]) AND UsuarioId = $3
  `;
  const result = await db.query(query, [intervalStr, ids, userId]);
  return result.rowCount;
}

// ⚠️ ATENÇÃO: Esta função copia do mês informado para o PRÓXIMO mês.
// O frontend envia o mês que o usuário está visualizando.
// Exemplo: se o usuário está em Fevereiro e clica "Copiar",
// → copia as fixas/parcelas de Fevereiro para Março.
async function copyMonth(userId, currentMonth, currentYear) {
  const client = await db.getClient();
  try {
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }

    // Buscar registros do mês atual usando colunas computadas
    // ✅ FIX: Adiciona log de debug para ver quantos registros foram encontrados
    const res = await client.query(
      `SELECT * FROM (
         SELECT *,
                ROW_NUMBER() OVER (
                  PARTITION BY Descricao, Tipo, COALESCE(NomeTerceiro, '')
                  ORDER BY CASE WHEN NomeTerceiro IS NULL THEN 0 ELSE 1 END, Id
                ) as rn
         FROM Lancamentos
         WHERE UsuarioId = $1
           AND MesVencimento = $2
           AND AnoVencimento = $3
           AND (Tipo IN ('${TIPO.FIXA}', '${TIPO.RENDA}', '${TIPO.TERCEIRO}') OR (ParcelaAtual IS NOT NULL AND TotalParcelas IS NOT NULL))
       ) sub WHERE rn = 1`,
      [userId, currentMonth, currentYear]
    );

    console.log(`[copyMonth] 📊 Registros encontrados no mês ${currentMonth}/${currentYear}: ${res.rows.length}`);

    const itemsToCopy = res.rows;
    if (itemsToCopy.length === 0) {
      console.log('[copyMonth] ⚠️ Nenhum item encontrado para copiar');
      return;
    }

    console.log(`[copyMonth] �� Iniciando cópia: ${itemsToCopy.length} itens encontrados`);
    console.log(`[copyMonth] �� Origem: ${currentMonth}/${currentYear} → Destino: ${nextMonth}/${nextYear}`);

    // ✅ FIX: Busca configuração do valor mínimo da divisão da casa
    let valorMinimoCasa = 750.0;
    try {
      const configResult = await client.query(
        'SELECT divisao_casa_minimo FROM configuracoes WHERE usuario_id = $1',
        [userId]
      );
      if (configResult.rows.length > 0 && configResult.rows[0].divisao_casa_minimo) {
        valorMinimoCasa = parseFloat(configResult.rows[0].divisao_casa_minimo);
        console.log(`[copyMonth] �� Valor mínimo Casa carregado: R$ ${valorMinimoCasa.toFixed(2)}`);
      }
    } catch (err) {
      console.error('[copyMonth] Erro ao ler divisao_casa_minimo:', err.message);
    }

    await client.query('BEGIN');

    let contagemResetados = 0;
    let contagemNormais = 0;

    for (const item of itemsToCopy) {
      let novoParcelaAtual = item.parcelaatual;
      let totalParcelas = item.totalparcelas;
      if (novoParcelaAtual && totalParcelas) {
        if (novoParcelaAtual >= totalParcelas) continue;
        novoParcelaAtual = novoParcelaAtual + 1;
      }
      const oldDate = new Date(item.datavencimento);
      const day = oldDate.getDate() || 10;
      const newDate = new Date(nextYear, nextMonth - 1, day);
      const novoStatus = item.tipo === TIPO.RENDA ? STATUS.PAGO : STATUS.PENDENTE;

      // ✅ FIX: Resetar valor de contas "Casa" para o mínimo configurado
      // Detecta tanto contas Fixas quanto Terceiros com descrição "Casa"
      let novoValor = item.valor;
      const descricaoOriginal = item.descricao || '';
      const descricaoBase = descricaoOriginal.split(' - ')[0].trim();

      // Verifica se é uma conta Casa (tanto Fixa quanto Terceiro)
      const categoriaEhCasa = (item.categoria || '').toLowerCase() === 'casa';
      const descricaoEhCasa = descricaoBase.toLowerCase() === 'casa';
      const ehContaCasa = categoriaEhCasa || descricaoEhCasa;

      if (ehContaCasa) {
        console.log(`[copyMonth] �� RESETANDO conta Casa:`);
        console.log(`   ├─ Descrição: "${descricaoOriginal}"`);
        console.log(`   ├─ Tipo: ${item.tipo} | Categoria: ${item.categoria}`);
        console.log(`   ├─ Valor original: R$ ${parseFloat(item.valor).toFixed(2)}`);
        console.log(`   └─ Novo valor: R$ ${valorMinimoCasa.toFixed(2)}`);
        novoValor = valorMinimoCasa;
        contagemResetados++;
      } else {
        contagemNormais++;
      }

      // Garante que a cópia herde a data de criação original
      const dataCriacaoOriginal = item.datacriacao ? new Date(item.datacriacao) : new Date();

      await client.query(
        `INSERT INTO Lancamentos
           (UsuarioId, Descricao, Valor, Tipo, Categoria, Status, DataVencimento,
            ParcelaAtual, TotalParcelas, NomeTerceiro, Ordem, DataCriacao, MesVencimento, AnoVencimento)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (UsuarioId, Descricao, Tipo, COALESCE(NomeTerceiro, ''), MesVencimento, AnoVencimento) DO NOTHING`,
        [
          userId,
          item.descricao,
          novoValor,
          item.tipo,
          item.categoria,
          novoStatus,
          newDate,
          novoParcelaAtual,
          totalParcelas,
          item.nometerceiro,
          item.ordem,
          dataCriacaoOriginal,
          nextMonth,
          nextYear,
        ]
      );
    }

    await client.query('COMMIT');

    console.log(`[copyMonth] ✅ Cópia concluída:`);
    console.log(`   ├─ Total processado: ${itemsToCopy.length} itens`);
    console.log(`   ├─ Contas Casa resetadas: ${contagemResetados}`);
    console.log(`   └─ Contas normais copiadas: ${contagemNormais}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[copyMonth] ❌ Erro durante cópia:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// ==============================================================================
// Portal de Terceiros — consulta pública por nome do terceiro
// ==============================================================================
async function getLancamentosTerceiro(userId, nome, month, year) {
  const query = `
      SELECT * FROM Lancamentos 
      WHERE UsuarioId = $1
        AND NomeTerceiro = $2 
        AND Tipo IN ('${TIPO.FIXA}', '${TIPO.CARTAO}') 
        AND DataVencimento >= $3 AND DataVencimento < $4 
      ORDER BY Tipo, Ordem ASC
   `;
  const { startDate, endDate } = getMesRange(month, year);
  const result = await db.query(query, [userId, nome, startDate, endDate]);
  return result.rows;
}

// ==============================================================================
// Funções de Sincronização (Morr -> Cartão Douglas)
// ==============================================================================

async function getTotalTerceiroCartao(nome, userId, month, year) {
  const query = `
    SELECT COALESCE(SUM(Valor), 0)::float AS total
    FROM Lancamentos
    WHERE UsuarioId = $1
      AND NomeTerceiro = $2
      AND Tipo = '${TIPO.CARTAO}'
      AND DataVencimento >= $3 AND DataVencimento < $4
  `;
  const { startDate, endDate } = getMesRange(month, year);
  const result = await db.query(query, [userId, nome, startDate, endDate]);
  return result.rows[0]?.total || 0;
}

async function findAndUpdateOrCreateContaFixa(userId, nomeConta, valor, month, year) {
  const dataVencimento = new Date(year, month - 1, 10);

  const query = `
    WITH existing AS (
      SELECT Id FROM Lancamentos
      WHERE UsuarioId = $1 AND Descricao = $2 AND Tipo = '${TIPO.FIXA}'
        AND MesVencimento = EXTRACT(MONTH FROM $4::timestamptz)::integer
        AND AnoVencimento = EXTRACT(YEAR FROM $4::timestamptz)::integer
      LIMIT 1
    ),
    updated AS (
      UPDATE Lancamentos SET Valor = $3
      WHERE Id = (SELECT Id FROM existing)
      RETURNING Id
    )
    INSERT INTO Lancamentos (UsuarioId, Descricao, Valor, Tipo, Status, DataVencimento, Ordem, DataCriacao, MesVencimento, AnoVencimento)
    SELECT $1, $2, $3, '${TIPO.FIXA}', '${STATUS.PENDENTE}', $4, (SELECT COALESCE(MAX(Ordem), 0) + 1 FROM Lancamentos WHERE UsuarioId = $1), '1970-01-01',
           EXTRACT(MONTH FROM $4::timestamptz)::integer, EXTRACT(YEAR FROM $4::timestamptz)::integer
    WHERE NOT EXISTS (SELECT 1 FROM updated) AND NOT EXISTS (SELECT 1 FROM existing);
  `;

  await db.query(query, [userId, nomeConta, valor, dataVencimento]);
}

// ==============================================================================
// ✅ Batch UPSERT para divisões — Transação única com UNNEST
// ==============================================================================
// Substitui 3 operações sequenciais por 1 query bulk para evitar lock contention
async function bulkUpsertContasFixas(userId, operations) {
  if (!Array.isArray(operations) || operations.length === 0) return;

  console.log(`[BULK-UPSERT] 📦 bulkUpsertContasFixas chamado para userId=${userId} com ${operations.length} operação(ões)`);

  // Prepara arrays para UNNEST
  const descricoes = [];
  const valores = [];
  const vencimentos = [];
  const terceiros = [];

  operations.forEach(op => {
    descricoes.push(op.nomeConta);
    valores.push(op.valor);
    vencimentos.push(op.dataVencimento);
    terceiros.push(op.nomeTerceiro || null);
    console.log(`[BULK-UPSERT]   ├─ Operação: descricao="${op.nomeConta}", valor=${op.valor}, terceiro="${op.nomeTerceiro}", vencimento=${op.dataVencimento}`);
  });

  const month = operations[0].month;
  const year = operations[0].year;
  console.log(`[BULK-UPSERT]   └─ Mês/Ano: ${month}/${year}`);

  // Debug: verificar registros existentes antes do UPSERT
  const mes = operations[0].month;
  const ano = operations[0].year;
  const debugQuery = `
    SELECT Id, Descricao, Valor, NomeTerceiro
    FROM Lancamentos
    WHERE UsuarioId = $1
      AND Tipo = '${TIPO.FIXA}'
      AND MesVencimento = $2
      AND AnoVencimento = $3
      AND Descricao = ANY($4::text[])
  `;
  const debugResult = await db.query(debugQuery, [userId, mes, ano, descricoes]);
  console.log(`[BULK-UPSERT] 🔍 Registros existentes encontrados para userId=${userId}:`, JSON.stringify(debugResult.rows));

  // Query bulk com UNNEST — usa colunas computadas MesVencimento/AnoVencimento
  // Se ignoreTerceiro=true, atualiza TODOS os registros com mesmo nome (independente do terceiro)
  const ignoreTerceiro = operations[0]?.ignoreTerceiro || false;

  const terceiroCondition = ignoreTerceiro
    ? '' // Sem filtro de terceiro
    : `AND (
          (p.terceiro IS NULL AND (l.NomeTerceiro IS NULL OR l.NomeTerceiro = ''))
          OR l.NomeTerceiro = p.terceiro
        )`;

  const query = `
    WITH params AS (
      SELECT unnest($1::text[]) as descricao,
             unnest($2::numeric[]) as valor,
             unnest($3::timestamptz[]) as vencimento,
             unnest($4::text[]) as terceiro,
             generate_subscripts($1::text[], 1) as idx
    ),
    all_matches AS (
      SELECT l.Id, p.idx
      FROM Lancamentos l
      INNER JOIN params p ON l.Descricao = p.descricao
        AND l.UsuarioId = $5
        AND l.Tipo = '${TIPO.FIXA}'
        AND l.MesVencimento = EXTRACT(MONTH FROM p.vencimento::timestamptz)::integer
        AND l.AnoVencimento = EXTRACT(YEAR FROM p.vencimento::timestamptz)::integer
        ${terceiroCondition}
    ),
    updated AS (
      UPDATE Lancamentos l
      SET Valor = p.valor
      FROM all_matches am
      INNER JOIN params p ON p.idx = am.idx
      WHERE l.Id = am.Id
      RETURNING l.Id
    )
    INSERT INTO Lancamentos (UsuarioId, Descricao, Valor, Tipo, Status, DataVencimento, NomeTerceiro, Ordem, DataCriacao, MesVencimento, AnoVencimento)
    SELECT $5, p.descricao, p.valor, '${TIPO.FIXA}', '${STATUS.PENDENTE}', p.vencimento, p.terceiro,
           (SELECT COALESCE(MAX(Ordem), 0) + 1 FROM Lancamentos WHERE UsuarioId = $5),
           '1970-01-01',
           EXTRACT(MONTH FROM p.vencimento::timestamptz)::integer,
           EXTRACT(YEAR FROM p.vencimento::timestamptz)::integer
    FROM params p
    WHERE NOT EXISTS (
      SELECT 1 FROM Lancamentos l
      WHERE l.Descricao = p.descricao
        AND l.UsuarioId = $5
        AND l.Tipo = '${TIPO.FIXA}'
        AND l.MesVencimento = EXTRACT(MONTH FROM p.vencimento::timestamptz)::integer
        AND l.AnoVencimento = EXTRACT(YEAR FROM p.vencimento::timestamptz)::integer
        ${terceiroCondition}
    );
  `;

  console.log(`[BULK-UPSERT] ⚙️ Executando query bulk para userId=${userId}`);
  const result = await db.query(query, [descricoes, valores, vencimentos, terceiros, userId]);
  console.log(`[BULK-UPSERT] ✅ Query executada para userId=${userId} (rowCount=${result?.rowCount || 'N/A'})`);
}

async function findAndUpdateOrCreateContaFixaComTerceiro(userId, nomeConta, valor, month, year, nomeTerceiro) {
  const dataVencimento = new Date(year, month - 1, 10);

  const terceiro = nomeTerceiro || null;
  const terceiroCondition = terceiro ? 'NomeTerceiro = $6' : "(NomeTerceiro IS NULL OR NomeTerceiro = '')";

  const query = `
    WITH existing AS (
      SELECT Id FROM Lancamentos
      WHERE UsuarioId = $1 AND Descricao = $2 AND Tipo = '${TIPO.FIXA}'
        AND MesVencimento = EXTRACT(MONTH FROM $5::timestamptz)::integer
        AND AnoVencimento = EXTRACT(YEAR FROM $5::timestamptz)::integer
        AND ${terceiroCondition}
      LIMIT 1
    ),
    updated AS (
      UPDATE Lancamentos SET Valor = $3
      WHERE Id = (SELECT Id FROM existing)
      RETURNING Id
    )
    INSERT INTO Lancamentos (UsuarioId, Descricao, Valor, Tipo, Status, DataVencimento, NomeTerceiro, Ordem, DataCriacao, MesVencimento, AnoVencimento)
    SELECT $1, $2, $3, '${TIPO.FIXA}', '${STATUS.PENDENTE}', $5, $6, (SELECT COALESCE(MAX(Ordem), 0) + 1 FROM Lancamentos WHERE UsuarioId = $1), '1970-01-01',
           EXTRACT(MONTH FROM $5::timestamptz)::integer, EXTRACT(YEAR FROM $5::timestamptz)::integer
    WHERE NOT EXISTS (SELECT 1 FROM updated) AND NOT EXISTS (SELECT 1 FROM existing);
  `;

  await db.query(query, [userId, nomeConta, valor, null, dataVencimento, terceiro]);
}

// ==============================================================================
// ✅ Divisão de Conta — Transação ACID
// ==============================================================================
// ✅ OBS-20260601-16: Divisão sem retenção de conexão (GSD 4-D final)
// Usamos db.query direto em cada instrução para evitar starvation do pool.
async function dividirConta(userId, idOriginal, terceiros) {
  // Buscar conta original SEM FOR UPDATE (leitura simples, sem lock)
  const res = await db.query(
    'SELECT * FROM Lancamentos WHERE Id = $1 AND UsuarioId = $2',
    [idOriginal, userId]
  );
  const original = res.rows[0];
  if (!original) {
    throw new Error('CONTA_NAO_ENCONTRADA');
  }

  // Dedup e normalização dos terceiros
  const terceirosUnicos = [...new Set(terceiros.map((t) => t.trim()).filter(Boolean))];
  if (terceirosUnicos.length === 0) {
    throw new Error('NENHUM_TERCEIRO_VALIDO');
  }
  if (terceirosUnicos.length > 20) {
    throw new Error('LIMITE_TERCEIROS_EXCEDIDO');
  }

  // Cálculo da divisão com ajuste na origem
  const n = terceirosUnicos.length + 1; // original + novos
  const valorOriginal = Number(original.valor);
  if (valorOriginal <= 0) {
    throw new Error('VALOR_INVALIDO');
  }
  const valorPorParte = Math.floor((valorOriginal / n) * 100) / 100;
  const resto = Math.round((valorOriginal - valorPorParte * n) * 100) / 100;
  const valorOriginalAtualizado = Math.round((valorPorParte + resto) * 100) / 100;

  // Atualizar conta original com verificação otimista (sem FOR UPDATE)
  const updateRes = await db.query(
    'UPDATE Lancamentos SET Valor = $1 WHERE Id = $2 AND UsuarioId = $3 AND Valor = $4',
    [valorOriginalAtualizado, idOriginal, userId, valorOriginal]
  );
  if (updateRes.rowCount === 0) {
    throw new Error('CONTA_MODIFICADA_CONCORRENTE');
  }

  // Isolar a subquery MAX(Ordem) do INSERT (evita lock implícito de tabela)
  const maxOrdemRes = await db.query('SELECT COALESCE(MAX(Ordem), 0) AS max_ordem FROM Lancamentos WHERE UsuarioId = $1', [userId]);
  let currentOrdem = Number(maxOrdemRes.rows[0].max_ordem);

  // Inserir novas contas sequencialmente sem subqueries aninhadas
  for (const terceiro of terceirosUnicos) {
    currentOrdem++;
    const terceiroNormalizado = normalizarTerceiro(terceiro);
    await db.query(
      `INSERT INTO Lancamentos
        (UsuarioId, Descricao, Valor, Tipo, Categoria, Status, DataVencimento,
         ParcelaAtual, TotalParcelas, NomeTerceiro, Ordem)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        original.descricao,
        valorPorParte,
        original.tipo,
        original.categoria,
        original.status || STATUS.PENDENTE,
        original.datavencimento,
        original.parcelaatual || null,
        original.totalparcelas || null,
        terceiroNormalizado,
        currentOrdem
      ]
    );
  }

  // Buscar resumo de terceiros
  const dataVenc = new Date(original.datavencimento);
  const { startDate, endDate } = getMesRange(
    dataVenc.getMonth() + 1,
    dataVenc.getFullYear()
  );
  const resumoResult = await db.query(
    `SELECT
      NomeTerceiro AS nome,
      SUM(CASE WHEN Tipo = '${TIPO.CARTAO}' THEN Valor ELSE 0 END)::float AS "totalCartao",
      SUM(Valor)::float AS "totalGeral",
      COUNT(*) FILTER (WHERE Status = '${STATUS.PENDENTE}') AS "contasPendentes",
      COUNT(*) FILTER (WHERE Status = '${STATUS.PAGO}') AS "contasPagas"
    FROM Lancamentos
    WHERE UsuarioId = $1
      AND NomeTerceiro IS NOT NULL
      AND NomeTerceiro != ''
      AND DataVencimento >= $2
      AND DataVencimento < $3
    GROUP BY NomeTerceiro
    ORDER BY NomeTerceiro`,
    [userId, startDate, endDate]
  );

  return {
    success: true,
    partes: n,
    valorPorParte,
    valorOriginalAtualizado,
    terceiros: resumoResult.rows,
  };
}

// ==============================================================================
// Funções Auxiliares para Dashboard Modular
// ==============================================================================

async function getAnotacoes(userId, month, year) {
  // Busca anotação global (mes=0, ano=0) e mensal em paralelo
  const [global, mensal] = await Promise.all([
    db.query(`SELECT Conteudo FROM Anotacoes WHERE UsuarioId = $1 AND Mes = 0 AND Ano = 0 LIMIT 1`, [userId]),
    db.query(`SELECT Conteudo FROM Anotacoes WHERE UsuarioId = $1 AND Mes = $2 AND Ano = $3 LIMIT 1`, [userId, month, year])
  ]);

  return {
    global: global.rows[0]?.Conteudo || global.rows[0]?.conteudo || '',
    mensal: mensal.rows[0]?.Conteudo || mensal.rows[0]?.conteudo || ''
  };
}

async function getOrdemCards(userId) {
  const query = `SELECT * FROM OrdemCards WHERE UsuarioId = $1 ORDER BY Ordem ASC`;
  const result = await db.query(query, [userId]);
  return result.rows;
}

async function getFaturaManual(userId, month, year) {
  const query = `SELECT COALESCE(Valor, 0)::float AS valor FROM FaturaManual WHERE UsuarioId = $1 AND Mes = $2 AND Ano = $3`;
  const result = await db.query(query, [userId, month, year]);
  return result.rows[0]?.valor || 0;
}

async function isMesFechado(userId, month, year) {
  const query = `SELECT EXISTS(SELECT 1 FROM MesesFechados WHERE UsuarioId = $1 AND Mes = $2 AND Ano = $3)`;
  const result = await db.query(query, [userId, month, year]);
  return result.rows[0].exists;
}

// Invalida cache quando há mudanças
function invalidateDashboardCache(userId, month, year) {
  cache.invalidate(`dashboard:totais:${userId}:${month}:${year}`);
  cache.invalidate(`dashboard:distintos_terceiros:${userId}`);
}

module.exports = {
  normalizarTerceiro, // ✅ Exportar função de normalização
  getUltimosLancamentos,
  getRelatorioMensal,
  getDashboardTotals: getDashboardTotais,
  getLancamentosPorTipo,
  getDadosTerceiros,
  getLancamentosCartaoPorPessoa,
  getResumoPessoas,
  getDetalhesRendas,
  getDistinctTerceiros,
  getLancamentosTerceiro,
  getLancamento,
  getMesesAnosPorIds,
  getDashboardDataModular,
  invalidateDashboardCache,
  addLancamento,
  addLancamentosBulk, // ✅ Novo método exportado
  updateLancamento,
  updateStatus,
  updateConferido,
  updateConferidoExtrato,
  updateConferidoExtratoLote, // ✅ Novo método exportado
  updateStatusBatchPessoa,
  updateConferidoBatchRecent,
  reorderLancamentos,
  deleteLancamentosEmLote, // ✅ Novo método exportado
  moverLancamentosMes, // ✅ Novo método exportado
  dividirConta, // ✅ Novo método exportado
  getResumoTerceirosGrid, // ✅ OBS-20260601-03: Endpoint leve para atualização pós-divisão
  deleteLancamento,
  deleteLancamentosPorPessoa,
  deleteMonth,
  copyMonth,
  getTotalTerceiroCartao,
  findAndUpdateOrCreateContaFixa,
  findAndUpdateOrCreateContaFixaComTerceiro,
  bulkUpsertContasFixas, // ✅ Batch UPSERT para divisões
};
