// ==============================================================================
// ✅ DASHBOARD — Soft refresh, totalizadores, backup
// ==============================================================================

import { escapeHTML, softRefreshCache, SOFT_REFRESH_TTL } from './shared.js';

// Variáveis de contexto (injetadas via window)
export function getCurrentMonth() {
  return parseInt(document.body.dataset.month, 10);
}

export function getCurrentYear() {
  return parseInt(document.body.dataset.year, 10);
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
  const cacheKey = `${window.location.pathname}?${new URLSearchParams(window.location.search).toString()}`;

  if (useCache) {
    const cached = softRefreshCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SOFT_REFRESH_TTL) {
      console.log('[SoftRefresh] ♻️ Usando cache (30s TTL)');
      applyCachedHTML(cached.html);
      return;
    }
  }

  const startTime = Date.now();
  const controller = new AbortController();
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
          '<div id="terceirosHeader" style="margin: 30px 0 15px 0; border-top: 1px solid rgba(255,255,0.1); padding-top: 20px;"><h2 style="color: var(--text-secondary); font-size: 1.1rem; margin-bottom: 20px;">Painéis de Terceiros</h2></div><div class="terceiros-grid drag-container-cards">' +
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

    if (typeof initDragAndDrop === 'function') initDragAndDrop();
    if (typeof initCardDragAndDrop === 'function') initCardDragAndDrop();
    if (typeof initTouchCardDragAndDrop === 'function') {
      window.__touchCardDndInicializado = false;
      initTouchCardDragAndDrop();
    }
    if (typeof initDoubleTapMobile === 'function') initDoubleTapMobile();
    if (typeof initTouchDragAndDrop === 'function') {
      window.__touchDndInicializado = false;
      initTouchDragAndDrop();
    }

    if (document.getElementById('anotacoesArea')) {
      const anotacoesArea = document.getElementById('anotacoesArea');
      anotacoesArea.value = anotacoesArea.value; // mantém valor
      if (typeof window.renderAnotacoesPreview === 'function') window.renderAnotacoesPreview();
    }

    softRefreshCache.set(cacheKey, { html: extractHTML(), timestamp: Date.now() });
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('%c[SoftRefresh] ❌ Falha catastrófica no Soft Refresh:', 'color: #ef4444; font-weight: bold;', err);
    localStorage.setItem('last_soft_refresh_error', err.stack || err.toString());

    if (err.name === 'AbortError') {
      console.warn('[SoftRefresh] Recarregando página devido a Timeout/Abort de rede.');
      window.location.reload();
    } else {
      console.error('[SoftRefresh] Mantendo a página sem reload para diagnóstico de erro de execução.');
      alert('Erro no SoftRefresh: ' + err.message + '\nPor favor, copie o erro do console F12!');
    }
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
