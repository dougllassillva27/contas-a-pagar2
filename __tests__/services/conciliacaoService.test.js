// ==============================================================================
// Testes do motor de conciliação (funções puras, sem banco e sem rede)
// Dados sintéticos de propósito: o repositório não guarda transação real.
// ==============================================================================

const {
  conciliar,
  normalizarDescricao,
  similaridade,
  toleranciaPara,
} = require('../../src/services/conciliacaoService');

const banco = (desc, valor, extra = {}) => ({ description: desc, amount: valor, date: '2026-11-05', status: 'PENDING', ...extra });
const app = (descricao, valor, extra = {}) => ({ descricao, valor, venc: '2026-11-10', ...extra });

describe('normalizarDescricao', () => {
  test('remove prefixo de data, acentos, pontuação e caixa', () => {
    expect(normalizarDescricao('06/12 JIM.COM.JOAO.V (Fiesta)')).toBe('jim com joao v fiesta');
    expect(normalizarDescricao('MP*MERCADOLIVRE')).toBe('mp mercadolivre');
    expect(normalizarDescricao('Amil Dental (Lorenzo)')).toBe('amil dental lorenzo');
  });

  test('tolera valores vazios', () => {
    expect(normalizarDescricao(null)).toBe('');
    expect(normalizarDescricao(undefined)).toBe('');
  });
});

describe('similaridade', () => {
  test('casa comerciante com token colado (MP*1000WATTSAUTO)', () => {
    expect(similaridade('MP 1000 Watts (movimentado portão)', 'MP*1000WATTSAUTO')).toBeGreaterThanOrEqual(0.5);
  });

  test('casa descrição com palavra extra', () => {
    expect(similaridade('Petz Digital (ração)', 'PETZ DIGITAL')).toBeGreaterThanOrEqual(0.5);
  });

  test('não casa comerciantes diferentes', () => {
    expect(similaridade('09/11 POSTOROTA239 (gasolina)', 'PICPAY*Douglas Si')).toBeLessThan(0.25);
    expect(similaridade('05/05 MP .123COMPROU (fogão)', 'PETZ DIGITAL')).toBeLessThan(0.25);
  });
});

describe('toleranciaPara', () => {
  test('mínimo de 10 centavos e 0,5% acima disso', () => {
    expect(toleranciaPara(10)).toBe(0.1);
    expect(toleranciaPara(1000)).toBe(5);
  });
});

describe('conciliar — casamento 1:1', () => {
  test('valor exato + descrição parecida', () => {
    const r = conciliar({
      transacoes: [banco('CLARO FLEX*Claro', 19.99)],
      lancamentos: [app('Claro Flex dia 06', 19.99)],
    });
    expect(r.casados).toHaveLength(1);
    expect(r.casados[0].motivo).toBe('valor_descricao');
    expect(r.faltandoApp).toHaveLength(0);
  });

  test('diferença acima da tolerância (0,5%) vira divergente, não casado', () => {
    const r = conciliar({
      transacoes: [banco('MP *123COMPROU', 112.69)],
      lancamentos: [app('05/05 MP .123COMPROU (fogão)', 112.0)],
    });
    expect(r.casados).toHaveLength(0);
    expect(r.divergentes).toHaveLength(1);
    expect(r.divergentes[0].diferenca).toBeCloseTo(-0.69, 2);
  });

  test('diferença dentro da tolerância (0,5%) casa como valor', () => {
    const r = conciliar({
      transacoes: [banco('PETZ DIGITAL', 200.5)],
      lancamentos: [app('Petz Digital (ração)', 200.0)],
    });
    expect(r.casados).toHaveLength(1);
    expect(r.divergentes).toHaveLength(0);
  });

  test('usa número de parcela como chave forte mesmo com descrição diferente', () => {
    const r = conciliar({
      transacoes: [banco('JIM.COM JOAO VINICIUS', 949.92, { creditCardMetadata: { installmentNumber: 12, totalInstallments: 12 } })],
      lancamentos: [app('06/12 JIM.COM.JOAO.V (Fiesta)', 949.97, { parcelaatual: 12, totalparcelas: 12 })],
    });
    expect(r.casados).toHaveLength(1);
    expect(r.casados[0].motivo).toBe('parcela');
  });

  test('não casa valor igual de comerciante diferente', () => {
    const r = conciliar({
      transacoes: [banco('POSTO ROTA 239', 49.99)],
      lancamentos: [app('Claro Flex dia 21', 49.99)],
    });
    // casa por valor (não há como saber melhor) mas sinaliza similaridade baixa
    expect(r.casados).toHaveLength(1);
    expect(r.casados[0].motivo).toBe('valor');
    expect(r.casados[0].similaridade).toBeLessThan(0.25);
  });
});

describe('conciliar — rateio 1:N', () => {
  test('uma cobrança no banco = N lançamentos do mesmo comerciante', () => {
    const r = conciliar({
      transacoes: [banco('PETZ DIGITAL', 293.88)],
      lancamentos: [
        app('Petz Digital (ração)', 97.9, { dono: 'Mãe' }),
        app('Petz Digital (ração)', 97.9, { dono: 'Vô' }),
        app('Petz Digital (ração)', 97.9, { dono: '(proprio)' }),
      ],
    });
    expect(r.rateios).toHaveLength(1);
    expect(r.rateios[0].apps).toHaveLength(3);
    expect(r.faltandoApp).toHaveLength(0);
    expect(r.sobrandoApp).toHaveLength(0);
  });

  test('NUNCA soma lançamentos de comerciantes diferentes (falso positivo)', () => {
    // 183,31 (gasolina) + 112,00 (fogão) = 295,31 ≈ 293,88: tentador, mas errado
    const r = conciliar({
      transacoes: [banco('PETZ DIGITAL', 293.88)],
      lancamentos: [
        app('09/11 POSTOROTA239 (gasolina)', 183.31),
        app('05/05 MP .123COMPROU (fogão)', 112.0),
      ],
    });
    expect(r.rateios).toHaveLength(0);
    expect(r.faltandoApp).toHaveLength(1);
    expect(r.sobrandoApp).toHaveLength(2);
  });

  test('não faz rateio de item único', () => {
    const r = conciliar({
      transacoes: [banco('MP*PANASONIC', 74.9)],
      lancamentos: [app('18/02 MP. Panasonic (microondas)', 74.9)],
    });
    expect(r.rateios).toHaveLength(0);
    expect(r.casados).toHaveLength(1);
  });
});

describe('conciliar — divergência de valor', () => {
  test('mesma descrição, valor diferente → divergente (não faltando)', () => {
    const r = conciliar({
      transacoes: [banco('SCP BASICO- NOV/26', 10.26)],
      lancamentos: [app('SCP Basico', 10.0)],
    });
    expect(r.divergentes).toHaveLength(1);
    expect(r.divergentes[0].diferenca).toBeCloseTo(-0.26, 2);
    expect(r.faltandoApp).toHaveLength(0);
  });
});

describe('conciliar — ciclo e recorrência', () => {
  const recorrencias = [
    { id: 1, descricao: 'Claro Flex dia 19', valorTotal: 49.99, diaCobranca: 19, ativo: true },
    { id: 2, descricao: 'Petz Digital (ração)', valorTotal: 293.7, diaCobranca: 8, ativo: true },
  ];

  test('recorrência com dia de cobrança no futuro = previsto, não fantasma', () => {
    const r = conciliar({
      transacoes: [],
      lancamentos: [app('Claro Flex dia 19', 49.99)],
      recorrencias,
      hoje: '2026-11-13',
    });
    expect(r.previstos).toHaveLength(1);
    expect(r.previstos[0].situacao).toBe('previsto_no_ciclo');
    expect(r.sobrandoApp).toHaveLength(0);
  });

  test('recorrência cujo dia já passou sem cobrança = alerta', () => {
    const r = conciliar({
      transacoes: [],
      lancamentos: [app('Petz Digital (ração)', 97.9)],
      recorrencias,
      hoje: '2026-11-13',
    });
    expect(r.previstos).toHaveLength(1);
    expect(r.previstos[0].situacao).toBe('recorrencia_sem_cobranca');
  });

  test('lançamento sem recorrência e sem cobrança = fantasma', () => {
    const r = conciliar({
      transacoes: [],
      lancamentos: [app('Presente de aniversário', 150)],
      recorrencias,
      hoje: '2026-11-13',
    });
    expect(r.sobrandoApp).toHaveLength(1);
    expect(r.previstos).toHaveLength(0);
  });
});

describe('conciliar — rateio sem âncora de descrição', () => {
  test('estorno único rateado entre duas pessoas (soma exata)', () => {
    const r = conciliar({
      transacoes: [banco('Shopee*SHOPEE*mrecearia', -55.52)],
      lancamentos: [
        app('Estorno talheres', -27.76, { dono: '' }),
        app('Estorno talheres', -27.76, { dono: 'Mãe' }),
      ],
    });
    expect(r.rateios).toHaveLength(1);
    expect(r.rateios[0].motivo).toBe('rateio_estorno');
    expect(r.estornosApp).toHaveLength(0);
  });

  test('soma aproximada continua rejeitada (não é rateio, é coincidência)', () => {
    const r = conciliar({
      transacoes: [banco('PETZ DIGITAL', 293.88)],
      lancamentos: [app('09/11 POSTOROTA239 (gasolina)', 183.31), app('05/05 MP .123COMPROU (fogão)', 112.0)],
    });
    expect(r.rateios).toHaveLength(0);
  });

  test('compra com duas combinações possíveis não é rateada (ambígua)', () => {
    const r = conciliar({
      transacoes: [banco('LOJA TESTE', 100)],
      lancamentos: [app('LOJA TESTE A', 50), app('LOJA TESTE B', 50), app('LOJA TESTE C', 50), app('LOJA TESTE D', 50)],
    });
    expect(r.rateios).toHaveLength(0);
  });
});

describe('conciliar — recorrência legada (parcela 99)', () => {
  test('lançamento com totalParcelas 99 é tratado como recorrência mesmo fora da tabela', () => {
    const r = conciliar({
      transacoes: [],
      lancamentos: [app('25/10 MP.MELIMAIS (Meli+ mensal)', 9.9, { parcelaatual: 2, totalparcelas: 99, dono: 'Casa' })],
      recorrencias: [],
      hoje: '2026-11-13',
    });
    expect(r.previstos).toHaveLength(1);
    expect(r.previstos[0].recorrencia.origem).toBe('parcela99');
    expect(r.sobrandoApp).toHaveLength(0);
  });

  test('recorrência desativada não conta como prevista (vira sem cobrança)', () => {
    const r = conciliar({
      transacoes: [],
      lancamentos: [app('Claro Flex dia 19', 49.99, { recorrenciaId: 5, parcelaatual: 1, totalparcelas: 99 })],
      recorrencias: [{ id: 5, descricao: 'Claro Flex negão', valorTotal: 49.99, diaCobranca: 19, ativo: false }],
      hoje: '2026-11-13',
    });
    expect(r.previstos).toHaveLength(0);
    expect(r.sobrandoApp).toHaveLength(1);
    expect(r.sobrandoApp[0].desativada).toBe(true);
  });

  test('casa com a irmã certa usando dia + dono', () => {
    const recorrencias = [
      { id: 1, descricao: 'Claro Flex Dodo', valorTotal: 19.99, diaCobranca: 6, ativo: true, participantes: [{ dono: '', valor: 19.99 }] },
      { id: 2, descricao: 'Claro Flex Morr', valorTotal: 19.99, diaCobranca: 25, ativo: true, participantes: [{ dono: 'Morr', valor: 19.99 }] },
    ];
    const r = conciliar({
      transacoes: [],
      lancamentos: [app('Todo dia 24 - Claro Flex', 19.99, { dono: 'Morr', parcelaatual: 12, totalparcelas: 99 })],
      recorrencias,
      hoje: '2026-11-13',
    });
    expect(r.previstos).toHaveLength(1);
    expect(r.previstos[0].recorrencia.id).toBe(2);
    expect(r.previstos[0].situacao).toBe('previsto_no_ciclo');
  });
});

describe('conciliar — fechamento contábil', () => {
  test('esperado no app + residual = total do app (identidade fecha)', () => {
    const r = conciliar({
      transacoes: [banco('CLARO FLEX*Claro', 19.99), banco('LOJA X', 100)],
      lancamentos: [app('Claro Flex dia 06', 19.99), app('Compra ainda não cobrada', 50)],
      recorrencias: [{ id: 9, descricao: 'Compra ainda não cobrada', valorTotal: 50, diaCobranca: 25, ativo: true }],
      hoje: '2026-11-13',
    });
    const soma = Number((r.esperadoNoApp + r.residual).toFixed(2));
    expect(soma).toBe(Number(r.app.total.toFixed(2)));
    // 100 cobrado e fora do app → esperado = app - 100
    expect(r.esperadoNoApp).toBeCloseTo(69.99, 2);
    expect(r.residual).toBeCloseTo(0, 2);
  });

  test('banco.total = casados + rateios + divergentes + faltando + creditos', () => {
    const r = conciliar({
      transacoes: [
        banco('CLARO FLEX*Claro', 19.99),
        banco('PETZ DIGITAL', 293.88),
        banco('SCP BASICO- NOV/26', 10.26),
        banco('AMAZON BR', 28.4),
        banco('ESTORNO X', -5),
      ],
      lancamentos: [
        app('Claro Flex dia 06', 19.99),
        app('Petz Digital (ração)', 97.9),
        app('Petz Digital (ração)', 97.9),
        app('Petz Digital (ração)', 97.9),
        app('SCP Basico', 10.0),
      ],
    });
    const soma = Number(
      (r.banco.casados + r.banco.rateios + r.banco.divergentes + r.banco.faltando + r.banco.creditos).toFixed(2)
    );
    expect(soma).toBe(r.banco.total);
    expect(r.faltandoApp.map((t) => t.description)).toEqual(['AMAZON BR']);
  });

  test('ignora pagamento de fatura (valor negativo)', () => {
    const r = conciliar({
      transacoes: [banco('PAGAMENTO DE FATURA', -15240.22), banco('CLARO FLEX*Claro', 19.99)],
      lancamentos: [app('Claro Flex dia 06', 19.99)],
    });
    expect(r.banco.quantidade).toBe(1);
    expect(r.banco.total).toBe(19.99);
    expect(r.conciliado).toBe(true);
  });
});

// ==============================================================================
// Dono dos créditos/estornos.
// O banco manda crédito sem dono; o app sabe de quem é a compra. Estorno de
// centavos do JIM pertence a quem paga a parcela do JIM, não ao titular.
// ==============================================================================
describe('dono inferido nos créditos/estornos', () => {
  const compraParcelada = (desc, valor, atual, total, extra = {}) =>
    banco(desc, valor, { date: '2026-10-06', status: 'POSTED', creditCardMetadata: { installmentNumber: atual, totalInstallments: total, billId: 'x' }, ...extra });

  const estorno = (desc, valor) => banco(desc, valor, { date: '2026-10-06', status: 'POSTED', creditCardMetadata: { billId: 'x' } });

  test('herda o dono do terceiro quando o estabelecimento é único no app', () => {
    const r = conciliar({
      transacoes: [compraParcelada('JIM.COM DAVI DE OLIVEIRA', 475.64, 2, 12), estorno('JIM.COM DAVI DE OLIVEIRA', -0.09)],
      lancamentos: [
        {
          descricao: '06/10 JIM.COM Davi De (empréstimo arrumar Uno)',
          valor: 475.64,
          dono: 'Mãe',
          venc: '2026-10-06',
          parcelaatual: 2,
          totalparcelas: 12,
        },
      ],
    });

    expect(r.creditosBanco).toHaveLength(1);
    expect(r.creditosBanco[0]._donoSugerido).toBe('Mãe');
    expect(r.creditosBanco[0]._donoInferido).toBe(true);
  });

  test('casa pelo prefixo do estabelecimento mesmo com sufixo de adquirente', () => {
    const r = conciliar({
      transacoes: [compraParcelada('AIRBNB * HMMQ8MF', 146.67, 2, 6), estorno('AIRBNB * HMMQ8MF', -0.04)],
      lancamentos: [
        {
          descricao: '09/10 AIRBNB (Airbnb Gramado)',
          valor: 146.67,
          dono: 'Morr',
          venc: '2026-10-09',
          parcelaatual: 2,
          totalparcelas: 6,
        },
      ],
    });

    expect(r.creditosBanco[0]._donoSugerido).toBe('Morr');
  });

  test('não chuta dono quando o estabelecimento aparece com mais de um dono', () => {
    const r = conciliar({
      transacoes: [estorno('CLARO FLEX*Claro', -5.0)],
      lancamentos: [
        { descricao: 'Claro Flex dia 06', valor: 19.99, dono: '', venc: '2026-10-06' },
        { descricao: 'Claro Flex dia 21', valor: 49.99, dono: 'Mãe', venc: '2026-10-21' },
      ],
    });

    expect(r.creditosBanco[0]._donoSugerido).toBeUndefined();
    expect(r.creditosBanco[0]._donoInferido).toBeUndefined();
  });

  test('usa a data da compra para desempatar o mesmo estabelecimento', () => {
    // caso real de nov/2026: três JIM.COM DAVI DE OLIVEIRA no mês, de duas pessoas
    const r = conciliar({
      transacoes: [
        compraParcelada('JIM.COM DAVI DE OLIVEIRA', 475.73, 2, 12, { date: '2026-10-30' }),
        compraParcelada('JIM.COM DAVI DE OLIVEIRA', 190.25, 4, 12, { date: '2026-10-30' }),
        estorno('JIM.COM DAVI DE OLIVEIRA', -0.09),
      ],
      lancamentos: [
        { descricao: '06/10 JIM.COM Davi De (empréstimo arrumar Uno)', valor: 475.64, dono: 'Mãe', venc: '2026-11-10', parcelaatual: 2, totalparcelas: 12 },
        { descricao: '07/08 JIM COM Davi (empréstimo contas)', valor: 190.25, dono: 'Davi', venc: '2026-11-10', parcelaatual: 4, totalparcelas: 12 },
      ],
    });
    expect(r.creditosBanco[0]._donoSugerido).toBe('Mãe');
    expect(r.creditosBanco[0]._donoMotivo).toBe('mesmo estabelecimento e mesma data');
  });

  test('titular (dono vazio no banco) é inferido como "eu", não como desconhecido', () => {
    const r = conciliar({
      transacoes: [estorno('UBER *TRIP', -2.5)],
      lancamentos: [{ descricao: '05/10 UBER (corrida shopping)', valor: 32.9, dono: '', venc: '2026-10-05' }],
    });

    expect(r.creditosBanco[0]._donoSugerido).toBe('eu');
  });
});
