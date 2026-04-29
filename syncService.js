// ==============================================================================
// ⚙️ SERVIÇO DE SINCRONIZAÇÃO AUTOMÁTICA
// Responsabilidade: Orquestrar lógicas de negócio que dependem de dados
// de múltiplos usuários ou que rodam em background (ex: via cron).
// ==============================================================================

/**
 * Busca o total de gastos de um usuário (origem) com um terceiro específico ('Morr')
 * e lança como uma conta fixa para outro usuário (destino).
 * Ex: Total que Vitória gastou com 'Morr' vira uma conta 'Cartão Douglas' para Dodo.
 */
async function sincronizarFaturaMorr(repo, usuarioIdOrigem, usuarioIdDestino, mes, ano) {
  try {
    const totalMorr = await repo.getTotalTerceiroCartao('Morr', usuarioIdOrigem, mes, ano);
    const valor = totalMorr || 0;

    await repo.findAndUpdateOrCreateContaFixa(usuarioIdDestino, 'Cartão Douglas', valor, mes, ano);

    console.log(`[SYNC] Fatura Morr sincronizada para o usuário ${usuarioIdDestino}. Valor: ${valor}`);
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

module.exports = {
  sincronizarFaturaMorr,
  sincronizarDivisaoCasa,
};
