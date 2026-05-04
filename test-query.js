const db = require('./src/config/db');
const { TIPO, STATUS, SQL_SEM_TERCEIRO } = require('./src/constants');

function getMesRange(month, year) {
  const startDate = new Date(year, month - 1, 1).toISOString();
  let nextMonth = parseInt(month, 10) + 1;
  let nextYear = parseInt(year, 10);
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  const endDate = new Date(nextYear, nextMonth - 1, 1).toISOString();
  return { startDate, endDate };
}

async function run() {
  const userId = 1;
  const month = 5;
  const year = 2026;
  const userName = 'Dodo';
  const { startDate, endDate } = getMesRange(month, year);
  const tiposContas = `'${TIPO.FIXA}', '${TIPO.CARTAO}'`;
  
  const query = `
    SELECT 
      (SELECT row_to_json(t) FROM (
        SELECT 
          COALESCE(SUM(CASE WHEN Tipo = '${TIPO.RENDA}' THEN Valor ELSE 0 END), 0)::float AS totalrendas,
          COALESCE(SUM(CASE WHEN Tipo IN (${tiposContas}) AND ${SQL_SEM_TERCEIRO} THEN Valor ELSE 0 END), 0)::float AS totalcontas,
          COALESCE(SUM(CASE WHEN Tipo IN (${tiposContas}) AND ${SQL_SEM_TERCEIRO} AND Status = '${STATUS.PENDENTE}' THEN Valor ELSE 0 END), 0)::float AS faltapagar,
          COALESCE(SUM(CASE WHEN Tipo = '${TIPO.RENDA}' THEN Valor ELSE 0 END) - 
                 SUM(CASE WHEN Tipo IN (${tiposContas}) AND ${SQL_SEM_TERCEIRO} THEN Valor ELSE 0 END), 0)::float AS saldoprevisto
        FROM Lancamentos WHERE UsuarioId = $1 AND DataVencimento >= $2 AND DataVencimento < $3
      ) t) AS totais,
      
      (SELECT COALESCE(json_agg(row_to_json(t)), '[]') FROM (
        SELECT * FROM Lancamentos 
        WHERE UsuarioId = $1 AND Tipo = '${TIPO.FIXA}' AND ${SQL_SEM_TERCEIRO} AND DataVencimento >= $2 AND DataVencimento < $3 
        ORDER BY Ordem ASC
      ) t) AS fixas,
      
      (SELECT COALESCE(json_agg(row_to_json(t)), '[]') FROM (
        SELECT * FROM Lancamentos 
        WHERE UsuarioId = $1 AND Tipo = '${TIPO.CARTAO}' AND ${SQL_SEM_TERCEIRO} AND DataVencimento >= $2 AND DataVencimento < $3 
        ORDER BY Ordem ASC
      ) t) AS cartao,
      
      (SELECT COALESCE(json_agg(row_to_json(t)), '[]') FROM (
        SELECT CASE WHEN ${SQL_SEM_TERCEIRO} THEN $4 ELSE NomeTerceiro END AS pessoa, 
               SUM(CASE WHEN Status = '${STATUS.PENDENTE}' THEN Valor ELSE 0 END)::float AS total, 
               CASE WHEN COUNT(*) = SUM(CASE WHEN Status = '${STATUS.PAGO}' THEN 1 ELSE 0 END) THEN 1 ELSE 0 END AS todospagos 
        FROM Lancamentos 
        WHERE UsuarioId = $1 AND Tipo = '${TIPO.CARTAO}' AND DataVencimento >= $2 AND DataVencimento < $3 
        GROUP BY NomeTerceiro 
        ORDER BY CASE WHEN ${SQL_SEM_TERCEIRO} THEN 0 ELSE 1 END, NomeTerceiro
      ) t) AS resumo_pessoas,
      
      (SELECT COALESCE(json_agg(row_to_json(t)), '[]') FROM (
        SELECT * FROM Lancamentos 
        WHERE UsuarioId = $1 AND (NomeTerceiro IS NOT NULL AND NomeTerceiro != '') AND DataVencimento >= $2 AND DataVencimento < $3 
        ORDER BY NomeTerceiro, Tipo, Ordem
      ) t) AS dados_terceiros,
      
      (SELECT COALESCE(Conteudo, '') FROM Anotacoes WHERE UsuarioId = $1 AND Mes = 0 AND Ano = 0 LIMIT 1) AS anotacoes,
      
      (SELECT COALESCE(json_agg(row_to_json(t)), '[]') FROM (
        SELECT * FROM OrdemCards WHERE UsuarioId = $1 ORDER BY Ordem ASC
      ) t) AS ordem_cards,
      
      (SELECT COALESCE(Valor, 0)::float FROM FaturaManual WHERE UsuarioId = $1 AND Mes = $5 AND Ano = $6) AS fatura_manual,
      
      EXISTS(SELECT 1 FROM MesesFechados WHERE UsuarioId = $1 AND Mes = $5 AND Ano = $6) AS mes_fechado,
      
      (SELECT COALESCE(json_agg(t.NomeTerceiro), '[]') FROM (
        SELECT DISTINCT NomeTerceiro FROM Lancamentos 
        WHERE UsuarioId = $1 AND NomeTerceiro IS NOT NULL AND NomeTerceiro != '' ORDER BY NomeTerceiro
      ) t) AS distintos_terceiros,
      
      (SELECT row_to_json(t) FROM (SELECT * FROM configuracoes WHERE usuario_id = $1) t) AS configuracoes
  `;
  
  const start = Date.now();
  const result = await db.query(query, [userId, startDate, endDate, userName, month, year]);
  console.log('Query took:', Date.now() - start, 'ms');
  console.log(result.rows[0].totais);
  console.log(result.rows[0].fixas.length);
  process.exit(0);
}
run().catch(console.error);