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
    return;
  }

  // Cria promise que será resolvida quando o sync terminar
  let resolvePromise;
  const syncPromise = new Promise(resolve => { resolvePromise = resolve; });
  _syncPromises.set(mutexKey, syncPromise);

  try {
    if (!Array.isArray(regras) || regras.length === 0) {
      return;
    }

    const startTotal = Date.now();
    let regrasProcessadas = 0;
    let regrasComErro = 0;

    for (const regra of regras) {
      try {
        const { tipo, ativo = true } = regra;
        if (!ativo) {
          continue;
        }

        const startRegra = Date.now();

        switch (tipo) {
          case 'COPIA_TOTAL':
            await processarCopiaTotal(repo, userId, month, year, regra);
            break;

          case 'DIVISAO_CASA':
            await processarDivisaoCasa(repo, userId, month, year, regra);
            break;

          default:
            console.warn(`[SYNC] Tipo de regra desconhecido: ${tipo}`);
            continue;
        }

        regrasProcessadas++;
      } catch (err) {
        regrasComErro++;
        console.error(`[SYNC] Erro ao processar regra ${regra.tipo}:`, err.message);
      }
    }

    const durationTotal = Date.now() - startTotal;
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
    return;
  }

  const total = await repo.getTotalTerceiroCartao(terceiroOrigem, sourceUserId, month, year);
  await repo.findAndUpdateOrCreateContaFixa(usuarioDestino, contaDestino, total, month, year);
}

/**
 * Regra: DIVISAO_CASA
 * Divide contas do terceiro "CASA" com base fixa de R$ 750 + metade do excedente:
 * - Conta "Casa" (terceiro=null): R$ 750 + metade do excedente acima de R$ 1.500
 * - Conta "Casa" (terceiro="Morr"): R$ 750 + metade do excedente acima de R$ 1.500
 *
 * Gatilho: qualquer alteração em contas do terceiro CASA
 */
async function processarDivisaoCasa(repo, sourceUserId, month, year, config) {
  const { terceiroOrigem, usuarioDestino, valorMinimo = 750, terceiroEspelhoNoOrigem } = config;

  if (!terceiroOrigem || !usuarioDestino) {
    return;
  }

  // Busca total do terceiro CASA no cartão
  const totalRaw = await repo.getTotalTerceiroCartao(terceiroOrigem, sourceUserId, month, year);
  const totalValor = totalRaw || 0;

  // Base fixa: R$ 750 para cada conta (R$ 1.500 total base)
  const baseFixa = valorMinimo; // R$ 750
  const limiteBase = baseFixa * 2; // R$ 1.500

  // Calcula valor de cada conta
  let valorPorConta = baseFixa;

  if (totalValor > limiteBase) {
    const excedente = totalValor - limiteBase;
    const metadeExcedente = Math.round((excedente / 2) * 100) / 100;
    valorPorConta = baseFixa + metadeExcedente;
  }

  // Cria/atualiza DUAS contas fixas no MESMO usuário (sourceUserId):
  // 1. Conta "Casa" com terceiro = null (card Casa geral)
  // 2. Conta "Casa" com terceiro = terceiroEspelhoNoOrigem (ex: "Morr")
  const operations = [
    {
      nomeConta: 'Casa',
      valor: valorPorConta,
      month,
      year,
      dataVencimento: new Date(year, month - 1, 10),
      nomeTerceiro: null, // Card Casa geral
    },
    {
      nomeConta: 'Casa',
      valor: valorPorConta,
      month,
      year,
      dataVencimento: new Date(year, month - 1, 10),
      nomeTerceiro: terceiroEspelhoNoOrigem || 'Morr', // Card do espelho (Morr)
    },
  ];

  // Executa batch UPSERT em transação única
  await repo.bulkUpsertContasFixas(sourceUserId, operations);
}

module.exports = { executarSincronizacaoDinamica };
