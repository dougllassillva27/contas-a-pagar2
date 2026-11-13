// ==============================================================================
// conciliacao.js - modal "Conferência do cartão" (Pluggy x lançamentos do app)
// ==============================================================================
// Só lê: busca o diff em /api/conciliacao/cartao e desenha as listas.
// O único write é o botão "confirmar casados", que reusa o endpoint em lote que
// já existia (/api/lancamentos/conferido-extrato-lote).
// ==============================================================================

import { escapeHTML } from './shared.js';

const brl = (n) =>
  'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function csrf() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : '';
}

function mesAno() {
  return {
    month: parseInt(document.body.dataset.month, 10),
    year: parseInt(document.body.dataset.year, 10),
  };
}

const pill = (texto, cor = 'azul') =>
  texto ? `<span class="conciliacao-pill conciliacao-pill-${cor}">${escapeHTML(texto)}</span>` : '';

// Uma linha do diff: descrição + selos à esquerda, valor à direita.
// `sub` renderiza uma segunda linha (usada no rateio).
function linha({ descricao, selos = [], valor, valorCor = '', sub = '', destaque = false }) {
  return `<div class="conciliacao-linha${destaque ? ' conciliacao-linha-destaque' : ''}">
      <div class="conciliacao-esq">
        <span class="conciliacao-desc" title="${escapeHTML(descricao)}">${escapeHTML(descricao)}</span>
        ${selos.filter(Boolean).join('')}
      </div>
      <div class="conciliacao-dir"${valorCor ? ` style="color:${valorCor}"` : ''}>${valor}</div>
      ${sub ? `<div class="conciliacao-sub">${sub}</div>` : ''}
    </div>`;
}

// Cabeçalho de uma coluna: título + contador + total
function cabecalhoColuna(titulo, itens, cor) {
  const total = (itens || []).reduce((s, x) => s + Number(x.valor != null ? x.valor : 0), 0);
  const quantidade = (itens || []).length;
  return `<div class="conciliacao-col-cab">
      <span style="color:${cor}">${titulo} ${quantidade ? `<span class="conciliacao-contador">${quantidade}</span>` : ''}</span>
      ${quantidade ? `<span class="conciliacao-total" style="color:${cor}">${brl(total)}</span>` : ''}
    </div>`;
}

// Uma coluna = cabeçalho + corpo (com estado vazio)
function coluna({ titulo, itens, cor, vazio, corpo, classe = '' }) {
  const conteudo = corpo || (itens && itens.length ? '' : `<p class="conciliacao-vazio">${vazio}</p>`);
  return `<section class="conciliacao-col ${classe}">
      ${cabecalhoColuna(titulo, itens, cor)}
      <div class="conciliacao-col-corpo">${conteudo}</div>
    </section>`;
}

// dd/MM/yyyy HH:mm:ss sem depender do locale do navegador
function formatarDataHora(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function render(dados) {
  const corpo = document.getElementById('conciliacaoCorpo');
  const residual = document.getElementById('conciliacaoResidual');
  const fonte = document.getElementById('conciliacaoFonte');
  if (!corpo) return;

  if (dados.configurado === false) {
    corpo.innerHTML = `<p style="color: var(--text-secondary);">Pluggy não configurada. Rode <code>scripts/pluggy-setup.js</code> no servidor.</p>`;
    if (residual) residual.textContent = '-';
    return;
  }
  if (dados.erro && !dados.totais) {
    corpo.innerHTML = `<p style="color: var(--red);">Erro ao sincronizar: ${escapeHTML(dados.erro)}</p>`;
    return;
  }

  const t = dados.totais;
  if (!t) {
    corpo.innerHTML = `<p style="color: var(--text-secondary);">Sem dados ainda. Clique em <b>Sincronizar banco</b>.</p>`;
    return;
  }

  if (fonte) {
    // só o carimbo da sincronização: total da fatura e contagem já estão na 1ª coluna
    const quando = dados.atualizadoEm ? formatarDataHora(dados.atualizadoEm) : '-';
    fonte.textContent = `Última sincronização: ${quando}`;
  }
  if (residual) {
    // O selo diz o que FALTA RESOLVER, não a diferença bruta: "fechado" colidia com
    // o Fechar Mês, e o número exibido (app - banco) assusta sem indicar pendência.
    const faltando = dados.resumo.faltando || 0;
    const divergentes = dados.resumo.divergentes || 0;
    const sobrando = dados.resumo.sobrando || 0;
    const pendencias = faltando + divergentes + sobrando;
    const sobra = Number(t.residual) || 0;

    residual.classList.remove('verde', 'vermelho', 'laranja');
    if (pendencias > 0) {
      const partes = [];
      if (faltando) partes.push(`${faltando} cobrado no banco e fora do app`);
      if (divergentes) partes.push(`${divergentes} com valor diferente`);
      if (sobrando) partes.push(`${sobrando} no app sem cobrança`);
      residual.textContent = `${pendencias} ${pendencias === 1 ? 'pendência' : 'pendências'}`;
      residual.title = `Falta resolver: ${partes.join(' · ')}`;
      residual.classList.add('vermelho');
    } else if (Math.abs(sobra) < 0.5) {
      residual.textContent = 'conferido';
      residual.title = `Nada pendente. Sobra de centavos: ${brl(sobra)}`;
      residual.classList.add('verde');
    } else {
      residual.textContent = `sobra ${brl(sobra)}`;
      residual.title = 'Nenhuma cobrança sem par, mas a soma do app não fecha com a fatura';
      residual.classList.add('laranja');
    }
  }

  const totalCasado =
    (dados.casados || []).reduce((s, c) => s + c.valor, 0) + (dados.rateios || []).reduce((s, r) => s + r.valor, 0);
  const fechou = Math.abs(t.residual) < 0.5;
  const casadosComId = (dados.casados || []).filter((c) => c.app && c.app.id);

  // ---------- Coluna 1: a fatura e o fechamento ----------------------------
  const resumoLinhas = [
    linha({ descricao: 'Fatura aberta no banco', valor: brl(t.banco.total) }),
    linha({
      descricao: 'Ainda não cobrado no ciclo',
      valor: `+ ${brl(t.app.previsto + (t.app.sobrando || 0))}`,
      valorCor: 'var(--text-secondary)',
    }),
    t.banco.faltando
      ? linha({ descricao: 'Cobrado e fora do app', valor: `- ${brl(t.banco.faltando)}`, valorCor: 'var(--red)' })
      : '',
    linha({ descricao: 'Esperado no app', valor: brl(t.esperadoNoApp), valorCor: 'var(--text-secondary)' }),
    linha({ descricao: 'Lançado no app', valor: brl(t.app.total) }),
    linha({
      descricao: fechou ? 'Confere (centavos)' : 'Sobra não explicada',
      valor: brl(t.residual),
      valorCor: fechou ? 'var(--green)' : 'var(--red)',
      destaque: true,
    }),
  ].join('');

  const colResumo = `<section class="conciliacao-col conciliacao-col-resumo">
      <div class="conciliacao-col-cab">
        <span>Fatura</span>
        <span class="conciliacao-total">${brl(t.banco.total)}</span>
      </div>
      <div class="conciliacao-col-corpo">
        <div class="conciliacao-fechamento">${resumoLinhas}</div>
        <p class="conciliacao-nota">${dados.resumo.casados} de ${t.banco.quantidade} cobranças casadas · ${brl(
          totalCasado
        )}</p>
        ${
          casadosComId.length
            ? `<button class="btn-secondary conciliacao-btn-largo" onclick="confirmarCasados()">Marcar ${
                casadosComId.length
              } casados como conferidos</button>`
            : ''
        }
      </div>
    </section>`;

  // ---------- Coluna 2: o que o banco cobrou e o app não tem ---------------
  const linhasFaltando = (dados.faltando || [])
    .map((x) =>
      linha({
        descricao: x.descricao,
        selos: [pill(x.data, 'cinza'), pill(x.parcela, 'azul')],
        valor: brl(x.valor),
        destaque: true,
      })
    )
    .join('');

  const linhasDivergentes = (dados.divergentes || [])
    .map((x) =>
      linha({
        descricao: x.descricao,
        selos: [pill(x.data, 'cinza'), pill(x.app.dono || 'eu', 'verde')],
        valor: `${x.diferenca > 0 ? '+' : ''}${brl(x.diferenca)}`,
        valorCor: 'var(--blue)',
        sub: `<span class="conciliacao-sub-item">app: ${pill(brl(x.app.valor), 'cinza')}</span>`,
      })
    )
    .join('');

  const linhasSobrando = (dados.sobrando || [])
    .map((x) =>
      linha({
        descricao: x.descricao,
        selos: [pill(x.dono || 'eu', 'verde'), pill(x.venc, 'cinza')],
        valor: brl(x.valor),
        valorCor: '#e0a100',
      })
    )
    .join('');

  const corpoForaDoApp = [
    linhasFaltando,
    linhasDivergentes
      ? `<div class="conciliacao-sub-cab">🔀 valor diferente <span class="conciliacao-contador">${dados.divergentes.length}</span></div>${linhasDivergentes}`
      : '',
    linhasSobrando
      ? `<div class="conciliacao-sub-cab">🟨 sem cobrança <span class="conciliacao-contador">${dados.sobrando.length}</span></div>${linhasSobrando}`
      : '',
  ].join('');

  const colForaDoApp = coluna({
    titulo: '🟥 Fora do sistema',
    itens: [...(dados.faltando || []), ...(dados.divergentes || []), ...(dados.sobrando || [])],
    cor: 'var(--red)',
    vazio: 'Tudo o que o banco cobrou está lançado ✓',
    corpo: corpoForaDoApp,
  });

  // ---------- Coluna 3: ainda não cobrado ----------------------------------
  const colPrevistos = coluna({
    titulo: '⏳ Ainda não cobrado',
    itens: dados.previstos,
    cor: 'var(--text-secondary)',
    vazio: 'Nada pendente neste ciclo',
    corpo: (dados.previstos || [])
      .map((x) => {
        const rotulo =
          x.situacao === 'previsto_no_ciclo'
            ? pill('previsto', 'azul')
            : x.situacao === 'sem_dia_cadastrado'
              ? pill('sem dia', 'cinza')
              : pill('não cobrada', 'vermelho');
        return linha({
          descricao: x.descricao,
          selos: [pill(x.dono || 'eu', 'verde'), rotulo],
          valor: brl(x.valor),
          valorCor: 'var(--text-secondary)',
        });
      })
      .join(''),
  });

  // ---------- Coluna 4: rateios --------------------------------------------
  const tituloRateio =
    (dados.rateios || []).length && dados.rateios[0].motivo === 'rateio_estorno'
      ? '🔗 Estorno rateado'
      : (dados.rateios || []).length && dados.rateios[0].motivo === 'rateio_valor'
        ? '🔗 Rateio (por valor)'
        : '🔗 Rateio';

  const colRateios = coluna({
    titulo: tituloRateio,
    itens: dados.rateios,
    cor: 'var(--text-secondary)',
    vazio: 'Nenhuma cobrança dividida',
    corpo: (dados.rateios || [])
      .map((x) => {
        const partes = x.partes
          .map(
            (p) =>
              `<span class="conciliacao-parte">${pill(p.dono || 'eu', 'verde')}<span class="conciliacao-parte-valor">${brl(
                p.valor
              )}</span></span>`
          )
          .join('');
        return linha({
          descricao: x.descricao,
          selos: [pill(x.data, 'cinza')],
          valor: brl(x.valor),
          sub: `<div class="conciliacao-partes">${partes}</div>`,
        });
      })
      .join(''),
  });

  // ---------- Coluna 5: estornos / créditos --------------------------------
  const semPar = [...(dados.estornos || []), ...(dados.creditos || [])];
  const colEstornos = coluna({
    titulo: '💸 Estornos / créditos',
    itens: semPar,
    cor: 'var(--text-secondary)',
    vazio: 'Nenhum crédito solto',
    corpo: semPar
      .map((x) =>
        linha({
          descricao: x.descricao,
          selos: [
            pill(x.data || x.venc, 'cinza'),
            pill(x.dono || (x.origem === 'banco' ? 'sem dono' : 'eu'), 'verde'),
          ],
          valor: brl(x.valor),
          valorCor: 'var(--text-secondary)',
        })
      )
      .join(''),
  });

  const html = `<div class="conciliacao-grid">${colResumo}${colForaDoApp}${colPrevistos}${colRateios}${colEstornos}</div>`;

  corpo.innerHTML = html;
  window.__conciliacaoCasados = casadosComId.map((c) => c.app.id);
  window.__conciliacaoCarregada = true;

  // Preenche o campo "APP:" com o total do banco (o valor que ele somava na mão)
  const inputApp = document.querySelector('.app-compare-input');
  if (inputApp && t.banco.total > 0) {
    inputApp.value = brl(t.banco.total);
    inputApp.title = 'Preenchido pela fatura do banco (Pluggy)';
    inputApp.dataset.origem = 'pluggy';
  }
}

// Abre o modal do menu lateral. Sempre recarrega: a Pluggy fica em cache de 15 min,
// mas os lançamentos do app são lidos do banco a cada GET - ou seja, o que você
// acabou de cadastrar aparece sem F5.
export function abrirModalConciliacao() {
  const modal = document.getElementById('modalConciliacao');
  if (!modal) return;
  if (document.querySelector('.modal-overlay.active')) return;

  const registerModalOpen =
    typeof window.registerModalOpen === 'function'
      ? window.registerModalOpen
      : () => {
          // Mesmo efeito de registerModalOpen do ui.js (ele não é exposto no window)
          if (document.activeElement) document.activeElement.blur();
          document.body.classList.add('no-scroll');
          history.pushState({ modal: true }, '', '');
        };
  registerModalOpen();
  modal.classList.add('active');
  carregarConciliacao();
}

export async function carregarConciliacao() {
  const corpo = document.getElementById('conciliacaoCorpo');
  if (!corpo) return;
  if (!window.__conciliacaoCarregada) {
    corpo.innerHTML = `<p style="color: var(--text-secondary);">Carregando conferência…</p>`;
  }
  const { month, year } = mesAno();
  try {
    const res = await fetch(`/api/conciliacao/cartao?month=${month}&year=${year}`);
    const dados = await res.json();
    render(dados);
  } catch (err) {
    corpo.innerHTML = `<p style="color: var(--red);">Falha ao carregar a conciliação: ${escapeHTML(err.message)}</p>`;
  }
}

export async function sincronizarBanco() {
  const corpo = document.getElementById('conciliacaoCorpo');
  if (corpo) corpo.innerHTML = '<p style="color: var(--text-secondary);">Sincronizando com o banco…</p>';
  try {
    const res = await fetch('/api/conciliacao/sincronizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf() },
      body: '{}',
    });
    const dados = await res.json();
    if (!res.ok || dados.success === false) throw new Error(dados.error || 'falha na sincronização');
    await carregarConciliacao();
  } catch (err) {
    if (corpo) corpo.innerHTML = `<p style="color: var(--red);">${escapeHTML(err.message)}</p>`;
  }
}

export async function confirmarCasados() {
  const ids = window.__conciliacaoCasados || [];
  if (!ids.length) return;
  try {
    const res = await fetch('/api/lancamentos/conferido-extrato-lote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf() },
      body: JSON.stringify({ ids, conferido: true }),
    });
    if (!res.ok) throw new Error('não foi possível confirmar');
    await carregarConciliacao();
  } catch (err) {
    console.error('[conciliacao] confirmar:', err);
  }
}

window.sincronizarBanco = sincronizarBanco;
window.confirmarCasados = confirmarCasados;
window.abrirModalConciliacao = abrirModalConciliacao;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', carregarConciliacao);
} else {
  carregarConciliacao();
}
