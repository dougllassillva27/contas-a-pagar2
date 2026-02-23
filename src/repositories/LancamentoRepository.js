// ==============================================================================
// LancamentoRepository — Todas as queries e CRUD de Lançamentos
// ==============================================================================

const db = require('../config/db');
const { STATUS, TIPO, LIMITES, SQL_SEM_TERCEIRO } = require('../constants');

// --- LISTAGENS E DASHBOARD ---

async function getUltimosLancamentos(userId) {
  const query = `
      WITH Unicos AS (
          SELECT DISTINCT ON (date_trunc('second', DataCriacao), Descricao) * FROM Lancamentos 
          WHERE UsuarioId = $1 
          ORDER BY date_trunc('second', DataCriacao) DESC NULLS LAST, Descricao ASC, Id ASC
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
  await db.query(query, [userId, dados.descricao, dados.valor, dados.tipo, dados.categoria, dados.status || STATUS.PENDENTE, dataVencimento, dados.parcelaAtual || null, dados.totalParcelas || null, dados.nomeTerceiro || null]);
}

async function updateLancamento(userId, id, dados) {
  await db.query(
    `UPDATE Lancamentos 
     SET Descricao = $1, Valor = $2, Tipo = $3, Categoria = $4, 
         ParcelaAtual = $5, TotalParcelas = $6, NomeTerceiro = $7 
     WHERE Id = $8 AND UsuarioId = $9`,
    [dados.descricao, dados.valor, dados.tipo, dados.categoria, dados.parcelaAtual || null, dados.totalParcelas || null, dados.nomeTerceiro || null, id, userId]
  );
}

async function updateStatus(userId, id, novoStatus) {
  await db.query('UPDATE Lancamentos SET Status = $1 WHERE Id = $2 AND UsuarioId = $3', [novoStatus, id, userId]);
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

async function reorderLancamentos(userId, itens) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < itens.length; i++) {
      await client.query('UPDATE Lancamentos SET Ordem = $1 WHERE Id = $2 AND UsuarioId = $3', [i, itens[i].id, userId]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
  await db.query('DELETE FROM Lancamentos WHERE UsuarioId = $1 AND EXTRACT(MONTH FROM DataVencimento) = $2 AND EXTRACT(YEAR FROM DataVencimento) = $3', [userId, month, year]);
}

// ⚠️ ATENÇÃO: Esta função copia do mês informado para o PRÓXIMO mês.
// O frontend envia o mês que o usuário está visualizando.
// Exemplo: se o usuário está em Fevereiro e clica "Copiar",
//   → copia as fixas/parcelas de Fevereiro para Março.
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
        [userId, item.descricao, item.valor, item.tipo, item.categoria, novoStatus, newDate, novoParcelaAtual, totalParcelas, item.nometerceiro, item.ordem, dataCriacaoOriginal]
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
  addLancamento,
  updateLancamento,
  updateStatus,
  updateStatusBatchPessoa,
  reorderLancamentos,
  deleteLancamento,
  deleteLancamentosPorPessoa,
  deleteMonth,
  copyMonth,
};
