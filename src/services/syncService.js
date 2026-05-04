// src/services/syncService.js

/**
 * Sincroniza o total de gastos do terceiro 'Morr' do usuário Dodo (ID 1)
 * para a conta fixa 'Cartão Douglas' do usuário Vitória (ID 2).
 *
 * @param {object} repo - A instância do repositório de lançamentos.
 * @param {number} sourceUserId - ID do usuário de origem (Dodo).
 * @param {number} targetUserId - ID do usuário de destino (Vitória).
 * @param {number} month - Mês da competência.
 * @param {number} year - Ano da competência.
 */
async function sincronizarFaturaMorr(repo, sourceUserId, targetUserId, month, year) {
  try {
    const totalMorr = await repo.getTotalTerceiroCartao('Morr', sourceUserId, month, year);
    await repo.findAndUpdateOrCreateContaFixa(targetUserId, 'Cartão Douglas', totalMorr, month, year);
    console.log(
      `[SYNC] Fatura 'Morr' (R$ ${totalMorr}) sincronizada para 'Cartão Douglas' (Usuário: ${targetUserId}).`
    );
  } catch (error) {
    console.error('[SYNC] Erro ao sincronizar fatura Morr:', error.message);
  }
}

/**
 * Busca o total de gastos do terceiro 'Casa', divide por 2, e lança as metades
 * para o usuário Dodo (conta própria), Morr (terceiro) e Vitória (conta própria).
 */
async function sincronizarDivisaoCasa(repo, sourceUserId, targetUserId, mes, ano) {
  try {
    // Busca as configurações e o total da casa em paralelo (N+1 Optimization)
    const [config, totalCasa] = await Promise.all([
      repo.getConfiguracoes(sourceUserId),
      repo.getTotalTerceiroCartao('Casa', sourceUserId, mes, ano)
    ]);

    const valorMinimo = config.divisao_casa_minimo || 750;
    const valorOriginal = totalCasa || 0;

    // Regra de negócio: mínimo configurável para cada. Acima disso, divide real.
    let metade = valorOriginal / 2;
    if (metade < valorMinimo) metade = valorMinimo;
    metade = Math.round(metade * 100) / 100; // Evita dízima na conciliação futura

    // Executa as operações de gravação atômica concorrentemente
    await Promise.all([
      repo.findAndUpdateOrCreateContaFixaComTerceiro(sourceUserId, 'Casa', metade, mes, ano, null), // Dodo (conta própria)
      repo.findAndUpdateOrCreateContaFixaComTerceiro(sourceUserId, 'Casa', metade, mes, ano, 'Morr'), // Morr no dashboard do Dodo
      repo.findAndUpdateOrCreateContaFixaComTerceiro(targetUserId, 'Casa', metade, mes, ano, null) // Vitória (conta própria espelhada)
    ]);

    console.log(
      `[SYNC] Divisão Casa sincronizada. Source: ${sourceUserId}, Target: ${targetUserId}. Total: ${valorOriginal} -> ${metade}`
    );
  } catch (error) {
    console.error('[SYNC] Erro ao sincronizar divisão Casa:', error.message);
  }
}

module.exports = { sincronizarFaturaMorr, sincronizarDivisaoCasa };
