#!/usr/bin/env node
// ==============================================================================
// backfillPluggyHistorico.js — popula o histórico de faturas (pluggy_faturas)
// ==============================================================================
// O pluggy_sync guarda SÓ a fatura aberta e é sobrescrito a cada sincronização.
// Isso deixa o motor de conciliação calibrado contra um único mês. Este script
// puxa a janela de meses anteriores direto da Pluggy e grava um snapshot por mês
// em pluggy_faturas, para poder rodar a bateria (antes/depois) em vários meses.
//
// Uso (dry-run por padrão):
//   docker exec contas-a-pagar node src/scripts/backfillPluggyHistorico.js --meses 6
//   docker exec contas-a-pagar node src/scripts/backfillPluggyHistorico.js --meses 6 --aplicar
//
// Limite conhecido: o agrupamento é por MÊS-CALENDÁRIO da data da transação, não
// pelo ciclo da fatura (que fecha num dia fixo). Serve como amostra de regressão
// do motor, não como conferência oficial da fatura.
// ==============================================================================

'use strict';

const db = require('../config/db');
const pluggy = require('../services/pluggyService');

const arg = (nome, padrao = null) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
};

const APLICAR = process.argv.includes('--aplicar');
const USUARIO_ID = Number(arg('usuario', 1));
const MESES = Math.min(Math.max(Number(arg('meses', 6)) || 6, 1), 12);

const iso = (d) => d.toISOString().slice(0, 10);
const valorDe = (t) => Number(t && t.amount) || 0;

function deslocar(base, dias) {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}

function chaveMes(transacao) {
  const bruto = transacao.date || transacao.creditCardMetadata?.purchaseDate;
  if (!bruto) return null;
  return String(bruto).slice(0, 7);
}

function ehPagamentoFatura(t) {
  return /pagamento\s*(de\s*)?fatura|pagto\s*fatura/i.test(t.description || '');
}

// Projeção de parcela não é cobrança (billForecastDate 0001-01 e sem billPostDate).
function ehProjecao(t) {
  const meta = t?.creditCardMetadata || {};
  const previsao = String(meta.billForecastDate || '');
  return !meta.billPostDate && (!previsao || previsao.startsWith('0001'));
}

async function main() {
  if (!pluggy.estaConfigurado()) {
    console.error('PLUGGY_* não configurado no .env');
    process.exit(1);
  }

  const conta = await pluggy.contaCartao();
  if (!conta) {
    console.error('Nenhuma conta de cartão encontrada no item Pluggy');
    process.exit(1);
  }

  const hoje = new Date();
  const de = iso(deslocar(hoje, -31 * MESES - 5));
  const ate = iso(deslocar(hoje, 1));
  console.log(`buscando transações de ${de} a ${ate} (${MESES} meses)`);

  const transacoes = await pluggy.listarTransacoes({ accountId: conta.id, de, ate });
  const uteis = transacoes.filter((t) => !ehProjecao(t) && !ehPagamentoFatura(t) && valorDe(t) !== 0);
  console.log(`recebidas ${transacoes.length} transações, ${uteis.length} entram no histórico`);

  const porMes = new Map();
  for (const t of uteis) {
    const mes = chaveMes(t);
    if (!mes) continue;
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(t);
  }

  const meses = [...porMes.keys()].sort().reverse();
  if (!meses.length) {
    console.log('nada para gravar');
    return;
  }

  for (const mes of meses) {
    const lista = porMes.get(mes);
    const total = lista.reduce((s, t) => s + (valorDe(t) > 0 ? valorDe(t) : 0), 0);
    const [ano, mm] = mes.split('-');
    const vencimento = `${ano}-${mm}-10`;
    const faturaId = `hist-${mes}`;
    console.log(`  ${mes}: ${lista.length} transações | compras R$ ${total.toFixed(2)} | fatura_id=${faturaId}`);
    if (!APLICAR) continue;
    await db.query(
      `INSERT INTO pluggy_faturas
         (usuario_id, fatura_id, cartao_label, fatura_total, fatura_vencimento,
          data_fechamento, transacoes, atualizado_em)
       VALUES ($1, $2, $3, $4, $5, NULL, $6::jsonb, NOW())
       ON CONFLICT (usuario_id, fatura_id) DO UPDATE SET
         fatura_total = EXCLUDED.fatura_total,
         transacoes = EXCLUDED.transacoes,
         atualizado_em = NOW()`,
      [USUARIO_ID, faturaId, conta.name || null, Number(total.toFixed(2)), vencimento, JSON.stringify(lista)]
    );
  }

  if (!APLICAR) {
    console.log('\nDRY-RUN: nada gravado. Rode com --aplicar para gravar.');
  } else {
    console.log(`\n✅ histórico gravado: ${meses.length} mês(es)`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('erro:', err.message);
    process.exit(1);
  });
