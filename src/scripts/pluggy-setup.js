#!/usr/bin/env node
// ==============================================================================
// pluggy-setup.js — salva e valida as credenciais do Meu Pluggy no .env
// ==============================================================================
// Uso:
//   node scripts/pluggy-setup.js            # configura (pergunta tudo)
//   node scripts/pluggy-setup.js --check    # só valida o que já está no .env
//   node scripts/pluggy-setup.js --debug    # mostra o JSON cru das contas/faturas
//
// O que faz:
//   1. Pede Client ID, Client Secret (eco mascarado) e Item ID
//   2. Troca por uma apiKey (POST /auth) e valida na hora
//   3. Lista as contas do item e escolhe a de cartão de crédito
//   4. Lê GET /bills e mostra o total da última fatura (prova ponta a ponta)
//   5. Grava PLUGGY_* no .env do app (chmod 600), sem nunca imprimir o secret
//
// Nenhuma dependência externa: usa fetch nativo do Node 18+.
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://api.pluggy.ai';
// Permite testar a escrita num arquivo temporário sem tocar no .env de produção
const ENV_FILE = process.env.PLUGGY_SETUP_ENV_FILE
  ? path.resolve(process.env.PLUGGY_SETUP_ENV_FILE)
  : path.resolve(__dirname, '..', '.env');
const TIMEOUT_MS = 25000;

// Chaves que este script gerencia no .env
const KEYS = {
  clientId: 'PLUGGY_CLIENT_ID',
  clientSecret: 'PLUGGY_CLIENT_SECRET',
  itemId: 'PLUGGY_ITEM_ID',
  accountId: 'PLUGGY_ACCOUNT_ID',
  label: 'PLUGGY_CARTAO_LABEL',
};

const argv = process.argv.slice(2);
const FLAG_CHECK = argv.includes('--check');
const FLAG_DEBUG = argv.includes('--debug');
const FLAG_HELP = argv.includes('--help') || argv.includes('-h');

// ==============================================================================
// Entrada de terminal (raw mode: controla eco, permite secret sem exibir)
// ==============================================================================

// Fila de linhas para quando o stdin não é um TTY (pipe/heredoc):
// sem isso, o primeiro prompt consome o buffer inteiro e os seguintes travam.
const piped = { buffer: '', done: false, waiters: [] };

function initPipedReader() {
  if (process.stdin.isTTY) return;
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    piped.buffer += chunk;
    flushPiped();
  });
  process.stdin.on('end', () => {
    piped.done = true;
    flushPiped();
  });
  process.stdin.on('error', () => {
    piped.done = true;
    flushPiped();
  });
  process.stdin.resume();
}

function flushPiped() {
  let idx;
  while (piped.waiters.length && (idx = piped.buffer.indexOf('\n')) >= 0) {
    const line = piped.buffer.slice(0, idx).trim();
    piped.buffer = piped.buffer.slice(idx + 1);
    piped.waiters.shift()(line);
  }
  if (piped.done) {
    while (piped.waiters.length) {
      const rest = piped.buffer.trim();
      piped.buffer = '';
      piped.waiters.shift()(rest);
    }
  }
}

function readLine(question, { hidden = false, fallback = '' } = {}) {
  const stdin = process.stdin;
  const stdout = process.stdout;

  const hint = fallback ? ' [Enter mantém o atual]' : '';
  stdout.write(`${question}${hint}: `);

  // Sem TTY (pipe/CI): consome uma linha da fila
  if (!stdin.isTTY) {
    return new Promise((resolve) => {
      piped.waiters.push((line) => {
        if (hidden) stdout.write('(recebido)\n');
        resolve(line || fallback);
      });
      initPipedReader();
      flushPiped();
    });
  }

  return new Promise((resolve) => {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let buf = '';

    const finish = (value) => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      resolve(value);
    };

    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\u0003') {
          // Ctrl+C
          stdout.write('\n');
          process.exit(130);
        } else if (ch === '\r' || ch === '\n') {
          const value = buf.trim() || fallback;
          if (!buf.trim() && !fallback) {
            stdout.write('(obrigatório)\n');
            stdout.write(`${question}: `);
            continue;
          }
          return finish(value);
        } else if (ch === '\u007f' || ch === '\b') {
          if (buf.length) {
            buf = buf.slice(0, -1);
            stdout.write('\b \b');
          }
        } else if (ch === '\u001b') {
          // setas/esc: ignora
        } else if (ch >= ' ') {
          buf += ch;
          stdout.write(hidden ? '*' : ch);
        }
      }
    };

    stdin.on('data', onData);
  });
}

function confirm(question, defaultYes = true) {
  return readLine(`${question} (${defaultYes ? 'S/n' : 's/N'})`).then((a) => {
    const v = a.toLowerCase();
    if (!v) return defaultYes;
    return v === 's' || v === 'sim' || v === 'y' || v === 'yes';
  });
}

// ==============================================================================
// Leitura/escrita do .env
// ==============================================================================

function readEnvFile() {
  if (!fs.existsSync(ENV_FILE)) return { raw: '', vars: {} };
  const raw = fs.readFileSync(ENV_FILE, 'utf8');
  const vars = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[m[1]] = value;
  }
  return { raw, vars };
}

function upsertEnvFile(pairs) {
  const exists = fs.existsSync(ENV_FILE);
  const raw = exists ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  const lines = raw.length ? raw.split('\n') : [];

  for (const [key, value] of Object.entries(pairs)) {
    if (/[\r\n]/.test(value)) throw new Error(`Valor de ${key} contém quebra de linha`);
    const entry = `${key}=${value}`;
    const idx = lines.findIndex((l) => new RegExp(`^\\s*${key}\\s*=`).test(l));
    if (idx >= 0) lines[idx] = entry;
    else {
      // remove linhas vazias no fim antes de acrescentar
      while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
      lines.push(entry);
    }
  }

  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', { mode: 0o600 });
  fs.chmodSync(ENV_FILE, 0o600);
}

// ==============================================================================
// Cliente mínimo da API Pluggy
// ==============================================================================

async function pluggy(pathname, { apiKey, method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-KEY'] = apiKey;

  const res = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const detail = data && (data.message || data.error || data.raw) ? data.message || data.error || data.raw : '';
    const err = new Error(`HTTP ${res.status} em ${method} ${pathname}: ${detail}`);
    err.status = res.status;
    err.data = data;
    err.retryAfter = res.headers.get('Retry-After');
    throw err;
  }
  return data;
}

async function authenticate(clientId, clientSecret) {
  const data = await pluggy('/auth', {
    method: 'POST',
    body: { clientId, clientSecret },
  });
  if (!data || !data.apiKey) throw new Error('A API respondeu sem apiKey.');
  return data.apiKey;
}

async function listAccounts(apiKey, itemId) {
  const data = await pluggy(`/accounts?itemId=${encodeURIComponent(itemId)}`, { apiKey });
  const list = Array.isArray(data) ? data : data?.results || [];
  return list;
}

async function listBills(apiKey, accountId) {
  const data = await pluggy(`/bills?accountId=${encodeURIComponent(accountId)}`, { apiKey });
  const list = Array.isArray(data) ? data : data?.results || [];
  return list.map((b) => ({
    id: b.id,
    dueDate: b.dueDate ? String(b.dueDate).slice(0, 10) : null,
    totalAmount: Number(b.totalAmount) || 0,
    minimumPaymentAmount: b.minimumPaymentAmount != null ? Number(b.minimumPaymentAmount) : null,
  }));
}

// ==============================================================================
// Helpers de apresentação
// ==============================================================================

const brl = (n) =>
  'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function mask(secret) {
  if (!secret) return '(vazio)';
  if (secret.length <= 8) return '*'.repeat(secret.length);
  return `${secret.slice(0, 4)}${'•'.repeat(Math.min(secret.length - 6, 14))}${secret.slice(-2)} (${secret.length} chars)`;
}

function isCreditCard(acc) {
  return acc.type === 'CREDIT' && (acc.subtype === 'CREDIT_CARD' || !acc.subtype);
}

function accountLabel(acc) {
  const bits = [
    acc.name || acc.marketingName || '(sem nome)',
    acc.number ? `final ${acc.number}` : null,
    acc.creditData?.brand || null,
    acc.creditData?.level || null,
  ].filter(Boolean);
  return bits.join(' • ');
}

function cycleLine(acc) {
  const cd = acc.creditData;
  if (!cd) return '';
  const parts = [];
  if (cd.balanceCloseDate) parts.push(`fecha ${String(cd.balanceCloseDate).slice(0, 10)}`);
  if (cd.balanceDueDate) parts.push(`vence ${String(cd.balanceDueDate).slice(0, 10)}`);
  if (cd.creditLimit != null) parts.push(`limite ${brl(cd.creditLimit)}`);
  if (cd.availableCreditLimit != null) parts.push(`disponível ${brl(cd.availableCreditLimit)}`);
  return parts.length ? parts.join(' · ') : '';
}

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '').trim());
}

function printHelp() {
  console.log(`
pluggy-setup — credenciais do Meu Pluggy no .env do contas-a-pagar

  node scripts/pluggy-setup.js           configura e valida (interativo)
  node scripts/pluggy-setup.js --check   só valida as credenciais já salvas
  node scripts/pluggy-setup.js --debug   imprime o JSON cru de contas e faturas

Onde pegar os dados:
  Client ID / Client Secret : dashboard.pluggy.ai → Aplicações → sua aplicação
  Item ID                   : mesma aplicação → aba Demo → Itens Conectados → clicar no item

O secret NÃO é exibido na tela nem neste histórico; só o .env guarda (chmod 600).
Arquivo alvo: ${ENV_FILE}
`);
}

// ==============================================================================
// Fluxo principal
// ==============================================================================

async function runCheck(envVars) {
  const clientId = envVars[KEYS.clientId];
  const clientSecret = envVars[KEYS.clientSecret];
  const itemId = envVars[KEYS.itemId];

  if (!clientId || !clientSecret || !itemId) {
    console.error('✗ Faltam credenciais no .env:');
    for (const [k, v] of Object.entries(KEYS)) {
      if (k === 'accountId' || k === 'label') continue;
      if (!envVars[v]) console.error(`  - ${v} ausente`);
    }
    console.error('\nRode sem --check para configurar.');
    process.exit(1);
  }

  console.log('→ Autenticando…');
  const apiKey = await authenticate(clientId, clientSecret);
  console.log('✓ apiKey obtida\n');

  const accounts = await listAccounts(apiKey, itemId);
  console.log(`✓ ${accounts.length} conta(s) no item ${itemId}`);
  for (const acc of accounts) {
    const marca = isCreditCard(acc) ? '💳' : '  ';
    console.log(`  ${marca} ${acc.type}/${acc.subtype || '-'} — ${accountLabel(acc)}`);
    const ciclo = cycleLine(acc);
    if (ciclo) console.log(`      ↳ ${ciclo}`);
  }

  const accountId = envVars[KEYS.accountId];
  if (!accountId) {
    console.log('\n! PLUGGY_ACCOUNT_ID não configurado — rode sem --check para escolher o cartão.');
    return;
  }

  const bills = await listBills(apiKey, accountId);
  printBills(bills, accountId);
}

function printBills(bills, accountId) {
  if (!bills.length) {
    console.log(`\n! Nenhuma fatura retornada para a conta ${accountId}`);
    console.log('  (contas de cartão recém-conectadas podem levar algumas horas para popular)');
    return;
  }
  const ordered = [...bills].sort((a, b) => String(b.dueDate).localeCompare(String(a.dueDate)));
  const last = ordered[0];
  console.log(`\n✓ ${bills.length} fatura(s) para a conta ${accountId}`);
  for (const b of ordered.slice(0, 4)) {
    console.log(`  ${b.dueDate || 'sem data'} — ${brl(b.totalAmount)}`);
  }
  console.log(`\n  >> ÚLTIMA FATURA: ${brl(last.totalAmount)} (vencimento ${last.dueDate || '?'})`);
  console.log('     Compare com o valor que aparece hoje no app para saber se o dado está certo.');
}

async function runSetup(envVars) {
  console.log('\n=== Configuração Meu Pluggy → contas-a-pagar ===\n');
  console.log('Cole os dados quando pedido. Use Ctrl+C para sair sem salvar.\n');

  const clientId = await readLine('Client ID', { fallback: envVars[KEYS.clientId] || '' });
  if (!isUuid(clientId)) {
    console.error('\n✗ O Client ID não parece um UUID.');
    console.error('  Copie de dashboard.pluggy.ai → Aplicações → sua aplicação (linha do app).');
    process.exit(1);
  }
  const clientSecret = await readLine('Client Secret', {
    hidden: true,
    fallback: envVars[KEYS.clientSecret] || '',
  });

  console.log('\n→ Validando credenciais na Pluggy…');
  let apiKey;
  try {
    apiKey = await authenticate(clientId, clientSecret);
  } catch (err) {
    explainAuthError(err);
    process.exit(1);
  }
  console.log('✓ Credenciais válidas (apiKey obtida)\n');

  // Salva o par validado já agora: se o passo do Item ID falhar, o próximo run
  // reaproveita com Enter e o usuário não precisa redigitar o secret.
  upsertEnvFile({ [KEYS.clientId]: clientId, [KEYS.clientSecret]: clientSecret });
  console.log(`(guardado no .env: ${KEYS.clientId} e ${KEYS.clientSecret})\n`);

  console.log('Item ID — onde está:');
  console.log('  dashboard.pluggy.ai → Aplicações → sua aplicação → aba DEMO');
  console.log('  → "Conectar Conta" → escolha o conector "MeuPluggy" (NÃO o Santander, NÃO o Sandbox)');
  console.log('  → faça login no Meu Pluggy → o item aparece em "Itens Conectados" → clique e copie o id\n');

  const itemId = await readLine('Item ID', { fallback: envVars[KEYS.itemId] || '' });
  if (!isUuid(itemId)) {
    console.error('✗ Item ID não parece um UUID. Copie de novo no Dashboard → Demo → Itens Conectados.');
    process.exit(1);
  }

  console.log('\n→ Buscando contas do item…');
  let accounts;
  try {
    accounts = await listAccounts(apiKey, itemId);
  } catch (err) {
    if (err.status === 404 || err.status === 400) {
      console.error('✗ Item não encontrado ou sem contas. Confirme que você conectou o conector "MeuPluggy"');
      console.error('  (não o conector do Santander) em Dashboard → Aplicações → sua aplicação → Demo.');
    } else {
      console.error(`✗ ${err.message}`);
    }
    process.exit(1);
  }

  if (FLAG_DEBUG) console.log(JSON.stringify(accounts, null, 2));

  if (!accounts.length) {
    console.error('✗ O item não devolveu contas.');
    console.error('  Causa mais comum: você conectou o banco no Dashboard em vez do conector "MeuPluggy".');
    process.exit(1);
  }

  console.log(`\n✓ ${accounts.length} conta(s):`);
  accounts.forEach((acc, i) => {
    const marca = isCreditCard(acc) ? '💳' : '  ';
    console.log(`  [${i + 1}] ${marca} ${acc.type}/${acc.subtype || '-'} — ${accountLabel(acc)}`);
    const ciclo = cycleLine(acc);
    if (ciclo) console.log(`        ↳ ${ciclo}`);
  });

  const creditos = accounts.filter(isCreditCard);
  if (!creditos.length) {
    console.error('\n✗ Nenhuma conta de cartão de crédito (CREDIT/CREDIT_CARD) no item.');
    console.error('  No Open Finance, o cartão pode vir em um conector separado ("Santander Cartões").');
    console.error('  Conecte esse também no Meu Pluggy e repita o passo do conector MeuPluggy no Dashboard.');
    process.exit(1);
  }

  let escolhida;
  if (creditos.length === 1) {
    escolhida = creditos[0];
    console.log(`\n→ Cartão de crédito único: ${accountLabel(escolhida)}`);
  } else {
    console.log('\n→ Mais de um cartão de crédito. Qual é o seu cartão principal?');
    const resposta = await readLine('Número da lista');
    const idx = Number(resposta) - 1;
    if (!accounts[idx] || !isCreditCard(accounts[idx])) {
      console.error('✗ Escolha inválida.');
      process.exit(1);
    }
    escolhida = accounts[idx];
  }

  console.log(`\n→ Lendo faturas da conta ${escolhida.id}…`);
  let bills = [];
  try {
    bills = await listBills(apiKey, escolhida.id);
  } catch (err) {
    console.log(`! Não consegui ler as faturas agora (${err.message}).`);
    console.log('  As credenciais continuam válidas — salvo assim mesmo.');
  }
  if (FLAG_DEBUG) console.log(JSON.stringify(bills, null, 2));
  printBills(bills, escolhida.id);

  const ciclo = cycleLine(escolhida);
  if (ciclo) {
    console.log(`\n  Ciclo do cartão: ${ciclo}`);
    console.log('  Cobrança depois da data de fechamento cai na fatura SEGUINTE.');
    console.log('  É isso que faz o total do app (por mês) divergir do total da fatura (por ciclo).');
  }

  const label = `${(escolhida.name || escolhida.marketingName || 'Cartão').replace(/[^A-Za-z0-9À-ÿ ]/g, '').trim()}${
    escolhida.number ? ' final ' + escolhida.number : ''
  }`;

  console.log('\n→ Gravando no .env…');
  upsertEnvFile({
    [KEYS.clientId]: clientId,
    [KEYS.clientSecret]: clientSecret,
    [KEYS.itemId]: itemId,
    [KEYS.accountId]: escolhida.id,
    [KEYS.label]: label,
  });

  console.log(`\n✓ Salvo em ${ENV_FILE} (permissão 600)`);
  console.log(`  ${KEYS.clientId}     = ${clientId}`);
  console.log(`  ${KEYS.clientSecret} = ${mask(clientSecret)}`);
  console.log(`  ${KEYS.itemId}       = ${itemId}`);
  console.log(`  ${KEYS.accountId}    = ${escolhida.id}  (${label})`);
  console.log('\nPróximos passos:');
  console.log('  1. node scripts/pluggy-setup.js --check     # revalidar quando quiser');
  console.log('  2. o container só enxerga essas variáveis depois de recriado (env_file).');
  console.log('     Isso será feito junto com a feature de conciliação, não precisa agora.');
}

function explainAuthError(err) {
  if (err.status === 401 || err.status === 403) {
    console.error('✗ Credenciais recusadas (401/403).');
    console.error('  → Confira se copiou o Client Secret completo: no Dashboard ele aparece');
    console.error('    inteiro só na aba "Aplicação". Se perdeu, gere um novo.');
  } else if (err.status === 429) {
    console.error(`✗ Rate limit da Pluggy (429). Tente de novo em ${err.retryAfter || 60}s.`);
  } else if (err.name === 'TimeoutError' || err.name === 'AbortError') {
    console.error('✗ A API da Pluggy não respondeu em 25s. Verifique a conexão e tente de novo.');
  } else {
    console.error(`✗ ${err.message}`);
  }
}

// ==============================================================================
// Bootstrap
// ==============================================================================

// Exportado para testes (importar o módulo não dispara o fluxo interativo)
module.exports = {
  readEnvFile,
  upsertEnvFile,
  isUuid,
  mask,
  isCreditCard,
  cycleLine,
  KEYS,
  ENV_FILE,
  _internal: { flushPiped, piped },
};

if (require.main === module) {
  (async () => {
    if (FLAG_HELP) {
      printHelp();
      process.exit(0);
    }

    const { vars } = readEnvFile();

    try {
      if (FLAG_CHECK) await runCheck(vars);
      else await runSetup(vars);
    } catch (err) {
      console.error(`\n✗ ${err.message}`);
      if (FLAG_DEBUG && err.data) console.error(JSON.stringify(err.data, null, 2));
      process.exit(1);
    }
  })();
}
