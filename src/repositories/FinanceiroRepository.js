const db = require('../config/db');

class FinanceiroRepository {
  constructor() {
    this.initOrdemTable();
  }

  // --- USUÁRIOS ---
  async obterUsuarioPorLogin(login) {
    try {
      const result = await db.query('SELECT * FROM Usuarios WHERE Login = $1', [login]);
      return result.rows[0];
    } catch (err) {
      return null;
    }
  }

  async getUsuarioById(id) {
    try {
      const result = await db.query('SELECT * FROM Usuarios WHERE Id = $1', [id]);
      return result.rows[0];
    } catch (err) {
      return null;
    }
  }

  async initOrdemTable() {
    try {
      await db.query(`
                CREATE TABLE IF NOT EXISTS OrdemCards (
                    Id SERIAL PRIMARY KEY,
                    Nome VARCHAR(255) NOT NULL,
                    Ordem INT NOT NULL,
                    UsuarioId INT DEFAULT 1
                )
            `);
    } catch (err) {
      console.error('Erro initOrdemTable:', err);
    }
  }

  // --- DASHBOARD E LISTAGENS ---
  async getUltimosLancamentos(userId) {
    const query = `SELECT * FROM Lancamentos WHERE UsuarioId = $1 ORDER BY Id DESC LIMIT 20`;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  async getRelatorioMensal(userId, month, year) {
    const query = `
            SELECT * FROM Lancamentos 
            WHERE UsuarioId = $1 
              AND Tipo = 'CARTAO' 
              AND EXTRACT(MONTH FROM DataVencimento) = $2 
              AND EXTRACT(YEAR FROM DataVencimento) = $3
            ORDER BY 
                CASE WHEN NomeTerceiro IS NULL OR NomeTerceiro = '' THEN 0 ELSE 1 END, 
                NomeTerceiro, 
                Ordem
        `;
    const result = await db.query(query, [userId, month, year]);
    return result.rows;
  }

  // NOVO MÉTODO: Suporte para nomes dinâmicos (Corrige erro 404/SyntaxError)
  async getRelatorioMensalPorPessoa(userId, nome, month, year) {
    const query = `
        SELECT * FROM Lancamentos 
        WHERE UsuarioId = $1 
          AND NomeTerceiro = $2 
          AND Tipo = 'CARTAO' 
          AND EXTRACT(MONTH FROM DataVencimento) = $3 
          AND EXTRACT(YEAR FROM DataVencimento) = $4
        ORDER BY DataVencimento ASC, Id ASC
    `;
    const result = await db.query(query, [userId, nome, month, year]);
    return result.rows;
  }

  async getFaturaManual(userId, month, year) {
    try {
      const result = await db.query('SELECT Valor FROM FaturaManual WHERE UsuarioId = $1 AND Mes = $2 AND Ano = $3', [userId, month, year]);
      return parseFloat(result.rows[0]?.valor) || 0;
    } catch (err) {
      return 0;
    }
  }

  async saveFaturaManual(userId, month, year, valor) {
    const check = await db.query('SELECT Id FROM FaturaManual WHERE UsuarioId = $1 AND Mes = $2 AND Ano = $3', [userId, month, year]);
    if (check.rows.length > 0) {
      await db.query('UPDATE FaturaManual SET Valor = $4 WHERE UsuarioId = $1 AND Mes = $2 AND Ano = $3', [userId, month, year, valor]);
    } else {
      await db.query('INSERT INTO FaturaManual (UsuarioId, Mes, Ano, Valor) VALUES ($1, $2, $3, $4)', [userId, month, year, valor]);
    }
  }

  async getOrdemCards(userId) {
    const result = await db.query('SELECT * FROM OrdemCards WHERE UsuarioId = $1 ORDER BY Ordem ASC', [userId]);
    return result.rows;
  }

  async saveOrdemCards(userId, listaNomes) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM OrdemCards WHERE UsuarioId = $1', [userId]);
      for (let i = 0; i < listaNomes.length; i++) {
        await client.query('INSERT INTO OrdemCards (Nome, Ordem, UsuarioId) VALUES ($1, $2, $3)', [listaNomes[i], i, userId]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getDashboardTotals(userId, month, year) {
    const query = `
            SELECT 
                COALESCE(SUM(CASE WHEN Tipo = 'RENDA' THEN Valor ELSE 0 END), 0)::float AS totalrendas,
                COALESCE(SUM(CASE WHEN Tipo IN ('FIXA', 'CARTAO') AND (NomeTerceiro IS NULL OR NomeTerceiro = '') THEN Valor ELSE 0 END), 0)::float AS totalcontas,
                COALESCE(SUM(CASE WHEN Tipo IN ('FIXA', 'CARTAO') AND (NomeTerceiro IS NULL OR NomeTerceiro = '') AND Status = 'PENDENTE' THEN Valor ELSE 0 END), 0)::float AS faltapagar,
                COALESCE(SUM(CASE WHEN Tipo = 'RENDA' THEN Valor ELSE 0 END) - 
                       SUM(CASE WHEN Tipo IN ('FIXA', 'CARTAO') AND (NomeTerceiro IS NULL OR NomeTerceiro = '') THEN Valor ELSE 0 END), 0)::float AS saldoprevisto
            FROM Lancamentos
            WHERE UsuarioId = $1 
              AND EXTRACT(MONTH FROM DataVencimento) = $2 
              AND EXTRACT(YEAR FROM DataVencimento) = $3
        `;
    const result = await db.query(query, [userId, month, year]);
    return result.rows[0];
  }

  async getLancamentosPorTipo(userId, tipo, month, year) {
    const query = `
            SELECT * FROM Lancamentos 
            WHERE UsuarioId = $1 
              AND Tipo = $2 
              AND (NomeTerceiro IS NULL OR NomeTerceiro = '') 
              AND EXTRACT(MONTH FROM DataVencimento) = $3 
              AND EXTRACT(YEAR FROM DataVencimento) = $4 
            ORDER BY Ordem ASC
        `;
    const result = await db.query(query, [userId, tipo, month, year]);
    return result.rows;
  }

  async getDadosTerceiros(userId, month, year) {
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

  async getLancamentosCartaoPorPessoa(userId, pessoa, month, year, userName) {
    let query = `
            SELECT * FROM Lancamentos 
            WHERE UsuarioId = $1 
              AND Tipo = 'CARTAO' 
              AND EXTRACT(MONTH FROM DataVencimento) = $2 
              AND EXTRACT(YEAR FROM DataVencimento) = $3
        `;
    const params = [userId, month, year];
    if (pessoa === userName) {
      query += " AND (NomeTerceiro IS NULL OR NomeTerceiro = '')";
    } else {
      query += ' AND NomeTerceiro = $4';
      params.push(pessoa);
    }
    query += ' ORDER BY Ordem ASC';
    const result = await db.query(query, params);
    return result.rows;
  }

  async getResumoPessoas(userId, month, year, userName) {
    const query = `
            SELECT 
                CASE WHEN (NomeTerceiro IS NULL OR NomeTerceiro = '') THEN $4 ELSE NomeTerceiro END AS pessoa, 
                SUM(CASE WHEN Status = 'PENDENTE' THEN Valor ELSE 0 END)::float AS total, 
                CASE WHEN COUNT(*) = SUM(CASE WHEN Status = 'PAGO' THEN 1 ELSE 0 END) THEN 1 ELSE 0 END AS todospagos 
            FROM Lancamentos 
            WHERE UsuarioId = $1 
              AND Tipo = 'CARTAO' 
              AND EXTRACT(MONTH FROM DataVencimento) = $2 
              AND EXTRACT(YEAR FROM DataVencimento) = $3 
            GROUP BY NomeTerceiro 
            ORDER BY CASE WHEN (NomeTerceiro IS NULL OR NomeTerceiro = '') THEN 0 ELSE 1 END, NomeTerceiro
        `;
    const result = await db.query(query, [userId, month, year, userName]);
    return result.rows;
  }

  async getDetalhesRendas(userId, month, year) {
    return this.getLancamentosPorTipo(userId, 'RENDA', month, year);
  }

  // --- CRUD ---
  async addLancamento(userId, dados) {
    const dataVencimento = dados.dataBase ? new Date(dados.dataBase) : new Date();
    const query = `
            INSERT INTO Lancamentos (UsuarioId, Descricao, Valor, Tipo, Categoria, Status, DataVencimento, ParcelaAtual, TotalParcelas, NomeTerceiro, Ordem) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
            (SELECT COALESCE(MAX(Ordem), 0) + 1 FROM Lancamentos WHERE UsuarioId = $1))
        `;
    await db.query(query, [userId, dados.descricao, dados.valor, dados.tipo, dados.categoria, dados.status || 'PENDENTE', dataVencimento, dados.parcelaAtual || null, dados.totalParcelas || null, dados.nomeTerceiro || null]);
  }

  async updateLancamento(userId, id, dados) {
    await db.query(`UPDATE Lancamentos SET Descricao = $1, Valor = $2, Tipo = $3, Categoria = $4, ParcelaAtual = $5, TotalParcelas = $6, NomeTerceiro = $7 WHERE Id = $8 AND UsuarioId = $9`, [dados.descricao, dados.valor, dados.tipo, dados.categoria, dados.parcelaAtual || null, dados.totalParcelas || null, dados.nomeTerceiro || null, id, userId]);
  }

  async updateStatus(userId, id, novoStatus) {
    await db.query('UPDATE Lancamentos SET Status = $1 WHERE Id = $2 AND UsuarioId = $3', [novoStatus, id, userId]);
  }

  async updateStatusBatchPessoa(userId, pessoa, novoStatus, month, year, userName) {
    let query = `
            UPDATE Lancamentos SET Status = $1 
            WHERE UsuarioId = $2 
              AND Tipo = 'CARTAO' 
              AND EXTRACT(MONTH FROM DataVencimento) = $3 
              AND EXTRACT(YEAR FROM DataVencimento) = $4
        `;
    const params = [novoStatus, userId, month, year];
    if (pessoa === userName) {
      query += " AND (NomeTerceiro IS NULL OR NomeTerceiro = '')";
    } else {
      query += ' AND NomeTerceiro = $5';
      params.push(pessoa);
    }
    await db.query(query, params);
  }

  async reorderLancamentos(userId, itens) {
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

  async deleteLancamento(userId, id) {
    await db.query('DELETE FROM Lancamentos WHERE Id = $1 AND UsuarioId = $2', [id, userId]);
  }

  async getAnotacoes(userId) {
    const result = await db.query('SELECT Conteudo FROM Anotacoes WHERE UsuarioId = $1 LIMIT 1', [userId]);
    return result.rows[0]?.conteudo || '';
  }

  async updateAnotacoes(userId, texto) {
    const check = await db.query('SELECT Id FROM Anotacoes WHERE UsuarioId = $1', [userId]);
    if (check.rows.length > 0) {
      await db.query('UPDATE Anotacoes SET Conteudo = $1 WHERE UsuarioId = $2', [texto, userId]);
    } else {
      await db.query('INSERT INTO Anotacoes (Conteudo, UsuarioId) VALUES ($1, $2)', [texto, userId]);
    }
  }

  async deleteMonth(userId, month, year) {
    await db.query('DELETE FROM Lancamentos WHERE UsuarioId = $1 AND EXTRACT(MONTH FROM DataVencimento) = $2 AND EXTRACT(YEAR FROM DataVencimento) = $3', [userId, month, year]);
  }

  async copyMonth(userId, currentMonth, currentYear) {
    const client = await db.getClient();
    try {
      let nextMonth = currentMonth + 1;
      let nextYear = currentYear;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
      }

      const res = await client.query(
        `
                SELECT * FROM Lancamentos 
                WHERE UsuarioId = $1 
                  AND EXTRACT(MONTH FROM DataVencimento) = $2 
                  AND EXTRACT(YEAR FROM DataVencimento) = $3 
                  AND (Tipo IN ('FIXA', 'RENDA') OR (ParcelaAtual IS NOT NULL AND TotalParcelas IS NOT NULL))
            `,
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
        const novoStatus = item.tipo === 'RENDA' ? 'PAGO' : 'PENDENTE';

        await client.query(
          `
                    INSERT INTO Lancamentos (UsuarioId, Descricao, Valor, Tipo, Categoria, Status, DataVencimento, ParcelaAtual, TotalParcelas, NomeTerceiro, Ordem) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `,
          [userId, item.descricao, item.valor, item.tipo, item.categoria, novoStatus, newDate, novoParcelaAtual, totalParcelas, item.nometerceiro, item.ordem]
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

  async getAllDataForBackup(userId) {
    const lancamentos = await db.query('SELECT * FROM Lancamentos WHERE UsuarioId = $1 ORDER BY DataVencimento DESC, Id DESC', [userId]);
    const anotacoes = await db.query('SELECT * FROM Anotacoes WHERE UsuarioId = $1', [userId]);
    return { backup_date: new Date(), lancamentos: lancamentos.rows, anotacoes: anotacoes.rows };
  }
}

module.exports = new FinanceiroRepository();
