#!/usr/bin/env node
// ==============================================================================
// seedRecorrencias.js — cadastra as recorrências do cartão do Douglas
// ==============================================================================
// Idempotente: se a recorrência já existe (mesma descrição), não duplica.
// Rodar dentro do container:
//   docker exec contas-a-pagar-preview node src/scripts/seedRecorrencias.js
//
// `participantes` guarda o rateio por pessoa: uma cobrança no banco pode virar
// N lançamentos no app (ex.: Petz = 3× 97,90 entre Mãe, Vô e o próprio).
// ==============================================================================

'use strict';

const db = require('../config/db');

const USUARIO_ID = Number(process.env.SEED_USUARIO_ID || 1);

const RECORRENCIAS = [
  { descricao: 'Seguro Voyage', valorTotal: 185.55, diaCobranca: null, participantes: [{ dono: '', valor: 185.55 }] },
  { descricao: 'Estácio', valorTotal: 304.0, diaCobranca: null, participantes: [{ dono: '', valor: 304.0 }] },
  {
    descricao: 'Petz (ração)',
    valorTotal: 293.7,
    diaCobranca: 8,
    participantes: [
      { dono: 'Mãe', valor: 97.9 },
      { dono: 'Vô', valor: 97.9 },
      { dono: '', valor: 97.9 },
    ],
  },
  { descricao: 'Amil Dental Morr', valorTotal: 93.17, diaCobranca: 21, participantes: [{ dono: 'Morr', valor: 93.17 }] },
  { descricao: 'Amil Dental Lorenzo', valorTotal: 34.29, diaCobranca: 16, participantes: [{ dono: 'Morr', valor: 34.29 }] },
  { descricao: 'Claro Flex Dodo', valorTotal: 19.99, diaCobranca: 6, participantes: [{ dono: '', valor: 19.99 }] },
  { descricao: 'Claro Flex Morr', valorTotal: 19.99, diaCobranca: 25, participantes: [{ dono: 'Morr', valor: 19.99 }] },
  {
    descricao: 'Claro Flex Lorenzo',
    valorTotal: 34.9,
    diaCobranca: 8,
    participantes: [
      { dono: '', valor: 17.45 },
      { dono: 'Morr', valor: 17.45 },
    ],
  },
  { descricao: 'Claro Flex mãe', valorTotal: 49.99, diaCobranca: 21, participantes: [{ dono: 'Mãe', valor: 49.99 }] },
  { descricao: 'Claro Flex negão', valorTotal: 49.99, diaCobranca: 19, participantes: [{ dono: 'Davi', valor: 49.99 }] },
];

async function main() {
  let criadas = 0;
  let existentes = 0;

  for (const r of RECORRENCIAS) {
    const jaTem = await db.query('SELECT id FROM recorrencias WHERE usuario_id = $1 AND lower(descricao) = lower($2)', [
      USUARIO_ID,
      r.descricao,
    ]);
    if (jaTem.rows.length) {
      existentes++;
      continue;
    }
    await db.query(
      `INSERT INTO recorrencias (usuario_id, descricao, valor_total, dia_cobranca, participantes)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [USUARIO_ID, r.descricao, r.valorTotal, r.diaCobranca, JSON.stringify(r.participantes)]
    );
    criadas++;
  }

  console.log(`✅ recorrências: ${criadas} criadas, ${existentes} já existiam (usuário ${USUARIO_ID})`);
  await db.pool?.end?.().catch(() => {});
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ seed falhou:', err.message);
  process.exit(1);
});
