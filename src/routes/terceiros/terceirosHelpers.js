/**
 * Monta o mapa de terceiros (agrupando por nome) a partir dos lançamentos brutos.
 * Cada terceiro tem seus itens de cartão e fixas, e os totais de pendentes.
 */
function montarMapaTerceiros(dadosTerceirosRaw, userName) {
  const terceirosMap = {};

  dadosTerceirosRaw.forEach((item) => {
    let nome = item.nometerceiro;
    // Substitui NULL/vazio por nome do usuario ("Eu")
    if (!nome || nome.trim() === '') {
      nome = userName || 'Eu';
    }

    if (!terceirosMap[nome]) {
      terceirosMap[nome] = {
        nome,
        totalCartao: 0,
        itensCartao: [],
        itensFixas: [],
        totalFixas: 0,
        totalGeral: 0,
      };
    }

    if (item.status === 'PENDENTE') {
      const val = Number(item.valor);
      terceirosMap[nome].totalGeral += val;
      if (item.tipo === 'CARTAO') terceirosMap[nome].totalCartao += val;
      else if (item.tipo === 'FIXA') terceirosMap[nome].totalFixas += val;
    }

    if (item.tipo === 'FIXA') terceirosMap[nome].itensFixas.push(item);
    else terceirosMap[nome].itensCartao.push(item);
  });

  return terceirosMap;
}

/**
 * Ordena a lista de terceiros pela ordem salva pelo usuário (drag & drop).
 * Terceiros sem ordem definida vão para o final, ordenados alfabeticamente.
 */
function ordenarTerceiros(terceirosMap, ordemCardsRaw, LIMITES_ORDEM_DEFAULT = 9999) {
  const ordemMap = {};
  if (ordemCardsRaw) {
    ordemCardsRaw.forEach((o) => {
      ordemMap[o.nome] = o.ordem;
    });
  }

  return Object.values(terceirosMap).sort((a, b) => {
    const ordA = ordemMap[a.nome] ?? LIMITES_ORDEM_DEFAULT;
    const ordB = ordemMap[b.nome] ?? LIMITES_ORDEM_DEFAULT;
    return ordA - ordB || a.nome.localeCompare(b.nome);
  });
}

module.exports = { montarMapaTerceiros, ordenarTerceiros };
