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
          case 'COPIAR_CONTAS':
            await processarCopiarContas(repo, userId, month, year, regra);
            break;

          case 'COPIAR_CONTA_FIXA':
            await processarCopiarContaFixa(repo, userId, month, year, regra);
            break;

          case 'DIVISAO_CASA':
            await processarDivisaoCasa(repo, userId, month, year, regra);
            break;
            break;

          default:
            // [SYNC] log removido
            continue;
        }

        regrasProcessadas++;
      } catch (err) {
        regrasComErro++;
        // [SYNC] log removido
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
 * Regra: COPIAR_CONTAS
 * Copia o total de um terceiro do usuário origem para uma conta fixa no usuário destino.
 * Ex: Total do cartão "Morr" (usuário 1) → Conta "Cartão Douglas" (usuário 2)
 */
async function processarCopiarContas(repo, sourceUserId, month, year, config) {
  const { terceiroOrigem, usuarioDestino, contaDestino } = config;
  if (!terceiroOrigem || !usuarioDestino || !contaDestino) {
    return;
  }

  const total = await repo.getTotalTerceiroCartao(terceiroOrigem, sourceUserId, month, year);
  await repo.findAndUpdateOrCreateContaFixa(usuarioDestino, contaDestino, total, month, year);
}

/**
 * Regra: COPIAR_CONTA_FIXA
 * Copia o valor de uma conta fixa específica de um usuário para outro.
 * Ex: Conta "Casa" do usuário 1 (terceiro "Morr") → Conta "Casa" do usuário 2
 */
async function processarCopiarContaFixa(repo, sourceUserId, month, year, config) {
  const { descricaoOrigem, terceiroOrigem, usuarioDestino, contaDestino } = config;

  // [SYNC] log removido

  if (!descricaoOrigem || !usuarioDestino || !contaDestino) {
    return;
  }

  // Busca valor da conta fixa específica no usuário origem
  const valorOrigem = await repo.getContaFixaValor(
    descricaoOrigem,
    terceiroOrigem,
    sourceUserId,
    month,
    year
  );

  // [SYNC] log removido

  // Injeta na conta fixa do usuário destino
  await repo.findAndUpdateOrCreateContaFixa(usuarioDestino, contaDestino, valorOrigem, month, year);
}

/**
 * Regra: DIVISAO_CASA
 * Divide contas do terceiro "CASA" com base fixa de R$ 750 + metade do excedente:
 * - Conta "Casa" (terceiro=null): fica no usuário origem com valor calculado
 * - Conta "Casa" (terceiro="Morr"): vai para o usuário destino com valor calculado
 *
 * Gatilho: qualquer alteração em contas do terceiro CASA
 */
async function processarDivisaoCasa(repo, sourceUserId, month, year, config) {
  const { terceiroOrigem, usuarioDestino, valorMinimo = 750, terceiroEspelhoNoOrigem } = config;

  if (!terceiroOrigem || !usuarioDestino) {
    return;
  }

  // Busca total do terceiro CASA (cartão + fixas) para divisão
  const totalRaw = await repo.getTotalTerceiroParaDivisaoCasa(terceiroOrigem, sourceUserId, month, year);
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
  // 1. Conta "Casa" com terceiro=null (card Casa geral)
  // 2. Conta "Casa" com terceiro=terceiroEspelhoNoOrigem (ex: "Morr")
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

  // Executa batch UPSERT em transação única no USUÁRIO ORIGEM
  await repo.bulkUpsertContasFixas(sourceUserId, operations);
}

module.exports = { executarSincronizacaoDinamica };
