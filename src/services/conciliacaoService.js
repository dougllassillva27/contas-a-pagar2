'use strict';
// ==============================================================================
// conciliacaoService — casa a fatura do banco (Pluggy) com os lançamentos do app
// ==============================================================================
// Funções puras, sem I/O: a rota busca os dados e passa aqui. Isso permite testar
// as regras sem banco e sem rede.
//
// Ordem das regras (da mais forte para a mais fraca):
//   1. parcela        — installmentNumber/totalInstallments + valor
//   2. valor+descrição— valor exato e descrição parecida
//   3. tolerância     — valor dentro da variação de centavos de parcela
//   4. rateio (1:N)   — uma cobrança no banco = N lançamentos no app (mesmo comerciante)
//   5. divergente     — mesma compra, valor diferente
// O resto: 🟥 faltando no app / 🟨 sobrando no app (ou ⏳ previsto, se for recorrência)
// ==============================================================================

const TOLERANCIA_ABSOLUTA = 0.1; // 10 centavos
const TOLERANCIA_RELATIVA = 0.005; // 0,5% (parcela varia 1-2 centavos por mês)
const LIMIAR_DESCRICAO = 0.25; // similaridade p/ considerar "casado com confiança"
const LIMIAR_ANCORA = 0.5; // similaridade mínima p/ aceitar rateio (1:N)
const LIMIAR_DIVERGENTE = 0.5;
const LIMIAR_PREFIXO_DONO = 6; // prefixo compacto mínimo p/ dizer "mesmo estabelecimento"
const MAX_CANDIDATOS_RATEIO = 6; // poda do subset-sum
const TAMANHO_MAX_RATEIO = 5;
const TOLERANCIA_RATEIO_EXATO = 0.02; // rateio sem âncora de descrição
const MIN_PREFIXO = 8;
// Duas compras do mesmo estabelecimento em datas distantes são despesas diferentes,
// não "mesma compra com valor diferente". A postagem do cartão atrasa alguns dias,
// então a janela é curta de propósito: 08/11 no banco x 13/11 no app é outra compra.
const JANELA_DATA_DIAS = 4;

// Distância em dias entre duas datas ISO (null quando falta ou é inválida).
function diasEntre(a, b) {
  const iso = (v) => String(v || '').slice(0, 10);
  const da = new Date(`${iso(a)}T00:00:00Z`);
  const db = new Date(`${iso(b)}T00:00:00Z`);
  if (!iso(a) || !iso(b) || Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;
  return Math.round(Math.abs(da - db) / 86400000);
}

// Data do banco é a da compra; a do app é o vencimento/lançamento. Sem data de um
// dos lados não dá para excluir o par, então o casamento segue como antes.
function dataCompativel(itemBanco, itemApp, janela = JANELA_DATA_DIAS) {
  const dias = diasEntre(itemBanco && itemBanco._data, itemApp && itemApp._data);
  return dias == null || dias <= janela;
}

// Remove acento, prefixo de data ("06/12 "), pontuação e caixa
function normalizarDescricao(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^\s*\d{1,2}\s*\/\s*\d{1,2}\s+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactar(valor) {
  return normalizarDescricao(valor).replace(/ /g, '');
}

function tokens(valor) {
  return new Set(
    normalizarDescricao(valor)
      .split(' ')
      .filter((t) => t.length > 2)
  );
}

function jaccard(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

function prefixoComum(a, b) {
  let i = 0;
  const max = Math.min(a.length, b.length);
  while (i < max && a[i] === b[i]) i++;
  return i;
}

// Similaridade final: Jaccard de tokens, com bônus para prefixo/containment.
// Ex.: "MP 1000 Watts (movimentado portão)" x "MP*1000WATTSAUTO" → prefixo "mp1000watts".
function similaridade(a, b) {
  const j = jaccard(a, b);
  const ca = compactar(a);
  const cb = compactar(b);
  if (!ca || !cb) return j;
  const prefixo = prefixoComum(ca, cb);
  if (prefixo >= MIN_PREFIXO) return Math.max(j, 0.6);
  const menor = ca.length <= cb.length ? ca : cb;
  const maior = ca.length <= cb.length ? cb : ca;
  if (menor.length >= 6 && maior.includes(menor)) return Math.max(j, 0.6);
  return j;
}

function toleranciaPara(valorBanco) {
  return Math.max(TOLERANCIA_ABSOLUTA, Math.abs(valorBanco) * TOLERANCIA_RELATIVA);
}

function valorDe(item) {
  if (item == null) return 0;
  const bruto = item.amount != null ? item.amount : item.valor;
  return Number(bruto) || 0;
}

function dataDe(item) {
  const bruto = item.date || item.venc || item.datavencimento;
  if (!bruto) return null;
  return String(bruto).slice(0, 10);
}

function descricaoDe(item) {
  return item.description || item.descricao || '';
}

function parcelaDe(item) {
  const meta = item.creditCardMetadata || {};
  const atual = meta.installmentNumber != null ? meta.installmentNumber : item.parcelaatual;
  const total = meta.totalInstallments != null ? meta.totalInstallments : item.totalparcelas;
  if (!atual || !total) return null;
  return { atual: Number(atual), total: Number(total) };
}

// Subset-sum restrito: soma combinações dos candidatos até fechar o valor do banco.
// Usado só com candidatos já ancorados pela descrição — sem isso gera falso positivo
// (testado: soma aleatória casou "PETZ" com gasolina + fogão).
function acharCombinacao(candidatos, alvo, tolerancia = null) {
  const tol = tolerancia != null ? tolerancia : toleranciaPara(alvo);
  const pool = candidatos
    .slice()
    .sort((a, b) => Math.abs(valorDe(b)) - Math.abs(valorDe(a)))
    .slice(0, MAX_CANDIDATOS_RATEIO)
    .filter((c) => Math.abs(valorDe(c)) <= Math.abs(alvo) + tol);

  for (let tamanho = 2; tamanho <= TAMANHO_MAX_RATEIO; tamanho++) {
    let achado = null;
    (function combinar(inicio, escolhidos, soma) {
      if (achado) return;
      if (escolhidos.length === tamanho) {
        if (Math.abs(soma - alvo) <= tol) achado = escolhidos.slice();
        return;
      }
      for (let i = inicio; i < pool.length; i++) {
        const nova = soma + valorDe(pool[i]);
        if (Math.abs(nova) > Math.abs(alvo) + tol) continue;
        escolhidos.push(pool[i]);
        combinar(i + 1, escolhidos, nova);
        escolhidos.pop();
        if (achado) return;
      }
    })(0, [], 0);
    if (achado) return achado;
  }
  return null;
}

function totalizar(itens) {
  return itens.reduce((soma, item) => soma + valorDe(item), 0);
}

// A recorrência "explica" um lançamento que ainda não apareceu no banco?
// O dia de cobrança está na descrição do app ("Claro Flex dia 21") e/ou no cadastro
// da recorrência: casar só pela descrição erra entre irmãs ("dia 19" x "dia 21").
function extrairDia(descricao) {
  const m = String(descricao || '').match(/\bdia\s*(\d{1,2})\b/i);
  return m ? Number(m[1]) : null;
}

function recorrenciaDoLancamento(lancamento, recorrencias) {
  if (lancamento.recorrenciaId) {
    return recorrencias.find((r) => String(r.id) === String(lancamento.recorrenciaId)) || null;
  }

  // Legado do app: recorrência era modelada como "parcela 99". Continua valendo
  // como recorrência mesmo sem estar na tabela `recorrencias`.
  const totalParcelas = Number(lancamento.totalparcelas || 0);
  const legado = totalParcelas >= 99;

  const diaLancamento = extrairDia(lancamento.descricao);
  const donoLancamento = String(lancamento.dono || '').trim().toLowerCase();

  let melhor = null;
  let melhorPeso = 0;
  for (const r of recorrencias) {
    const s = similaridade(lancamento.descricao, r.descricao);
    if (s < 0.35) continue;
    const diaRec = Number(r.diaCobranca || 0);
    const valorRec = Number(r.valorTotal || 0);
    let peso = s;
    // mesmo dia (ou vizinho): desempata irmãs tipo "Claro Flex dia 19" x "dia 21"
    if (diaLancamento && diaRec) {
      const dist = Math.abs(diaLancamento - diaRec);
      peso += 0.25 * (1 - Math.min(dist, 31) / 31);
    }
    if (valorRec && Math.abs(valorRec - valorDe(lancamento)) <= toleranciaPara(valorRec)) peso += 0.25;
    // o dono do lançamento aparece no rateio da recorrência
    if (donoLancamento) {
      const donos = (r.participantes || []).map((p) => String(p.dono || '').trim().toLowerCase());
      if (donos.includes(donoLancamento)) peso += 0.25;
    }
    if (peso > melhorPeso) {
      melhorPeso = peso;
      melhor = r;
    }
  }

  if (melhor && melhorPeso >= 0.5) return melhor;
  if (legado) {
    return {
      id: null,
      descricao: lancamento.descricao,
      valorTotal: valorDe(lancamento),
      diaCobranca: diaLancamento,
      ativo: true,
      origem: 'parcela99',
    };
  }
  return null;
}

/**
 * @param {Object} entrada
 * @param {Array} entrada.transacoes   transações do cartão (Pluggy)
 * @param {Array} entrada.lancamentos  lançamentos do app no mês
 * @param {Array} entrada.recorrencias recorrências ativas do usuário
 * @param {Date|string} entrada.hoje   data de referência (default: agora)
 */
function conciliar({ transacoes = [], lancamentos = [], recorrencias = [], hoje = new Date() } = {}) {
  const diaHoje = typeof hoje === 'string' ? Number(String(hoje).slice(8, 10)) : new Date(hoje).getDate();

  // Pagamento de fatura não é compra: sai do confronto. Créditos/estornos (negativos)
  // ficam, porque o app também lança estornos negativos e os dois precisam se encontrar.
  const ehPagamentoFatura = (t) => /pagamento\s*(de\s*)?fatura|pagto\s*fatura/i.test(descricaoDe(t));

  const banco = transacoes
    .filter((t) => valorDe(t) !== 0 && !ehPagamentoFatura(t))
    .map((t) => ({ ...t, _valor: valorDe(t), _desc: descricaoDe(t), _data: dataDe(t) }))
    .sort((a, b) => Math.abs(b._valor) - Math.abs(a._valor));

  const app = lancamentos
    .filter((l) => valorDe(l) !== 0)
    .map((l) => ({ ...l, _valor: valorDe(l), _desc: descricaoDe(l), _data: dataDe(l) }));

  const usados = new Set();
  const casados = [];
  const rateios = [];
  const divergentes = [];

  const disponiveis = () => app.filter((_, idx) => !usados.has(idx));

  // ---- Regra 1: parcela (a chave mais forte que existe nos dois lados) ----------
  for (const t of banco) {
    if (t._casado) continue;
    const parcelaBanco = parcelaDe(t);
    if (!parcelaBanco) continue;
    const idx = app.findIndex(
      (l, i) =>
        !usados.has(i) &&
        (() => {
          const p = parcelaDe(l);
          return (
            p &&
            p.atual === parcelaBanco.atual &&
            p.total === parcelaBanco.total &&
            Math.abs(l._valor - t._valor) <= toleranciaPara(t._valor)
          );
        })()
    );
    if (idx >= 0) {
      usados.add(idx);
      t._casado = true;
      casados.push({ banco: t, app: app[idx], motivo: 'parcela' });
    }
  }

  // ---- Regras 2 e 3: valor (exato → tolerância) + descrição ------------------
  for (const t of banco) {
    if (t._casado) continue;
    const candidatos = app
      .map((l, idx) => ({ l, idx }))
      .filter(({ l, idx }) => !usados.has(idx) && Math.abs(l._valor - t._valor) <= toleranciaPara(t._valor));
    if (!candidatos.length) continue;

    const exatos = candidatos.filter(({ l }) => Math.abs(l._valor - t._valor) < 0.005);
    const ordem = (exatos.length ? exatos : candidatos)
      .map((c) => ({
        ...c,
        sim: similaridade(c.l._desc, t._desc),
        // data mais próxima ganha: o mesmo comerciante repete valor em compras
        // diferentes no mês, então o texto desempata depois da data, não antes.
        dist: diasEntre(t._data, c.l._data) ?? Number.POSITIVE_INFINITY,
      }))
      .sort((a, b) => a.dist - b.dist || b.sim - a.sim);

    const melhor = ordem[0];
    usados.add(melhor.idx);
    t._casado = true;
    casados.push({
      banco: t,
      app: melhor.l,
      motivo: melhor.sim >= LIMIAR_DESCRICAO ? 'valor_descricao' : 'valor',
      similaridade: Number(melhor.sim.toFixed(3)),
    });
  }

  // ---- Regra 4: rateio (1 cobrança no banco = N lançamentos no app) -----------
  for (const t of banco) {
    if (t._casado) continue;
    const ancorados = disponiveis().filter((l) => similaridade(l._desc, t._desc) >= LIMIAR_ANCORA);
    if (ancorados.length < 2) continue;
    const comb = acharCombinacao(ancorados, t._valor);
    if (!comb) continue;
    // ambiguidade: se existe outra combinação válida, não é rateio — é coincidência
    const restantes = ancorados.filter((l) => !comb.includes(l));
    if (restantes.length >= 2 && acharCombinacao(restantes, t._valor)) continue;
    for (const item of comb) {
      const idx = app.findIndex((l, i) => !usados.has(i) && l === item);
      if (idx >= 0) usados.add(idx);
    }
    t._casado = true;
    rateios.push({ banco: t, apps: comb, motivo: 'rateio' });
  }

  // ---- Regra 4b: rateio sem âncora — soma EXATA e combinação única ------------
  // Caso real: um estorno de R$ 55,52 rateado em 2× R$ 27,76 (metade dele, metade da mãe).
  // Sem âncora de descrição só aceita soma exata (2 centavos) e, em compras, apenas
  // quando existe uma única combinação possível (senão seria chute).
  for (const t of banco) {
    if (t._casado) continue;
    const sinal = Math.sign(t._valor);
    const pool = disponiveis().filter((l) => Math.sign(l._valor) === sinal);
    if (pool.length < 2) continue;
    const combinacao = acharCombinacao(pool, t._valor, TOLERANCIA_RATEIO_EXATO);
    if (!combinacao) continue;
    if (t._valor > 0) {
      const restantes = pool.filter((l) => !combinacao.includes(l));
      const alternativa = acharCombinacao(restantes, t._valor, TOLERANCIA_RATEIO_EXATO);
      if (alternativa) continue; // ambíguo: não arrisca em compra
    }
    for (const item of combinacao) {
      const idx = app.findIndex((l, i) => !usados.has(i) && l === item);
      if (idx >= 0) usados.add(idx);
    }
    t._casado = true;
    rateios.push({
      banco: t,
      apps: combinacao,
      motivo: t._valor < 0 ? 'rateio_estorno' : 'rateio_valor',
      confianca: 'baixa',
    });
  }

  // ---- Regra 5: divergente (mesma compra, valor diferente) -------------------
  for (const t of banco) {
    if (t._casado) continue;
    const candidatos = app
      .map((l, idx) => ({ l, idx, sim: similaridade(l._desc, t._desc) }))
      // a data é obrigatória aqui: valor diferente + nome parecido é o par mais frágil
      // de todos, e o mesmo estabelecimento repete nome em compras de dias diferentes.
      .filter((c) => !usados.has(c.idx) && c.sim >= LIMIAR_DIVERGENTE && dataCompativel(t, c.l))
      .sort((a, b) => b.sim - a.sim);
    if (!candidatos.length) continue;
    const melhor = candidatos[0];
    // só considera divergente se o valor for próximo (mesma ordem de grandeza)
    const diferenca = melhor.l._valor - t._valor;
    if (Math.abs(diferenca) > Math.max(1, t._valor * 0.25)) continue;
    usados.add(melhor.idx);
    t._casado = true;
    divergentes.push({ banco: t, app: melhor.l, diferenca: Number(diferenca.toFixed(2)), similaridade: Number(melhor.sim.toFixed(3)) });
  }

  // ---- Sobras ---------------------------------------------------------------
  // Compras e créditos ficam separados: crédito/estorno (-X) não é "conta esquecida".
  const faltandoApp = banco.filter((t) => !t._casado && t._valor > 0);
  const creditosBanco = banco.filter((t) => !t._casado && t._valor < 0);

  // ---- Dono dos créditos/estornos -------------------------------------------
  // Crédito do banco chega sem dono. Herda o dono do lançamento do mesmo
  // estabelecimento, e a data resolve o empate quando o mesmo estabelecimento
  // tem lançamentos de pessoas diferentes: o crédito de 06/10 casa com o
  // lançamento "06/10 JIM.COM Davi De" (Mãe), não com o "07/08 JIM COM Davi" (Davi).
  const donoDe = (item) => {
    const bruto = item && (item.dono != null ? item.dono : item.nometerceiro);
    return String(bruto || '').trim() || 'eu'; // vazio no banco = titular
  };
  const primeiroToken = (valor) => normalizarDescricao(valor).split(' ')[0] || '';
  const mesmoEstabelecimento = (a, b) => {
    // prefixo compacto curto já basta: "JIM.COM DAVI DE OLIVEIRA" x "JIM.COM Davi De
    // (empréstimo...)" compartilham "jimcomdavide"; "AIRBNB * HMMQ8MF" x "AIRBNB
    // (Airbnb Gramado)" compartilham "airbnb". Códigos de adquirente ("MP *...")
    // param no 2º caractere e não casam.
    const ca = compactar(a);
    const cb = compactar(b);
    if (ca && cb && prefixoComum(ca, cb) >= LIMIAR_PREFIXO_DONO) return true;
    const ta = primeiroToken(a);
    if (ta && ta === primeiroToken(b) && ta.length >= 4) return true;
    return similaridade(a, b) >= LIMIAR_DIVERGENTE;
  };
  // A descrição do lançamento do app segue o padrão "DD/MM ESTABELECIMENTO".
  const diaMesDaDescricao = (texto) => {
    const m = String(texto || '').match(/^\s*(\d{1,2})\s*\/\s*(\d{1,2})\s+/);
    return m ? `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}` : null;
  };
  const diaMesDaData = (iso) => {
    const [, mes, dia] = String(iso || '').slice(0, 10).split('-');
    return mes && dia ? `${dia}/${mes}` : null;
  };

  const donosConhecidos = [];
  const registrar = (descricaoApp, descricaoBanco, dono) => {
    if (!descricaoApp && !descricaoBanco) return;
    donosConhecidos.push({ app: descricaoApp || '', banco: descricaoBanco || '', dono, diaMes: diaMesDaDescricao(descricaoApp) });
  };
  for (const c of casados) registrar(descricaoDe(c.app), descricaoDe(c.banco), donoDe(c.app));
  for (const d of divergentes) registrar(descricaoDe(d.app), descricaoDe(d.banco), donoDe(d.app));
  for (const r of rateios) for (const a of r.apps || []) registrar(descricaoDe(a), descricaoDe(r.banco), donoDe(a));
  for (const l of app) registrar(descricaoDe(l), '', donoDe(l));

  for (const t of creditosBanco) {
    const candidatos = donosConhecidos.filter((k) => mesmoEstabelecimento(t._desc, k.app || k.banco));
    if (!candidatos.length) continue;
    const diaMes = diaMesDaData(t._data);
    const porData = diaMes ? candidatos.filter((k) => k.diaMes === diaMes) : [];
    // data só decide quando ela própria não é ambígua entre donos diferentes
    const base = porData.length && new Set(porData.map((k) => k.dono)).size === 1 ? porData : candidatos;
    const donos = new Set(base.map((k) => k.dono));
    if (donos.size === 1) {
      t._donoSugerido = [...donos][0];
      t._donoInferido = true;
      t._donoMotivo = base === porData ? 'mesmo estabelecimento e mesma data' : 'único dono do estabelecimento';
    }
  }

  const sobrasApp = disponiveis();
  const estornosApp = sobrasApp.filter((l) => l._valor < 0);

  const sobrandoApp = [];
  const previstos = [];
  for (const l of sobrasApp) {
    if (l._valor < 0) continue; // já classificados como estorno
    const recorrencia = recorrenciaDoLancamento(l, recorrencias);
    if (recorrencia && recorrencia.ativo !== false) {
      const dia = Number(recorrencia.diaCobranca || recorrencia.dia_cobranca || 0);
      previstos.push({
        app: l,
        recorrencia,
        // dia cadastrado no futuro = ainda vai cair neste ciclo (não é erro)
        // dia já passado sem cobrança = possível falha/cancelamento
        // sem dia cadastrado = não dá para julgar, só mostrar
        situacao: !dia ? 'sem_dia_cadastrado' : dia > diaHoje ? 'previsto_no_ciclo' : 'recorrencia_sem_cobranca',
      });
    } else if (recorrencia && recorrencia.ativo === false) {
      // recorrência desativada: o lançamento do mês ficou órfão — mostra como
      // "sem cobrança" em vez de fingir que ainda é previsto
      sobrandoApp.push({ ...l, desativada: true });
    } else {
      sobrandoApp.push(l);
    }
  }

  const soma = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0);
  const bancoTotal = soma(banco, (t) => t._valor);
  const appTotal = soma(app, (l) => l._valor);
  const casadosBanco = soma(casados, (c) => c.banco._valor);
  const casadosApp = soma(casados, (c) => c.app._valor);
  const rateiosValor = soma(rateios, (r) => r.banco._valor);
  const divergentesBanco = soma(divergentes, (d) => d.banco._valor);
  const faltandoTotal = soma(faltandoApp, (t) => t._valor);
  const creditosTotal = soma(creditosBanco, (t) => t._valor);
  const sobrandoTotal = soma(sobrandoApp, (l) => l._valor);
  const estornosTotal = soma(estornosApp, (l) => l._valor);
  const previstoTotal = soma(previstos, (p) => p.app._valor);

  // O que o app DEVERIA somar: o que o banco cobrou, menos o que está no banco e
  // fora do app, mais o que ainda vai ser cobrado (e o que está no app sem par).
  // Assim a conta bate com a que se faz na mão: banco + não cobrado = app.
  const esperadoNoApp =
    bancoTotal - faltandoTotal - creditosTotal + previstoTotal + sobrandoTotal + estornosTotal;

  return {
    banco: {
      total: Number(bancoTotal.toFixed(2)),
      quantidade: banco.length,
      casados: Number(casadosBanco.toFixed(2)),
      rateios: Number(rateiosValor.toFixed(2)),
      divergentes: Number(divergentesBanco.toFixed(2)),
      faltando: Number(faltandoTotal.toFixed(2)),
      creditos: Number(creditosTotal.toFixed(2)),
    },
    app: {
      total: Number(appTotal.toFixed(2)),
      quantidade: app.length,
      previsto: Number(previstoTotal.toFixed(2)),
      sobrando: Number(sobrandoTotal.toFixed(2)),
      estornos: Number(estornosTotal.toFixed(2)),
    },
    casamento: {
      banco: Number((casadosBanco + rateiosValor + divergentesBanco).toFixed(2)),
      app: Number((casadosApp + rateiosValor).toFixed(2)),
    },
    esperadoNoApp: Number(esperadoNoApp.toFixed(2)),
    diferenca: Number((appTotal - bancoTotal).toFixed(2)),
    // Sobra depois de explicar tudo: são os centavos de casamento (tolerância de
    // parcela e divergência de valor). Perto de zero = fatura conferida.
    residual: Number((appTotal - esperadoNoApp).toFixed(2)),
    conciliado: faltandoApp.length === 0 && sobrandoApp.length === 0 && divergentes.length === 0,
    casados,
    rateios,
    divergentes,
    faltandoApp,
    creditosBanco,
    sobrandoApp,
    estornosApp,
    previstos,
  };
}

module.exports = {
  conciliar,
  normalizarDescricao,
  similaridade,
  toleranciaPara,
  acharCombinacao,
  diasEntre,
  dataCompativel,
  LIMIAR_DESCRICAO,
  LIMIAR_ANCORA,
  TOLERANCIA_ABSOLUTA,
  TOLERANCIA_RELATIVA,
  JANELA_DATA_DIAS,
};
