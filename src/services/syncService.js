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
 * para o usuário Dodo (como conta própria) e para o terceiro 'Morr'.
 */
async function sincronizarDivisaoCasa(repo, usuarioId, mes, ano) {
  try {
    const totalCasa = await repo.getTotalTerceiroCartao('Casa', usuarioId, mes, ano);
    const valorOriginal = totalCasa || 0;
    const metade = valorOriginal / 2;

    await repo.findAndUpdateOrCreateContaFixaComTerceiro(usuarioId, 'Casa', metade, mes, ano, null); // Dodo (conta própria)
    await repo.findAndUpdateOrCreateContaFixaComTerceiro(usuarioId, 'Casa', metade, mes, ano, 'Morr'); // Morr

    console.log(
      `[SYNC] Divisão Casa sincronizada para o usuário ${usuarioId}. Total: ${valorOriginal} -> 2x ${metade}`
    );
  } catch (error) {
    console.error('[SYNC] Erro ao sincronizar divisão Casa:', error.message);
  }
}

module.exports = { sincronizarFaturaMorr, sincronizarDivisaoCasa };
