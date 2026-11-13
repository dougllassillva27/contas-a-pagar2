#!/usr/bin/env node
// ==============================================================================
// backfillRecorrencias.js — vincula lançamentos já existentes às recorrências
// e remove duplicatas criadas pelo "Gerar lançamentos do mês".
// ==============================================================================
// Uso (dry-run por padrão):
//   docker exec contas-a-pagar-preview node src/scripts/backfillRecorrencias.js --mes 11 --ano 2026
//   docker exec contas-a-pagar-preview node src/scripts/backfillRecorrencias.js --mes 11 --ano 2026 --aplicar
//
// O que faz:
//   1. Para cada lançamento COM RecorrenciaId, procura um equivalente SEM FK
//      (mesmo dono e mesmo valor ou descrição parecida). Se acha, move a FK
//      para o lançamento antigo e apaga o duplicado.
//   2. Depois, deduplica os que sobraram com mesma (recorrência, dono).
// ==============================================================================

'use strict';

const db = require('../config/db');

const arg = (nome, padrao = null) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
};
const APLICAR = process.argv.includes('--aplicar');
const USUARIO_ID = Number(arg('usuario', 1));
const hoje = new Date();
const MES = Number(arg('mes', hoje.getMonth() + 1));
const ANO = Number(arg('ano', hoje.getFullYear()));

const inicio = `${ANO}-${String(MES).padStart(2, '0')}-01`;
const proxMes = MES === 12 ? 1 : MES + 1;
const proxAno = MES === 12 ? ANO + 1 : ANO;
const fim = `${proxAno}-${String(proxMes).padStart(2, '0')}-01`;

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

const brl = (n) => 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

// Modo --somente-vincular: não cria nem apaga nada. Só liga as recorrências aos
// lançamentos que já existem no mês (mesmo dono e mesmo valor, ou descrição parecida).
// É o passo seguro para rodar em banco que nunca teve FK nenhuma.
async function vincularSomente() {
  const recs = await db.query(
    `SELECT id, descricao, valor_total::float AS valor_total, dia_cobranca,
            participantes::jsonb AS participantes
       FROM recorrencias
      WHERE usuario_id = $1 AND ativo = true
      ORDER BY id`,
    [USUARIO_ID]
  );

  const plano = [];
  const semPar = [];

  for (const r of recs.rows) {
    let partes = r.participantes;
    if (typeof partes === 'string') partes = JSON.parse(partes);
    if (!Array.isArray(partes) || !partes.length) partes = [{ dono: '', valor: Number(r.valor_total) }];

    for (const parte of partes) {
      const dono = String(parte.dono || '').trim();
      const valor = Number(parte.valor);
      if (!(valor > 0)) continue;

      const cands = await db.query(
        `SELECT id, descricao, valor::float AS valor
           FROM lancamentos
          WHERE usuarioid = $1
            AND recorrenciaid IS NULL
            AND COALESCE(nometerceiro, '') = $2
            AND datavencimento >= $3 AND datavencimento < $4
          ORDER BY id`,
        [USUARIO_ID, dono, inicio, fim]
      );

      const porValor = cands.rows.filter((c) => Math.abs(Number(c.valor) - valor) <= 0.01);
      const porDesc = cands.rows.filter((c) => descricaoParecida(c.descricao, r.descricao));
      const escolhido =
        (porValor.length === 1 && porValor[0]) ||
        porValor.find((c) => descricaoParecida(c.descricao, r.descricao)) ||
        (porDesc.length === 1 && porDesc[0]) ||
        null;

      if (escolhido) {
        plano.push({ recorrencia: r.descricao, dono, valor, lancamentoId: escolhido.id, descricao: escolhido.descricao });
      } else {
        semPar.push({ recorrencia: r.descricao, dono, valor });
      }
    }
  }

  console.log(`\n1) vincular ao lançamento existente: ${plano.length}`);
  for (const p of plano) {
    console.log(`   ${p.recorrencia} (${p.dono || 'eu'}, ${brl(p.valor)}) -> #${p.lancamentoId} "${p.descricao}"`);
  }
  console.log(`\n2) sem equivalente no mês (continua sem FK): ${semPar.length}`);
  for (const s of semPar) console.log(`   ${s.recorrencia} (${s.dono || 'eu'}, ${brl(s.valor)})`);

  if (!APLICAR) {
    console.log('\nNada foi alterado. Rode com --aplicar para executar.\n');
    return;
  }

  for (const p of plano) {
    await db.query('UPDATE lancamentos SET recorrenciaid = (SELECT id FROM recorrencias WHERE descricao = $1 AND usuario_id = $3) WHERE id = $2', [
      p.recorrencia,
      p.lancamentoId,
      USUARIO_ID,
    ]);
  }
  console.log(`\n✓ ${plano.length} vínculos gravados.`);
}

async function main() {
  console.log(`\n${APLICAR ? 'APLICANDO' : 'DRY-RUN'} — usuário ${USUARIO_ID}, ${MES}/${ANO}\n`);

  if (process.argv.includes('--somente-vincular')) {
    await vincularSomente();
    await db.pool?.end?.().catch(() => {});
    process.exit(0);
  }

  const comFk = await db.query(
    `SELECT l.id, l.recorrenciaid, r.descricao AS recorrencia,
            l.descricao, l.valor::float AS valor, COALESCE(l.nometerceiro, '') AS dono
       FROM lancamentos l
       JOIN recorrencias r ON r.id = l.recorrenciaid
      WHERE l.usuarioid = $1 AND l.datavencimento >= $2 AND l.datavencimento < $3
      ORDER BY l.recorrenciaid, l.id`,
    [USUARIO_ID, inicio, fim]
  );
  console.log(`lançamentos com FK no mês: ${comFk.rows.length}`);

  const transferir = [];
  const manter = [];

  for (const row of comFk.rows) {
    const cands = await db.query(
      `SELECT id, descricao, valor::float AS valor
         FROM lancamentos
        WHERE usuarioid = $1
          AND recorrenciaid IS NULL
          AND COALESCE(nometerceiro, '') = COALESCE($2, '')
          AND datavencimento >= $3 AND datavencimento < $4
        ORDER BY id`,
      [USUARIO_ID, row.dono, inicio, fim]
    );

    const porValor = cands.rows.filter((c) => Math.abs(Number(c.valor) - Number(row.valor)) <= 0.01);
    const porDescricao = cands.rows.filter((c) => descricaoParecida(c.descricao, row.recorrencia));

    const escolhido =
      (porValor.length === 1 && porValor[0]) ||
      porValor.find((c) => descricaoParecida(c.descricao, row.recorrencia)) ||
      (porDescricao.length === 1 && porDescricao[0]) ||
      null;

    if (escolhido) {
      transferir.push({ duplicado: row.id, manter: escolhido.id, recorrencia: row.recorrencia, dono: row.dono, valor: row.valor, descricaoAntiga: escolhido.descricao });
    } else {
      manter.push(row);
    }
  }

  console.log(`\n1) transferir FK para o lançamento que já existia: ${transferir.length}`);
  for (const t of transferir) {
    console.log(`   #${t.duplicado} (${t.recorrencia}, ${t.dono || 'eu'}, ${brl(t.valor)}) -> #${t.manter} "${t.descricaoAntiga}"`);
  }

  // duplicados que sobraram: mesma recorrência + mesmo dono
  const vistos = new Map();
  const apagarSobra = [];
  for (const row of manter) {
    const chave = `${row.recorrenciaid}|${row.dono}`;
    if (vistos.has(chave)) apagarSobra.push(row);
    else vistos.set(chave, row);
  }
  console.log(`\n2) duplicados restantes da mesma recorrência/dono: ${apagarSobra.length}`);
  for (const s of apagarSobra) console.log(`   #${s.id} ${s.recorrencia} (${s.dono || 'eu'}) ${brl(s.valor)}`);

  console.log(`\n3) mantidos (não tinham equivalente): ${manter.length - apagarSobra.length}`);
  for (const m of manter.filter((x) => !apagarSobra.includes(x))) {
    console.log(`   #${m.id} ${m.recorrencia} (${m.dono || 'eu'}) ${brl(m.valor)} "${m.descricao}"`);
  }

  if (!APLICAR) {
    console.log('\nNada foi alterado. Rode com --aplicar para executar.\n');
    await db.pool?.end?.().catch(() => {});
    process.exit(0);
  }

  let movidos = 0;
  for (const t of transferir) {
    await db.query('UPDATE lancamentos SET recorrenciaid = (SELECT recorrenciaid FROM lancamentos WHERE id = $1) WHERE id = $2', [t.duplicado, t.manter]);
    await db.query('DELETE FROM lancamentos WHERE id = $1', [t.duplicado]);
    movidos++;
  }
  for (const s of apagarSobra) {
    await db.query('DELETE FROM lancamentos WHERE id = $1', [s.id]);
  }

  console.log(`\n✓ ${movidos} FK transferidas, ${transferir.length} duplicados apagados, ${apagarSobra.length} sobras removidas.`);
  await db.pool?.end?.().catch(() => {});
  process.exit(0);
}

main().catch(async (err) => {
  console.error('✗ backfill falhou:', err.message);
  await db.pool?.end?.().catch(() => {});
  process.exit(1);
});
