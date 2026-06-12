/**
 * Calcula o contexto de navegação mensal (mês atual, anterior e próximo).
 * Usado pelo dashboard e relatório para montar os links de navegação.
 */
function calcularContextoNavegacao(query) {
  const month = query.month ? parseInt(query.month, 10) : new Date().getMonth() + 1;
  const year = query.year ? parseInt(query.year, 10) : new Date().getFullYear();

  const dataAtual = new Date(year, month - 1, 1);
  const dataAnterior = new Date(year, month - 2, 1);
  const dataProxima = new Date(year, month, 1);

  return {
    month,
    year,
    nav: {
      atual: { month, year, dateObj: dataAtual },
      ant: { month: dataAnterior.getMonth() + 1, year: dataAnterior.getFullYear() },
      prox: { month: dataProxima.getMonth() + 1, year: dataProxima.getFullYear() },
    },
  };
}

module.exports = { calcularContextoNavegacao };
