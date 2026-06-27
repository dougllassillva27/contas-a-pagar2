// src/services/syncService.js

// Mutex global para evitar múltiplas execuções concorrentes do sync
const _syncPromises = new Map();

/**
 * Motor de Sincronização Dinâmico (SaaS Ready)
 * Processa regras declarativas armazenadas no JSONB do usuário.
 *
 * @param {object} repo - Repositório Financeiro
 * @param {number} userId - ID do usuário dono das regras
 * @param {number} month - Mês competência
 * @param {number} year - Ano competência
 * @param {Array} regras - Array de objetos de regra (vindo de configuracoes.regras_sync)
 */
async function executarSincronizacaoDinamica(repo, userId, month, year, regras) {
  const mutexKey = `${userId}:${month}:${year}`;

  // Se já tem sync rodando para este usuário/mês/ano, retorna imediatamente
  if (_syncPromises.has(mutexKey)) {
    console.log(`[SYNC] ⏭️ Sync já em execução para usuário ${userId}, mês ${month}/${year} — pulando`);
    return;
  }

  // Cria promise que será resolvida quando o sync terminar
  let resolvePromise;
  const syncPromise = new Promise(resolve => { resolvePromise = resolve; });
  _syncPromises.set(mutexKey, syncPromise);

  try {
    if (!Array.isArray(regras) || regras.length === 0) {
      console.warn(`[SYNC] ⚠️ Nenhuma regra configurada para usuário ${userId}`);
      return;
    }

    console.log(`[SYNC] 🚀 Iniciando sincronização dinâmica para usuário ${userId}, mês ${month}/${year}`);
    console.log(`[SYNC] 📋 ${regras.length} regra(s) encontrada(s)`);

    const startTotal = Date.now();
    let regrasProcessadas = 0;
    let regrasComErro = 0;

    for (const regra of regras) {
      try {
        const { tipo, ativo = true } = regra;
        if (!ativo) {
          console.log(`[SYNC] ⏭️ Regra ${tipo} inativa, pulando`);
          continue;
        }

        console.log(`[SYNC] ▶️ Processando regra: ${JSON.stringify(regra)}`);
        const startRegra = Date.now();

        switch (tipo) {
          case 'COPIA_TOTAL':
            await processarCopiaTotal(repo, userId, month, year, regra);
            break;

          case 'DIVISAO_CASA':
            await processarDivisaoCasa(repo, userId, month, year, regra);
            break;

          default:
            console.warn(`[SYNC] ❓ Tipo de regra desconhecido: ${tipo}`);
            continue;
        }

        const durationRegra = Date.now() - startRegra;
        regrasProcessadas++;
        console.log(`[SYNC] ✅ Regra ${tipo} processada em ${durationRegra}ms`);
      } catch (err) {
        regrasComErro++;
        console.error(`[SYNC] ❌ Erro ao processar regra ${regra.tipo}:`, err.message);
        console.error(`[SYNC] Stack:`, err.stack);
      }
    }

    const durationTotal = Date.now() - startTotal;
    console.log(`[SYNC] 🏁 Sincronização concluída: ${regrasProcessadas} regra(s) processadas, ${regrasComErro} erro(s)`);
    console.log(`[SYNC] ⏱️ Tempo total: ${durationTotal}ms`);
  } finally {
    // Libera mutex e resolve a promise
    _syncPromises.delete(mutexKey);
    resolvePromise();
  }
}

/**
 * Regra: COPIA_TOTAL
 * Pega o total de um terceiro no cartão e injeta como valor de uma conta fixa em outro usuário.
 */
async function processarCopiaTotal(repo, sourceUserId, month, year, config) {
  const { terceiroOrigem, usuarioDestino, contaDestino } = config;
  if (!terceiroOrigem || !usuarioDestino || !contaDestino) {
    console.warn(`[SYNC] ⚠️ Configuração incompleta para COPIA_TOTAL:`, config);
    return;
  }

  console.log(`[SYNC] 💰 COPIA_TOTAL: Buscando total de '${terceiroOrigem}' (U:${sourceUserId}) para mês ${month}/${year}`);
  const total = await repo.getTotalTerceiroCartao(terceiroOrigem, sourceUserId, month, year);
  console.log(`[SYNC] 💰 Total encontrado: R$ ${total}`);

  console.log(`[SYNC] 💰 Atualizando/criando '${contaDestino}' para usuário destino (U:${usuarioDestino})`);
  await repo.findAndUpdateOrCreateContaFixa(usuarioDestino, contaDestino, total, month, year);

  console.log(`[SYNC] ✅ Copiado R$ ${total} de '${terceiroOrigem}' (U:${sourceUserId}) -> '${contaDestino}' (U:${usuarioDestino})`);
}

/**
 * Regra: DIVISAO_CASA
 * Lógica específica de divisão de despesas fixas da residência.
 */
async function processarDivisaoCasa(repo, sourceUserId, month, year, config) {
  const { terceiroOrigem, usuarioDestino, valorMinimo = 0, terceiroEspelhoNoOrigem } = config;
  if (!terceiroOrigem || !usuarioDestino) return;

  console.log(`[SYNC-DIVISAO] 📊 Processando divisão para sourceUserId=${sourceUserId}, usuarioDestino=${usuarioDestino}`);
  console.log(`[SYNC-DIVISAO] 📊 Config completa:`, JSON.stringify(config));
  console.log(`[SYNC-DIVISAO] 📊 terceiroOrigem="${terceiroOrigem}", valorMinimo=${valorMinimo}, terceiroEspelhoNoOrigem="${terceiroEspelhoNoOrigem}"`);

  const totalRaw = await repo.getTotalTerceiroCartao(terceiroOrigem, sourceUserId, month, year);
  console.log(`[SYNC-DIVISAO] 💰 Total bruto encontrado para terceiro="${terceiroOrigem}": R$ ${totalRaw}`);

  let metade = (totalRaw || 0) / 2;
  console.log(`[SYNC-DIVISAO] 🧮 Metade calculada: ${metade} (mínimo configurado: ${valorMinimo})`);
  if (metade < valorMinimo) {
    console.log(`[SYNC-DIVISAO] ⚠️ Metade (${metade}) < mínimo (${valorMinimo}), usando valor mínimo`);
    metade = valorMinimo;
  }
  metade = Math.round(metade * 100) / 100;
  console.log(`[SYNC-DIVISAO] 💵 Valor final da metade após round: R$ ${metade}`);

  // ✅ Refatoração: substitui loop sequencial por batch UPSERT em transação única
  // Reduz de 9 queries sequenciais para 1 query bulk com UNNEST
  // NOTA: conta fixa "Casa" do usuário origem tem NomeTerceiro = null (sem terceiro)
  const operations = [
    { nomeConta: terceiroOrigem, valor: metade, month, year, dataVencimento: new Date(year, month - 1, 10), nomeTerceiro: null },
    { nomeConta: terceiroOrigem, valor: metade, month, year, dataVencimento: new Date(year, month - 1, 10), nomeTerceiro: null, userIdOverride: usuarioDestino },
  ];

  console.log(`[SYNC-DIVISAO] 🔄 Operations preparadas:`, JSON.stringify(operations));
  console.log(`[SYNC-DIVISAO] 🔄 Chamando bulkUpsertContasFixas para sourceUserId=${sourceUserId} com 1 operação`);
  console.log(`[SYNC-DIVISAO] 🔄 Chamando bulkUpsertContasFixas para usuarioDestino=${usuarioDestino} com 1 operação`);

  // Executa operações em paralelo (sem lock contention)
  await Promise.all([
    repo.bulkUpsertContasFixas(sourceUserId, [operations[0]]),
    repo.bulkUpsertContasFixas(usuarioDestino, [operations[1]]),
  ]);

  console.log(`[SYNC-DIVISAO] ✅ Divisão '${terceiroOrigem}' processada. Total: ${totalRaw} -> Metade: ${metade}`);
}

module.exports = { executarSincronizacaoDinamica };
