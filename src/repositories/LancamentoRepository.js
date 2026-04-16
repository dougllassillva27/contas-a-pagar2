// ==============================================================================
// LancamentoRepository — Todas as queries e CRUD de Lançamentos
// ==============================================================================

const db = require('../config/db');
const { STATUS, TIPO, LIMITES, SQL_SEM_TERCEIRO } = require('../constants');

// ==============================================================================
// ✅ NOVO: Helper para normalizar palavras-chave "Eu" ou "Dodo" para NULL
// ==============================================================================
function normalizarTerceiro(nome) {
  const nomeNormalizado = (nome || '').trim().toLowerCase();
  // Palavras-chave que representam "conta própria"
  if (['eu', 'dodo', ''].includes(nomeNormalizado)) {
    return null;
  }
  return nome.trim();
}

// --- LISTAGENS E DASHBOARD ---

async function getUltimosLancamentos(userId) {
  // ✅ CORREÇÃO: Adicionado NomeTerceiro no DISTINCT para não filtrar lançamentos em massa
  const query = `
      WITH Unicos AS (
          SELECT DISTINCT ON (date_trunc('second', DataCriacao), Descricao, COALESCE(NomeTerceiro, '')) 
            * 
          FROM Lancamentos 
          WHERE UsuarioId = $1 
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
        AND EXTRACT(MONTH FROM DataVencimento) = $2 
        AND EXTRACT(YEAR FROM DataVencimento) = $3
      ORDER BY 
          CASE WHEN ${SQL_SEM_TERCEIRO} THEN 0 ELSE 1 END, 
          NomeTerceiro, 
          Ordem
   `;
  const result = await db.query(query, [userId, month, year]);
  return result.rows;
}

async function getDashboardTotals(userId, month, year) {
  const tiposContas = `'${TIPO.FIXA}', '${TIPO.CARTAO}'`;
  const query = `
      SELECT 
          COALESCE(SUM(CASE WHEN Tipo = '${TIPO.RENDA}' THEN Valor ELSE 0 END), 0)::float AS totalrendas,
          COALESCE(SUM(CASE WHEN Tipo IN (${tiposContas}) AND ${SQL_SEM_TERCEIRO} THEN Valor ELSE 0 END), 0)::float AS totalcontas,
          COALESCE(SUM(CASE WHEN Tipo IN (${tiposContas}) AND ${SQL_SEM_TERCEIRO} AND Status = '${STATUS.PENDENTE}' THEN Valor ELSE 0 END), 0)::float AS faltapagar,
          COALESCE(SUM(CASE WHEN Tipo = '${TIPO.RENDA}' THEN Valor ELSE 0 END) - 
                 SUM(CASE WHEN Tipo IN (${tiposContas}) AND ${SQL_SEM_TERCEIRO} THEN Valor ELSE 0 END), 0)::float AS saldoprevisto
      FROM Lancamentos
      WHERE UsuarioId = $1 
        AND EXTRACT(MONTH FROM DataVencimento) = $2 
        AND EXTRACT(YEAR FROM DataVencimento) = $3
   `;
  const result = await db.query(query, [userId, month, year]);
  return result.rows[0];
}

async function getLancamentosPorTipo(userId, tipo, month, year) {
  const query = `
      SELECT * FROM Lancamentos 
      WHERE UsuarioId = $1 
        AND Tipo = $2 
        AND ${SQL_SEM_TERCEIRO} 
        AND EXTRACT(MONTH FROM DataVencimento) = $3 
        AND EXTRACT(YEAR FROM DataVencimento) = $4 
      ORDER BY Ordem ASC
   `;
  const result = await db.query(query, [userId, tipo, month, year]);
  return result.rows;
}

async function getDadosTerceiros(userId, month, year) {
  const query = `
      SELECT * FROM Lancamentos 
      WHERE UsuarioId = $1 
        AND (NomeTerceiro IS NOT NULL AND NomeTerceiro != '') 
        AND EXTRACT(MONTH FROM DataVencimento) = $2 
        AND EXTRACT(YEAR FROM DataVencimento) = $3 
      ORDER BY NomeTerceiro, Tipo, Ordem
   `;
  const result = await db.query(query, [userId, month, year]);
  return result.rows;
}

async function getLancamentosCartaoPorPessoa(userId, pessoa, month, year, userName) {
  let query = `
      SELECT * FROM Lancamentos 
      WHERE UsuarioId = $1 
        AND Tipo = '${TIPO.CARTAO}' 
        AND EXTRACT(MONTH FROM DataVencimento) = $2 
        AND EXTRACT(YEAR FROM DataVencimento) = $3
   `;
  const params = [userId, month, year];
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
        AND EXTRACT(MONTH FROM DataVencimento) = $2 
        AND EXTRACT(YEAR FROM DataVencimento) = $3 
      GROUP BY NomeTerceiro 
      ORDER BY CASE WHEN ${SQL_SEM_TERCEIRO} THEN 0 ELSE 1 END, NomeTerceiro
   `;
  const result = await db.query(query, [userId, month, year, userName]);
  return result.rows;
}

async function getDetalhesRendas(userId, month, year) {
  return getLancamentosPorTipo(userId, TIPO.RENDA, month, year);
}

async function getDistinctTerceiros(userId) {
  const result = await db.query(
    `SELECT DISTINCT NomeTerceiro FROM Lancamentos 
     WHERE UsuarioId = $1 AND NomeTerceiro IS NOT NULL AND NomeTerceiro != '' 
     ORDER BY NomeTerceiro`,
    [userId]
  );
  return result.rows.map((r) => r.nometerceiro);
}

// --- CRUD ---

async function addLancamento(userId, dados) {
  const dataVencimento = dados.dataBase ? new Date(dados.dataBase) : new Date();
  const query = `
      INSERT INTO Lancamentos 
        (UsuarioId, Descricao, Valor, Tipo, Categoria, Status, DataVencimento, 
         ParcelaAtual, TotalParcelas, NomeTerceiro, Ordem)  
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
        (SELECT COALESCE(MAX(Ordem), 0) + 1 FROM Lancamentos WHERE UsuarioId = $1))
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
    dados.nomeTerceiro || null,
  ]);
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
        AND EXTRACT(MONTH FROM DataVencimento) = $3 
        AND EXTRACT(YEAR FROM DataVencimento) = $4
   `;
  const params = [novoStatus, userId, month, year];
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
    for (let i = 0; i < itens.length; i++) {
      await client.query('UPDATE Lancamentos SET Ordem = $1 WHERE Id = $2 AND UsuarioId = $3', [
        i,
        itens[i].id,
        userId,
      ]);
    }
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
  let query = `DELETE FROM Lancamentos WHERE UsuarioId = $1 AND Tipo = '${TIPO.CARTAO}' AND EXTRACT(MONTH FROM DataVencimento) = $2 AND EXTRACT(YEAR FROM DataVencimento) = $3`;
  const params = [userId, month, year];
  if (pessoa === userName) {
    query += ` AND ${SQL_SEM_TERCEIRO}`;
  } else {
    query += ' AND NomeTerceiro = $4';
    params.push(pessoa);
  }
  await db.query(query, params);
}

async function deleteMonth(userId, month, year) {
  await db.query(
    'DELETE FROM Lancamentos WHERE UsuarioId = $1 AND EXTRACT(MONTH FROM DataVencimento) = $2 AND EXTRACT(YEAR FROM DataVencimento) = $3',
    [userId, month, year]
  );
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

    const res = await client.query(
      `SELECT * FROM Lancamentos 
       WHERE UsuarioId = $1 
         AND EXTRACT(MONTH FROM DataVencimento) = $2 
         AND EXTRACT(YEAR FROM DataVencimento) = $3 
         AND (Tipo IN ('${TIPO.FIXA}', '${TIPO.RENDA}') OR (ParcelaAtual IS NOT NULL AND TotalParcelas IS NOT NULL))`,
      [userId, currentMonth, currentYear]
    );

    const itemsToCopy = res.rows;
    if (itemsToCopy.length === 0) return;

    await client.query('BEGIN');
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

      // Garante que a cópia herde a data de criação original
      const dataCriacaoOriginal = item.datacriacao ? new Date(item.datacriacao) : new Date();

      await client.query(
        `INSERT INTO Lancamentos 
           (UsuarioId, Descricao, Valor, Tipo, Categoria, Status, DataVencimento, 
            ParcelaAtual, TotalParcelas, NomeTerceiro, Ordem, DataCriacao) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          userId,
          item.descricao,
          item.valor,
          item.tipo,
          item.categoria,
          novoStatus,
          newDate,
          novoParcelaAtual,
          totalParcelas,
          item.nometerceiro,
          item.ordem,
          dataCriacaoOriginal,
        ]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
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
        AND EXTRACT(MONTH FROM DataVencimento) = $3 
        AND EXTRACT(YEAR FROM DataVencimento) = $4 
      ORDER BY Tipo, Ordem ASC
   `;
  const result = await db.query(query, [userId, nome, month, year]);
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
      AND EXTRACT(MONTH FROM DataVencimento) = $3
      AND EXTRACT(YEAR FROM DataVencimento) = $4
  `;
  const result = await db.query(query, [userId, nome, month, year]);
  return result.rows[0]?.total || 0;
}

async function findAndUpdateOrCreateContaFixa(userId, nomeConta, valor, month, year) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const dataVencimento = new Date(year, month - 1, 10);

    const findQuery = `
      SELECT Id FROM Lancamentos
      WHERE UsuarioId = $1 AND Descricao = $2 AND Tipo = '${TIPO.FIXA}'
        AND EXTRACT(MONTH FROM DataVencimento) = $3 AND EXTRACT(YEAR FROM DataVencimento) = $4
      LIMIT 1
    `;
    const findResult = await client.query(findQuery, [userId, nomeConta, month, year]);
    const existingId = findResult.rows[0]?.id;

    if (existingId) {
      await client.query('UPDATE Lancamentos SET Valor = $1 WHERE Id = $2', [valor, existingId]);
    } else {
      const insertQuery = `
        INSERT INTO Lancamentos (UsuarioId, Descricao, Valor, Tipo, Status, DataVencimento, Ordem)
        VALUES ($1, $2, $3, $4, $5, $6, (SELECT COALESCE(MAX(Ordem), 0) + 1 FROM Lancamentos WHERE UsuarioId = $1))
      `;
      await client.query(insertQuery, [userId, nomeConta, valor, TIPO.FIXA, STATUS.PENDENTE, dataVencimento]);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getUltimosLancamentos,
  getRelatorioMensal,
  getDashboardTotals,
  getLancamentosPorTipo,
  getDadosTerceiros,
  getLancamentosCartaoPorPessoa,
  getResumoPessoas,
  getDetalhesRendas,
  getDistinctTerceiros,
  getLancamentosTerceiro,
  getLancamento,
  getMesesAnosPorIds,
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
  deleteLancamento,
  deleteLancamentosPorPessoa,
  deleteMonth,
  copyMonth,
  getTotalTerceiroCartao,
  findAndUpdateOrCreateContaFixa,
};
