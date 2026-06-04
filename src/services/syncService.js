// src/services/syncService.js

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
  if (!Array.isArray(regras) || regras.length === 0) {
    console.warn(`[SYNC] ⚠️ Nenhuma regra configurada para usuário ${userId}`);
    return;
  }

  console.log(`[SYNC] �� Iniciando sincronização dinâmica para usuário ${userId}, mês ${month}/${year}`);
  console.log(`[SYNC] �� ${regras.length} regra(s) encontrada(s)`);

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
  console.log(`[SYNC] �� Sincronização concluída: ${regrasProcessadas} regra(s) processadas, ${regrasComErro} erro(s)`);
  console.log(`[SYNC] ⏱️ Tempo total: ${durationTotal}ms`);
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

  console.log(`[SYNC] �� COPIA_TOTAL: Buscando total de '${terceiroOrigem}' (U:${sourceUserId}) para mês ${month}/${year}`);
  const total = await repo.getTotalTerceiroCartao(terceiroOrigem, sourceUserId, month, year);
  console.log(`[SYNC] �� Total encontrado: R$ ${total}`);

  console.log(`[SYNC] �� Atualizando/criando '${contaDestino}' para usuário destino (U:${usuarioDestino})`);
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

  const totalRaw = await repo.getTotalTerceiroCartao(terceiroOrigem, sourceUserId, month, year);

  let metade = (totalRaw || 0) / 2;
  if (metade < valorMinimo) metade = valorMinimo;
  metade = Math.round(metade * 100) / 100;

  // Executa o espelhamento triplo de forma SEQUENCIAL para evitar Lock Contention
  // no Neon Postgres. O Promise.all concorrente causava deadlock físico (~1000ms/op)
  // ao disputar Shared/Exclusive Locks na mesma tabela Lancamentos para o mesmo UsuarioId.
  // A execução sequencial garante que cada transação libere seus locks antes da próxima.

  // 1. Minha parte (Conta Própria)
  await repo.findAndUpdateOrCreateContaFixaComTerceiro(sourceUserId, terceiroOrigem, metade, month, year, null);
  // 2. Parte do parceiro no meu dashboard (para eu saber que ele me deve isso)
  await repo.findAndUpdateOrCreateContaFixaComTerceiro(sourceUserId, terceiroOrigem, metade, month, year, terceiroEspelhoNoOrigem);
  // 3. Parte do parceiro no dashboard dele (Conta Própria dele)
  await repo.findAndUpdateOrCreateContaFixaComTerceiro(usuarioDestino, terceiroOrigem, metade, month, year, null);

  console.log(`[SYNC-DYNAMIC] Divisão '${terceiroOrigem}' processada. Total: ${totalRaw} -> Metade: ${metade}`);
}

module.exports = { executarSincronizacaoDinamica };
