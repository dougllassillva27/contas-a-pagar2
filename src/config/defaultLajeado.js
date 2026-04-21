// ==============================================================================
// Dados fallback padrão caso a tabela Lajeado esteja vazia (Primeiro acesso)
// ==============================================================================

const DEFAULT_LAJEADO_DADOS = {
  douglas: {
    nome: 'Douglas',
    tag: 'Planejamento principal',
    resumo: {
      guardado: 'R$ 12.491,67',
      saque: 'R$ 2.113,48',
      total: 'R$ 14.605,15',
    },
    meses: [
      {
        titulo: '05/Abril',
        statusLabel: 'Atenção',
        statusClass: 'warning',
        metricas: [
          { label: 'Contas', valor: 'R$ 4.595,15', classe: 'blue' },
          { label: 'Faltando', valor: 'R$ 1.267,00', classe: 'red' },
        ],
      },
      {
        titulo: '05/Maio',
        statusLabel: 'Atenção',
        statusClass: 'warning',
        metricas: [
          { label: 'Contas', valor: 'R$ 4.055,10', classe: 'blue' },
          { label: 'Faltando', valor: 'R$ 725,95', classe: 'red' },
        ],
      },
      {
        titulo: '05/Junho',
        statusLabel: 'Quase lá',
        statusClass: 'info',
        metricas: [
          { label: 'Contas', valor: 'R$ 3.717,90', classe: 'blue' },
          { label: 'Faltando', valor: 'R$ 388,75', classe: 'red' },
        ],
      },
      {
        titulo: '05/Julho',
        statusLabel: 'Quase lá',
        statusClass: 'info',
        metricas: [
          { label: 'Contas', valor: 'R$ 3.665,07', classe: 'blue' },
          { label: 'Faltando', valor: 'R$ 335,92', classe: 'red' },
        ],
      },
      {
        titulo: '05/Agosto (acabou o seguro)',
        statusLabel: 'Fôlego extra',
        statusClass: 'success',
        metricas: [
          { label: 'Contas', valor: 'R$ 3.653,51', classe: 'blue' },
          { label: 'Faltando', valor: 'R$ 2.843,01', classe: 'green' },
        ],
      },
      {
        titulo: '05/Setembro',
        statusLabel: 'Fôlego extra',
        statusClass: 'success',
        metricas: [
          { label: 'Contas', valor: 'R$ 3.559,76', classe: 'blue' },
          { label: 'Faltando', valor: 'R$ 2.749,26', classe: 'green' },
        ],
      },
    ],
  },
  vitoria: {
    nome: 'Vitória',
    tag: 'Planejamento compartilhado',
    resumo: {
      guardado: 'R$ 5.729,89',
      saque: '—',
      total: 'R$ 5.729,89',
    },
    meses: [
      {
        titulo: '05/Abril',
        statusLabel: 'Atenção',
        statusClass: 'warning',
        metricas: [
          { label: 'Cartão Dodo', valor: 'R$ 1.541,90', classe: 'blue' },
          { label: 'Contas', valor: 'R$ 6.344,36', classe: 'blue' },
          { label: 'Faltando', valor: 'R$ 344,36', classe: 'red' },
        ],
      },
      {
        titulo: '05/Maio',
        statusLabel: 'Sobra positiva',
        statusClass: 'success',
        metricas: [
          { label: 'Cartão Dodo', valor: 'R$ 938,44', classe: 'blue' },
          { label: 'Contas', valor: 'R$ 4.401,18', classe: 'blue' },
          { label: 'Sobrando', valor: 'R$ 1.598,82', classe: 'green' },
        ],
      },
      {
        titulo: '05/Junho',
        statusLabel: 'Sobra positiva',
        statusClass: 'success',
        metricas: [
          { label: 'Cartão Dodo', valor: 'R$ 767,65', classe: 'blue' },
          { label: 'Contas', valor: 'R$ 4.125,02', classe: 'blue' },
          { label: 'Sobrando', valor: 'R$ 1.874,98', classe: 'green' },
        ],
      },
      {
        titulo: '05/Julho',
        statusLabel: 'Sobra positiva',
        statusClass: 'success',
        metricas: [
          { label: 'Cartão Dodo', valor: 'R$ 666,49', classe: 'blue' },
          { label: 'Contas', valor: 'R$ 3.992,23', classe: 'blue' },
          { label: 'Sobrando', valor: 'R$ 2.007,77', classe: 'green' },
        ],
      },
      {
        titulo: '05/Agosto',
        statusLabel: 'Sobra positiva',
        statusClass: 'success',
        metricas: [
          { label: 'Cartão Dodo', valor: 'R$ 666,49', classe: 'blue' },
          { label: 'Contas', valor: 'R$ 3.940,98', classe: 'blue' },
          { label: 'Sobrando', valor: 'R$ 2.059,02', classe: 'green' },
        ],
      },
      {
        titulo: '05/Setembro',
        statusLabel: 'Sobra positiva',
        statusClass: 'success',
        metricas: [
          { label: 'Cartão Dodo', valor: 'R$ 666,49', classe: 'blue' },
          { label: 'Contas', valor: 'R$ 3.940,98', classe: 'blue' },
          { label: 'Sobrando', valor: 'R$ 2.059,02', classe: 'green' },
        ],
      },
    ],
  },
};

module.exports = DEFAULT_LAJEADO_DADOS;
