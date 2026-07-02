// ==============================================================================
// ✅ DASHBOARD — Soft refresh, totalizadores, backup
// ==============================================================================

import { escapeHTML, softRefreshCache, SOFT_REFRESH_TTL } from './shared.js';

// Abort controller global para cancelar soft refresh pendente
let _currentAbortController = null;

// Variáveis de contexto (injetadas via window)
export function getCurrentMonth() {
  return parseInt(document.body.dataset.month, 10);
}

export function getCurrentYear() {
  return parseInt(document.body.dataset.year, 10);
}

// =============================================================================
// ✅ updateDashboardFromJSON — Atualiza dashboard via API JSON parcial
// =============================================================================
export function updateDashboardFromJSON(data) {
  const { totais, lancamentosFixaECartao, resumoPessoas, dadosTerceiros, auxQueries, terceirosDistinct } = data;

  console.log('[DEBUG] updateDashboardFromJSON chamado com:', data);

  // 1. Atualiza cards de totais
  if (totais) {
    const rendaEl = document.getElementById('valorRendas');
    const gastoEl = document.getElementById('valorContas');
    const saldoEl = document.getElementById('totalPanelFixas') || document.getElementById('totalPanelCartao');
    console.log('[DEBUG] Totais recebidos:', totais);
    console.log('[DEBUG] Elementos encontrados:', { rendaEl, gastoEl, saldoEl });
    if (rendaEl) rendaEl.textContent = `R$ ${(totais.totalrendas || 0).toFixed(2)}`;
    if (gastoEl) gastoEl.textContent = `R$ ${(totais.totalcontas || 0).toFixed(2)}`;
    if (saldoEl && !saldoEl.id.includes('Cartao')) saldoEl.textContent = `R$ ${(totais.faltapagar || 0).toFixed(2)}`;
  }

  // 2. Detecta mudança em terceiros e força reload se necessário
  // NOTA: removido para evitar reload duplo com ui.js

  // 2. Atualiza lista de últimas contas
  if (lancamentosFixaECartao && lancamentosFixaECartao.rows) {
    const tbody = document.getElementById('listaUltimasConteudo');
    console.log('[DEBUG] tbody encontrado:', tbody);
    console.log('[DEBUG] Rows recebidas:', lancamentosFixaECartao.rows.length);
    if (tbody) {
      tbody.innerHTML = '';
      lancamentosFixaECartao.rows.slice(0, 20).forEach(l => {
        const tr = document.createElement('tr');
        const statusClass = l.Status === 'CONFERIDO' ? 'success' : l.Status === 'PAGO' ? 'info' : 'warning';
        tr.innerHTML = `
          <td>${escapeHTML(l.Descricao || '')}</td>
          <td>R$ ${(l.Valor || 0).toFixed(2)}</td>
          <td><span class="badge badge-${statusClass}">${escapeHTML(l.Status || 'PENDENTE')}</span></td>
        `;
        tbody.appendChild(tr);
      });
      console.log(`[DEBUG] ${lancamentosFixaECartao.rows.length} rows renderizadas no tbody`);
    } else {
      console.warn('[DEBUG] ⚠️ tbody #listaUltimasConteudo NÃO ENCONTRADO!');
    }
  } else {
    console.warn('[DEBUG] ⚠️ lancamentosFixaECartao.rows não encontrado ou vazio');
  }

  console.log('[updateDashboardFromJSON] Dashboard atualizado via JSON parcial');
}

export function extractHTML() {
  return {
    header: document.querySelector('header')?.innerHTML,
    dashboardCards: document.querySelector('.dashboard-cards')?.innerHTML,
    mainGrid: document.querySelector('.main-grid')?.innerHTML,
    mobileSidebar: document.querySelector('#mobileSidebar')?.innerHTML,
    terceirosGrid: document.querySelector('.terceiros-grid')?.innerHTML,
  };
}

function applyCachedHTML(cached) {
  const replaceHTML = (selector, key) => {
    const current = document.querySelector(selector);
    if (current && cached[key]) {
      current.innerHTML = cached[key];
    }
  };
  replaceHTML('header', 'header');
  replaceHTML('.dashboard-cards', 'dashboardCards');
  replaceHTML('.main-grid', 'mainGrid');
  replaceHTML('#mobileSidebar', 'mobileSidebar');

  const currentTerceiros = document.querySelector('.terceiros-grid');
  if (currentTerceiros && cached.terceirosGrid) {
    currentTerceiros.innerHTML = cached.terceirosGrid;
  }
}

export async function softRefresh(delayOverride, useCache = true) {
  console.log('[DEBUG] softRefresh chamado');

  // ✅ SoftRefresh via API JSON parcial — ~200ms vs ~1800ms do fetch HTML
  const params = new URLSearchParams(window.location.search);
  const month = params.get('month') || new Date().getMonth() + 1;
  const year = params.get('year') || new Date().getFullYear();

  console.log(`[DEBUG] Mês/Ano: ${month}/${year}`);

  const startTime = Date.now();
  try {
    const url = `/api/dashboard/resumo?month=${month}&year=${year}`;
    console.log(`[DEBUG] Fetching: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Fallback para fetch HTML`);

    const json = await res.json();
    console.log('[DEBUG] JSON recebido:', json);
    if (!json.success || !json.data) throw new Error('Resposta inválida');

    // Atualiza dashboard via funções específicas (mais rápido que parse DOM)
    updateDashboardFromJSON(json.data);

    const elapsed = Date.now() - startTime;
    console.log(`%c[SoftRefresh] ✅ JSON parcial em ${elapsed}ms`, 'color: #10b981;');
    return;
  } catch (err) {
    console.warn(`[SoftRefresh] ⚠️ Fallback para fetch HTML: ${err.message}`);
  }

  // Fallback: fetch HTML completo (código original preservado abaixo)

  // Cancela soft refresh anterior se ainda estiver rodando
  if (_currentAbortController) {
    _currentAbortController.abort();
  }
  _currentAbortController = new AbortController();

  const controller = _currentAbortController;
  const timeoutId = setTimeout(() => {
    console.warn('%c[SoftRefresh] ⚠️ Timeout de 30.0s atingido!', 'color: #f59e0b; font-weight: bold;');
    controller.abort();
  }, 30000);

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_t', Date.now());
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch`);
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');

    const replaceHTML = (selector) => {
      const current = document.querySelector(selector);
      const updated = doc.querySelector(selector);
      if (current && updated) {
        current.innerHTML = updated.innerHTML;
      }
    };

    replaceHTML('header');
    replaceHTML('.dashboard-cards');
    replaceHTML('.main-grid');
    replaceHTML('#mobileSidebar');

    const currentTerceiros = document.querySelector('.terceiros-grid');
    const newTerceiros = doc.querySelector('.terceiros-grid');

    if (currentTerceiros && newTerceiros) {
      currentTerceiros.innerHTML = newTerceiros.innerHTML;
    } else if (!currentTerceiros && newTerceiros) {
      const mainGrid = document.querySelector('.main-grid');
      if (mainGrid) {
        mainGrid.insertAdjacentHTML(
          'afterend',
          '<div id="terceirosHeader" style="margin: 30px 0 15px 0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;"><h2 style="color: var(--text-secondary); font-size: 1.1rem; margin-bottom: 20px;">Painéis de Terceiros</h2></div><div class="terceiros-grid drag-container-cards">' +
            newTerceiros.innerHTML +
            '</div>'
        );
      }
    } else if (currentTerceiros && !newTerceiros) {
      const header = currentTerceiros.previousElementSibling;
      if (header && header.tagName === 'DIV') header.remove();
      currentTerceiros.remove();
    }

    const currentTerceirosDash = document.querySelector('.terceiros-dash-grid');
    const newTerceirosDash = doc.querySelector('.terceiros-dash-grid');
    if (currentTerceirosDash && newTerceirosDash) {
      currentTerceirosDash.innerHTML = newTerceirosDash.innerHTML;
    }

    document.body.dataset.mesFechado = doc.body.dataset.mesFechado;

    if (typeof window.initDragAndDrop === 'function') {
      window.__rowDndInicializado = false;
      window.initDragAndDrop();
    }
    if (typeof window.initCardDragAndDrop === 'function') {
      window.__cardDndInicializado = false;
      window.initCardDragAndDrop();
    }
    if (typeof window.initTouchCardDragAndDrop === 'function') {
      window.__touchCardDndInicializado = false;
      window.initTouchCardDragAndDrop();
    }
    if (typeof window.initDoubleTapMobile === 'function') window.initDoubleTapMobile();
    if (typeof window.initTouchDragAndDrop === 'function') {
      window.__touchDndInicializado = false;
      window.initTouchDragAndDrop();
    }

    if (document.getElementById('anotacoesArea')) {
      const anotacoesArea = document.getElementById('anotacoesArea');
      anotacoesArea.value = anotacoesArea.value; // mantém valor
      if (typeof window.renderAnotacoesPreview === 'function') window.renderAnotacoesPreview();
    }

    softRefreshCache.set(cacheKey, { html: extractHTML(), timestamp: Date.now() });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return; // Não loga erro nem faz nada — foi cancelado intencionalmente
    }
    console.error('%c[SoftRefresh] ❌ Falha no Soft Refresh:', 'color: #ef4444; font-weight: bold;', err);
    localStorage.setItem('last_soft_refresh_error', err.stack || err.toString());

    // NÃO recarrega a página — se soft refresh falhar, reload causaria loop infinito
    console.warn('[SoftRefresh] Mantendo página sem reload após erro.');
  }
}

export async function softRefreshSafe(delayOverride, useCache = true) {
  const delayMs = delayOverride !== undefined ? delayOverride : 800;
  await new Promise(r => setTimeout(r, delayMs));
  try {
    await softRefresh(undefined, useCache);
  } catch (err) {
    console.error('[SoftRefreshSafe] Falha:', err);
  }
}

export function atualizarTotalNaoConferido() {
  const tbody = document.getElementById('listaUltimasConteudo');
  const span = document.getElementById('totalNaoConferido');
  if (!tbody || !span) return;

  let total = 0;
  tbody.querySelectorAll('tr:not(.conferido)').forEach((row) => {
    const celValor = row.querySelector('.col-valor');
    if (celValor) {
      const txt = celValor.textContent
        .replace(/R\$\s?/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
      const num = parseFloat(txt);
      if (!isNaN(num)) total += num;
    }
  });

  if (total > 0) {
    span.textContent = 'Falta: ' + total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } else {
    span.textContent = '';
  }
}

export function fazerBackup() {
  window.location.href = '/api/backup';
}

// =============================================================================
// ✅ refreshOnInsert — Atualiza dashboard após inserção de lançamento
// =============================================================================
export async function refreshOnInsert() {
  // Limpa cache e força reload completo para garantir consistência
  softRefreshCache.clear();
  setTimeout(() => location.reload(), 50);
}

// =============================================================================
// ✅ refreshOnDelete — Atualiza dashboard após exclusão de lançamento
// =============================================================================
export async function refreshOnDelete() {
  // Limpa cache e força reload completo para garantir consistência
  softRefreshCache.clear();
  setTimeout(() => location.reload(), 200);
}
