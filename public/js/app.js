// ==============================================================================
// ✅ public/js/app.js — JavaScript do Dashboard
// Extraído de index.ejs — sem alteração de lógica
//
// Variáveis do EJS são injetadas via data-* attributes no <body>:
// data-month, data-year, data-username
// ==============================================================================

// Lê variáveis injetadas pelo EJS via data-attributes
const currentMonth = parseInt(document.body.dataset.month, 10);
const currentYear = parseInt(document.body.dataset.year, 10);
const currentUserName = document.body.dataset.username;

// DECLARAÇÃO ÚNICA DE VARIÁVEIS GLOBAIS
let isBackNavigation = false;
let pessoaSelecionadaContexto = null;
let acaoConfirmadaCallback = null;
let idExcluir = null;
let isSubmitting = false;
window.resetSubmitting = () => {
  isSubmitting = false;
};

// ==============================================================================
// 🛡️ LIMPEZA ATIVA DE SERVICE WORKER EM DESENVOLVIMENTO LOCAL (Previne deadlocks)
// ==============================================================================
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((unregistered) => {
          if (unregistered) {
            console.warn('%c[PWA] 🗑️ Service Worker antigo desregistrado ativamente para evitar deadlocks de rede local.', 'color: #ef4444; font-weight: bold;');
          }
        });
      }
    });
  }
}

// ==============================================================================
// ✅ HELPERS DE SEGURANÇA
// ==============================================================================
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==============================================================================
// ✅ ATUALIZAÇÃO DOM SEM RELOAD (Soft Refresh)
// ==============================================================================
async function softRefresh(delayOverride) {
  const startTime = Date.now();
  // Delay inteligente para permitir que a sincronização dinâmica fire-and-forget
  // do POST complete antes do GET / ler os dados.
  const delayMs = delayOverride !== undefined ? delayOverride : 150;
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  // Criando controle de AbortController para timeout de 30.0 segundos (failsafe contra latência física de rede com Neon Postgres na nuvem)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('%c[SoftRefresh] ⚠️ Timeout de 30.0s atingido! Abortando requisição para forçar auto-recovery...', 'color: #f59e0b; font-weight: bold;');
    controller.abort();
  }, 30000);

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_t', Date.now());
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId); // Limpa o timeout assim que a requisição responder

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

    // Atualização da Grid de Terceiros na aba específica de Links Públicos (/terceiros)
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
      currentAnotacaoText = document.getElementById('anotacoesArea').value;
      if (typeof renderAnotacoesPreview === 'function') renderAnotacoesPreview();
    }
  } catch (err) {
    clearTimeout(timeoutId); // Garante a limpeza do timeout em caso de erro
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

// --- AÇÕES EM LOTE ---
async function executarAcaoEmLotePessoa(novoStatus) {
  fecharMenuContexto();
  try {
    const res = await fetch('/api/lancamentos/status-pessoa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pessoa: pessoaSelecionadaContexto,
        status: novoStatus,
        month: currentMonth,
        year: currentYear,
      }),
    });
    if (res.ok) await softRefresh();
    else mostrarAviso('Erro', 'Falha ao atualizar lote.');
  } catch (err) {
    console.error(err);
  }
}

function confirmarExclusaoPessoa() {
  if (checkBloqueioMesFechado()) {
    fecharMenuContexto();
    return;
  }
  fecharMenuContexto();
  registerModalOpen();
  const modal = document.getElementById('modalConfirmacaoAcao');
  document.getElementById('tituloConfirmacao').innerText = 'Excluir em Lote';
  document.getElementById('textoConfirmacao').innerText =
    `Deseja apagar permanentemente todas as contas de cartão de "${pessoaSelecionadaContexto}"?`;
  const btn = document.getElementById('btnConfirmarAcao');
  btn.style.backgroundColor = 'var(--red)';
  document.getElementById('iconConfirmacao').innerText = 'warning';
  document.getElementById('iconConfirmacao').style.color = 'var(--red)';

  acaoConfirmadaCallback = async () => {
    mostrarLoading();
    try {
      const res = await fetch(
        `/api/lancamentos/pessoa/${encodeURIComponent(pessoaSelecionadaContexto)}?month=${currentMonth}&year=${currentYear}`,
        { method: 'DELETE' }
      );
      if (res.status === 403) {
        ocultarLoading();
        const err = await res.json();
        mostrarAviso('Acesso Negado', err.error);
      } else {
        await softRefresh();
        fecharModais();
        ocultarLoading();
      }
    } catch (e) {
      ocultarLoading();
      mostrarAviso('Erro', 'Erro de rede.');
    }
  };
  modal.classList.add('active');
}

const btnConfirmarAcao = document.getElementById('btnConfirmarAcao');
if (btnConfirmarAcao) {
  btnConfirmarAcao.onclick = () => {
    if (acaoConfirmadaCallback) acaoConfirmadaCallback();
    fecharConfirmacaoAcao();
  };
}

// ==============================================================================

// ==============================================================================
// CORREÇÃO: Conversão de listas (Excel/WhatsApp) para vírgulas no Lote
// ==============================================================================
document.addEventListener('paste', function (e) {
  const target = e.target;
  if (target && target.tagName === 'INPUT' && target.getAttribute('oninput')?.includes('atualizarBulkCounterNative')) {
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');

    if (pasteData && pasteData.match(/\r?\n/)) {
      e.preventDefault();
      // Converte quebras de linha em vírgula + espaço
      const formatted = pasteData
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s !== '')
        .join(', ');
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      target.value = val.substring(0, start) + formatted + val.substring(end);
      target.selectionStart = target.selectionEnd = start + formatted.length;
      target.dispatchEvent(new Event('input'));
    } else {
      // Força a atualização do contador mesmo num paste normal (Ctrl+V rápido)
      setTimeout(() => target.dispatchEvent(new Event('input')), 50);
    }
  }
});
// ✅ CONTADOR DE LOTE NATIVO
// ==============================================================================
window.atualizarBulkCounterNative = function (input) {
  const counter = document.getElementById('bulkCounterNative');
  if (!counter) return;
  const str = input.value || '';
  if (str.includes(',')) {
    const qtd = str
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0).length;
    if (qtd > 1) {
      counter.style.display = 'block';
      counter.textContent = `🚀 ${qtd} contas serão lançadas em lote`;
    } else {
      counter.style.display = 'none';
    }
  } else {
    counter.style.display = 'none';
  }
};

// ==============================================================================
// ✅ MOVER MÊS (Individual e Lote)
// ==============================================================================
async function moverMes(e, ids, direcao) {
  if (e) e.stopPropagation(); // Evita marcar a linha no modal de últimas adições
  if (checkBloqueioMesFechado()) return; // A trava principal também barra no JS antes de bater na API
  mostrarLoading();
  try {
    const res = await fetch('/api/lancamentos/mover-mes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, direcao }),
    });
    const data = await res.json();
    if (res.status === 403) {
      ocultarLoading();
      mostrarAviso('Acesso Negado', data.error);
    } else if (res.ok) {
      await softRefresh();
      ocultarLoading();
    } else {
      ocultarLoading();
      mostrarAviso('Erro', data.error || 'Falha ao mover lançamentos.');
    }
  } catch (err) {
    ocultarLoading();
    console.error(err);
    mostrarAviso('Erro', 'Erro de rede ao mover contas.');
  }
}

function moverLoteUltimas(direcao) {
  fecharMenuContexto();
  const selectedRows = document.querySelectorAll('#listaUltimasConteudo tr.selected-row');
  const ids = Array.from(selectedRows).map((tr) => Number(tr.dataset.id));
  if (ids.length === 0) return;
  moverMes(null, ids, direcao);
}

// --- OUTRAS FUNÇÕES ---
async function abrirModalUltimas() {
  registerModalOpen();
  document.getElementById('modalUltimasContas').classList.add('active');

  const tbody = document.getElementById('listaUltimasConteudo');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Carregando...</td></tr>';

  try {
    const res = await fetch('/api/lancamentos/recentes');
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhum registro recente.</td></tr>';
      return;
    }

    let html = '';
    data.forEach((item) => {
      const quem = escapeHTML(item.nometerceiro || currentUserName);

      // ✅ Mantém "R$" + valor em uma única linha (usa NBSP do currency pt-BR)
      const valorCurrency = Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      const descText =
        escapeHTML(item.descricao) + (item.parcelaatual ? ` (${item.parcelaatual}/${item.totalparcelas})` : '');

      let badgeCmp = '';
      if (item.datavencimento) {
        const dtCmp = new Date(item.datavencimento);
        // Ajusta para o meio-dia evitando recuo de mês causado pelo fuso horário (ex: 00:00 UTC -> 21:00 GMT-3 no dia anterior)
        dtCmp.setHours(12);
        if (!isNaN(dtCmp.getTime())) {
          const mesesShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          const nomeMes = mesesShort[dtCmp.getMonth()];
          const anoCurto = String(dtCmp.getFullYear()).slice(-2);
          // Badge visual seguindo padrão do UI-UX Pro Max
          badgeCmp = `<span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.15); color: #60A5FA; white-space: nowrap; flex-shrink: 0;" title="Mês de Competência">${nomeMes}/${anoCurto}</span>`;
        }
      }

      // ✅ Nova Tag: Tipo de Conta (Fixa, Única, Parcelada)
      const tipoConta = getTipoExibicao(item);
      const badgeTipo = `<span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #473720; color: #fff; white-space: nowrap; flex-shrink: 0;" title="Tipo de Conta">${tipoConta}</span>`;

      const descHTML = `<div style="display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;"><span>${descText}</span>${badgeCmp}${badgeTipo}</div>`;

      const dt = item.datacriacao ? new Date(item.datacriacao) : null;
      const inseridoEm = dt
        ? `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
        : '--/--/----';

      // Segurança básica para strings dentro do onclick
      const safeDesc = escapeHTML(item.descricao || '').replace(/'/g, "\\'");
      const safePessoa = escapeHTML(item.nometerceiro || '').replace(/'/g, "\\'");

      const tipo = getTipoExibicao(item);
      const pAtual = item.parcelaatual || '';
      const pTotal = item.totalparcelas || '';

      // Para manter o padrão das outras telas, editarConta espera valor sem "R$"
      const valorSemMoeda = Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

      // Checkbox "conferido" — persistente no banco
      const isConferido = item.conferido === true;
      const classeConferido = isConferido ? ' conferido' : '';
      const classeUltima =
        item.parcelaatual && item.totalparcelas && item.parcelaatual === item.totalparcelas && item.totalparcelas > 1
          ? ' ultima-parcela'
          : '';
      const titleUltima = classeUltima ? ' data-tooltip="Última parcela ✅"' : '';

      html += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer;" class="${classeConferido}${classeUltima}" data-id="${item.id}" onclick="toggleRowSelection(event, this)">
                <td style="text-align:center;"><input type="checkbox" onchange="alternarConferido(this, ${item.id})" ${isConferido ? 'checked' : ''}></td>
                <td class="col-data">${inseridoEm}</td>
                <td style="font-weight:500; color:var(--blue);">${quem}</td>
                <td class="col-desc"${titleUltima}>${descHTML}</td>
                <td class="col-valor" style="text-align:right; font-weight:bold; white-space:nowrap;">${valorCurrency}</td>
                <td class="actions" style="text-align:center;">
                    <span class="material-icons" role="button" tabindex="0" style="font-size:18px; cursor:pointer;" onclick="moverMes(event, [${item.id}], -1)" data-tooltip="Mover para mês anterior" data-tooltip-dir="left">chevron_left</span>
                    <span class="material-icons" role="button" tabindex="0" style="font-size:18px; cursor:pointer;" onclick="moverMes(event, [${item.id}], 1)" data-tooltip="Mover para próximo mês" data-tooltip-dir="left">chevron_right</span>
                    <span class="material-icons" role="button" tabindex="0" style="font-size:18px; cursor:pointer;" onclick="editarConta(${item.id}, '${safeDesc}', '${valorSemMoeda}', '${getTipoExibicao(item)}', '${pAtual}', '${pTotal}', '${safePessoa}')" data-tooltip="Editar conta" data-tooltip-dir="left">edit</span>
                    <span class="material-icons" role="button" tabindex="0" style="font-size:18px; cursor:pointer;" onclick="confirmarExclusao(${item.id})" data-tooltip="Excluir conta" data-tooltip-dir="left">delete</span>
                </td>
            </tr>`;
    });

    tbody.innerHTML = html;

    // Adiciona evento de clique com botão direito no tbody do modal ÚLTIMAS
    tbody.oncontextmenu = (e) => abrirMenuContexto(e, 'ULTIMAS');

    atualizarTotalNaoConferido();
  } catch (err) {
    console.error(err);
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center; padding:20px; color: var(--red);">Erro ao carregar.</td></tr>';
  }
}

async function executarAcaoConferidoLote() {
  fecharMenuContexto();
  mostrarLoading();
  try {
    const res = await fetch('/api/lancamentos/conferido-recentes', { method: 'POST' });
    if (res.ok) {
      // Atualiza visualmente as linhas no modal aberto
      document.querySelectorAll('#listaUltimasConteudo tr').forEach((row) => {
        row.classList.add('conferido');
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = true;
      });
      atualizarTotalNaoConferido();
      ocultarLoading();
    } else {
      ocultarLoading();
      mostrarAviso('Erro', 'Falha ao atualizar lote.');
    }
  } catch (err) {
    ocultarLoading();
    console.error(err);
  }
}

// ==============================================================================
// ✅ TOGGLE MÊS FECHADO
// ==============================================================================
async function toggleMesFechado() {
  mostrarLoading();
  try {
    const res = await fetch('/api/meses-fechados/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: currentMonth, year: currentYear }),
    });
    ocultarLoading();
    if (res.ok) {
      await softRefresh();
    } else {
      mostrarAviso('Erro', 'Falha ao alterar status do mês.');
    }
  } catch (err) {
    ocultarLoading();
    mostrarAviso('Erro', 'Erro de conexão.');
  }
}

function confirmarExclusaoLoteUltimas() {
  fecharMenuContexto();
  const selectedRows = document.querySelectorAll('#listaUltimasConteudo tr.selected-row');
  const ids = Array.from(selectedRows).map((tr) => tr.dataset.id);

  if (ids.length === 0) return;

  registerModalOpen();
  const modal = document.getElementById('modalConfirmacaoAcao');
  document.getElementById('tituloConfirmacao').innerText = 'Excluir Selecionados';
  document.getElementById('textoConfirmacao').innerText =
    `Deseja apagar permanentemente os ${ids.length} itens selecionados?`;
  const btn = document.getElementById('btnConfirmarAcao');
  btn.style.backgroundColor = 'var(--red)';
  document.getElementById('iconConfirmacao').innerText = 'warning';
  document.getElementById('iconConfirmacao').style.color = 'var(--red)';

  acaoConfirmadaCallback = async () => {
    mostrarLoading();
    try {
      const res = await fetch('/api/lancamentos/lote', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.status === 403) {
        ocultarLoading();
        const err = await res.json();
        mostrarAviso('Acesso Negado', err.error);
      } else if (res.ok) {
        selectedRows.forEach((tr) => tr.remove());
        atualizarTotalNaoConferido();
        await softRefresh();
        ocultarLoading();
        mostrarAviso('Sucesso', `${ids.length} itens excluídos.`);
      } else {
        ocultarLoading();
        mostrarAviso('Erro', 'Falha ao excluir itens.');
      }
    } catch (err) {
      ocultarLoading();
      console.error(err);
      mostrarAviso('Erro', 'Erro de conexão.');
    }
  };
  modal.classList.add('active');
}

// ==============================================================================
// ✅ CONFERIDO TOGGLE (Últimas Adições)
// Marca/desmarca conta como "já somei" — persistente no banco.
// ==============================================================================
async function alternarConferido(checkbox, id) {
  const novoValor = checkbox.checked;
  const row = checkbox.closest('tr');

  try {
    const res = await fetch(`/api/lancamentos/${id}/conferido`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conferido: novoValor }),
    });
    if (!res.ok) {
      checkbox.checked = !novoValor;
      return;
    }
    // Alterna a classe visual na linha
    if (novoValor) {
      row.classList.add('conferido');
    } else {
      row.classList.remove('conferido');
    }
    atualizarTotalNaoConferido();
  } catch (err) {
    checkbox.checked = !novoValor;
    console.error(err);
  }
}

// ==============================================================================
// 💰 TOTALIZADOR — soma valores das contas NÃO conferidas
// ==============================================================================
function atualizarTotalNaoConferido() {
  const tbody = document.getElementById('listaUltimasConteudo');
  const span = document.getElementById('totalNaoConferido');
  if (!tbody || !span) return;

  let total = 0;
  tbody.querySelectorAll('tr:not(.conferido)').forEach((row) => {
    const celValor = row.querySelector('.col-valor');
    if (celValor) {
      // Remove "R$", pontos de milhar e troca vírgula por ponto
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

async function abrirModalCartaoPessoa(pessoa) {
  registerModalOpen();
  document.getElementById('modalDetalhesCartao').classList.add('active');
  document.getElementById('tituloModalCartao').innerText = `Cartão - ${pessoa}`;
  document.getElementById('totalModalCartao').innerText = '';
  const container = document.getElementById('listaCartaoPessoaConteudo');
  container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Carregando...</td></tr>';
  try {
    const res = await fetch(`/api/cartao/${encodeURIComponent(pessoa)}?month=${currentMonth}&year=${currentYear}`);
    const itens = await res.json();
    const total = itens.reduce((acc, item) => acc + Number(item.valor), 0);
    document.getElementById('totalModalCartao').innerText =
      'R$ ' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    if (itens.length === 0) {
      container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhum lançamento.</td></tr>';
      return;
    }
    let html = '';
    itens.forEach((item) => {
      const v = Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const safeDesc = escapeHTML(item.descricao).replace(/'/g, "\\'");
      const pAtual = item.parcelaatual || '';
      const pTotal = item.totalparcelas || '';
      const safePessoa = escapeHTML(item.nometerceiro || '').replace(/'/g, "\\'");
      let parcelasTexto =
        item.parcelaatual && item.totalparcelas
          ? `<small style="color:var(--text-secondary); margin-left:5px;">(${String(item.parcelaatual).padStart(2, '0')}/${String(item.totalparcelas).padStart(2, '0')})</small>`
          : '';
      const classePago = item.status === 'PAGO' ? ' linha-paga' : '';
      const classeUltima =
        item.parcelaatual && item.totalparcelas && item.parcelaatual === item.totalparcelas && item.totalparcelas > 1
          ? ' ultima-parcela'
          : '';
      const titleUltima = classeUltima ? ' data-tooltip="Última parcela ✅"' : '';
      html += `<tr class="draggable-row${classePago}${classeUltima}" draggable="true" data-id="${item.id}"><td width="20"><span class="material-icons drag-handle" style="font-size:16px;">drag_indicator</span></td><td width="30"><input type="checkbox" onchange="alternarStatus(this, ${item.id})" ${item.status === 'PAGO' ? 'checked' : ''}></td><td${titleUltima}>${escapeHTML(item.descricao)} ${parcelasTexto}</td><td class="text-right">R$ ${v}</td><td class="actions"><span class="material-icons" role="button" tabindex="0" style="font-size:18px;" onclick="moverMes(event, [${item.id}], -1)" data-tooltip="Mover para mês anterior" data-tooltip-dir="left">chevron_left</span><span class="material-icons" role="button" tabindex="0" style="font-size:18px;" onclick="moverMes(event, [${item.id}], 1)" data-tooltip="Mover para próximo mês" data-tooltip-dir="left">chevron_right</span><span class="material-icons" role="button" tabindex="0" style="font-size:18px;" onclick="editarConta(${item.id}, '${safeDesc}', '${v}', '${item.parcelaatual ? 'Parcelada' : 'Única'}', '${pAtual}', '${pTotal}', '${safePessoa}')" data-tooltip="Editar conta" data-tooltip-dir="left">edit</span><span class="material-icons" role="button" tabindex="0" style="font-size:18px;" onclick="confirmarExclusao(${item.id})" data-tooltip="Excluir conta" data-tooltip-dir="left">delete</span></td></tr>`;
    });
    container.innerHTML = html;
    initDragAndDrop();
    initTouchDragAndDrop();
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<tr><td colspan="5" style="text-align:center; color:var(--red);">Erro ao carregar detalhes.</td></tr>';
  }
}

async function abrirModalRendasDetalhes() {
  registerModalOpen();
  document.getElementById('modalRendasDetalhes').classList.add('active');
  const container = document.getElementById('listaRendasConteudo');
  try {
    const res = await fetch(`/api/rendas?month=${currentMonth}&year=${currentYear}`);
    const rendas = await res.json();
    let html = '';
    rendas.forEach((renda) => {
      const valorFormatado = Number(renda.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const safeDesc = escapeHTML(renda.descricao).replace(/'/g, "\\'");
      html += `<div class="list-item"><div class="desc">${escapeHTML(renda.descricao)}</div><div style="display:flex;gap:15px;"><div class="val">R$ ${valorFormatado}</div><div class="actions"><span class="material-icons" role="button" tabindex="0" onclick="editarRenda(${renda.id}, '${safeDesc}', '${valorFormatado}', '${renda.categoria}')" data-tooltip="Editar renda" data-tooltip-dir="left">edit</span><span class="material-icons" role="button" tabindex="0" onclick="confirmarExclusao(${renda.id})" data-tooltip="Excluir renda" data-tooltip-dir="left">delete</span></div></div></div>`;
    });
    container.innerHTML = html || 'Vazio';
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<div style="text-align:center; padding:20px; color: var(--red);">Erro ao carregar rendas.</div>';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initDragAndDrop();
  initCardDragAndDrop();
  initTouchCardDragAndDrop(); // ✅ DND Cards Mobile
  initDoubleTapMobile();
  initTouchDragAndDrop(); // ✅ DND Linhas Mobile

  if (document.getElementById('anotacoesArea')) {
    currentAnotacaoText = document.getElementById('anotacoesArea').value;
    renderAnotacoesPreview(); // Renderiza view inicial
  }
});

async function salvarFaturaManual(input) {
  let val = input.value;
  if (!val) val = '0';
  try {
    const res = await fetch('/api/fatura-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valor: val, month: currentMonth, year: currentYear }),
    });
    const data = await res.json();
    if (!res.ok) {
      mostrarAviso('Erro', data.error);
      return;
    }
    const num = parseFloat(val.replace('R$', '').replace(/\./g, '').replace(',', '.') || 0);
    input.value = num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    input.style.color = 'var(--green)';
    setTimeout(() => (input.style.color = 'var(--blue)'), 500);
  } catch (err) {
    console.error(err);
  }
}

// --- FUNÇÕES REFEITAS COM LOADING ---
async function executarCopia() {
  // Se o mês alvo for fechado, a API retorna 403.
  mostrarLoading();
  try {
    const res = await fetch('/api/lancamentos/copiar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: currentMonth, year: currentYear }),
    });
    ocultarLoading();

    if (res.status === 403) {
      const err = await res.json();
      mostrarAviso('Acesso Negado', err.error);
      return;
    } else if (res.ok) {
      mostrarAviso('Sucesso', 'Contas copiadas!');
      await softRefresh();
    } else {
      mostrarAviso('Erro', 'Falha ao copiar.');
    }
  } catch (err) {
    ocultarLoading();
    console.error(err);
    mostrarAviso('Erro', 'Erro de conexão.');
  }
}

async function executarDeleteMes() {
  if (checkBloqueioMesFechado()) return;
  mostrarLoading();
  try {
    const res = await fetch(`/api/lancamentos/mes?month=${currentMonth}&year=${currentYear}`, { method: 'DELETE' });
    ocultarLoading();
    if (res.status === 403) {
      const err = await res.json();
      mostrarAviso('Acesso Negado', err.error);
      return;
    } else if (res.ok) {
      mostrarAviso('Sucesso', 'Mês limpo!');
      await softRefresh();
    } else {
      mostrarAviso('Erro', 'Falha ao limpar o mês.');
    }
  } catch (err) {
    ocultarLoading();
    console.error(err);
    mostrarAviso('Erro', 'Erro de conexão.');
  }
}

// ==============================================================================
// ✅ STATUS TOGGLE SEM RELOAD
// Atualiza o checkbox no DOM e busca os totais frescos do servidor.
// ==============================================================================
async function alternarStatus(checkbox, id) {
  const novoStatus = checkbox.checked ? 'PAGO' : 'PENDENTE';
  const row = checkbox.closest('tr');
  try {
    const res = await fetch(`/api/lancamentos/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    });
    if (!res.ok) {
      // Reverte se falhou
      checkbox.checked = !checkbox.checked;
      return;
    }

    // Atualiza visual instantaneamente
    if (row) {
      if (checkbox.checked) row.classList.add('linha-paga');
      else row.classList.remove('linha-paga');
    }

    // Busca os totais atualizados do servidor e atualiza os cards
    await atualizarTotais();
  } catch (err) {
    // Reverte em caso de erro de rede
    checkbox.checked = !checkbox.checked;
    console.error(err);
  }
}

/**
 * Busca os 4 totais do dashboard via API e atualiza os cards no DOM.
 * Evita reload completo da página após toggle de status.
 */
async function atualizarTotais() {
  try {
    const res = await fetch(`/api/dashboard/totals?month=${currentMonth}&year=${currentYear}`);
    if (!res.ok) return;
    const totais = await res.json();

    const formatarMoeda = (n) => 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    const elRendas = document.getElementById('valorRendas');
    const elContas = document.getElementById('valorContas');
    const elFalta = document.getElementById('valorFaltaPagar');
    const elSaldo = document.getElementById('valorSaldo');
    const elContasCasa = document.getElementById('valorContasCasa');

    if (elRendas) elRendas.textContent = formatarMoeda(totais.totalrendas);
    if (elContas) elContas.textContent = formatarMoeda(totais.totalcontas);
    if (elFalta) elFalta.textContent = formatarMoeda(totais.faltapagar);
    if (elContasCasa) elContasCasa.textContent = formatarMoeda(totais.totalCasa);
    if (elSaldo) {
      elSaldo.textContent = formatarMoeda(totais.saldoprevisto);
      elSaldo.classList.remove('vermelho', 'verde');
      elSaldo.classList.add(Number(totais.saldoprevisto) < 0 ? 'vermelho' : 'verde');
    }

    // Atualiza totalizadores de painéis
    const elFixas = document.getElementById('totalPanelFixas');
    const elCartao = document.getElementById('totalPanelCartao');
    const elCartaoGeral = document.getElementById('totalPanelCartaoGeral');

    if (elFixas) elFixas.textContent = formatarMoeda(totais.fixasPendente);
    if (elCartao) elCartao.textContent = formatarMoeda(totais.cartaoPendente);
    if (elCartaoGeral) elCartaoGeral.textContent = formatarMoeda(totais.cartaoGeral);

    // Atualiza lista de terceiros e cartões
    if (totais.resumoPessoas) {
      totais.resumoPessoas.forEach((p) => {
        const spanResumo = document.getElementById('totalResumo_' + p.pessoa.replace(/\s/g, ''));
        if (spanResumo) spanResumo.textContent = formatarMoeda(p.total);
      });
    }

    if (totais.terceiros) {
      totais.terceiros.forEach((t) => {
        const baseId = t.nome.replace(/\s/g, '');
        const elTG = document.getElementById('totalTerceiroGeral_' + baseId);
        const elTC = document.getElementById('totalTerceiroCartao_' + baseId);
        const elTF = document.getElementById('totalTerceiroFixas_' + baseId);

        if (elTG) elTG.textContent = formatarMoeda(t.totalGeral);
        if (elTC) elTC.textContent = formatarMoeda(t.totalCartao);
        if (elTF) elTF.textContent = formatarMoeda(t.totalFixas);
      });
    }
  } catch (err) {
    console.error('Erro ao atualizar totais:', err);
  }
}

function fazerBackup() {
  window.location.href = '/api/backup';
}

async function enviarLancamento(e, tipoTransacao) {
  e.preventDefault();
  if (isSubmitting) {
    return;
  }
  isSubmitting = true;

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
  }

  try {
    const id = (tipoTransacao === 'RENDA' ? document.getElementById('rendaId') : document.getElementById('contaId'))
      .value;

    if (!id && checkBloqueioMesFechado()) {
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
      }
      return; // Apenas bloqueia POST (inserir), edição permite passar
    }

    const dados = {
      descricao: form.descricao.value,
      valor: form.valor.value,
      sub_tipo: form.sub_tipo ? form.sub_tipo.value : '',
      tipo_transacao: tipoTransacao,
      context_month: currentMonth,
      context_year: currentYear,
    };

    if (tipoTransacao !== 'RENDA') {
      if (dados.sub_tipo === 'Parcelada') dados.parcelas = form.parcelas.value;

      const rawTerceiro = form.nome_terceiro ? form.nome_terceiro.value : '';

      // Auto-upgrade para bulk se digitado com vírgula no input padrão (novo lançamento)
      if (!id && rawTerceiro.includes(',')) {
        const terceirosArr = rawTerceiro
          .split(',')
          .map((n) => n.trim())
          .filter((n) => n.length > 0);
        if (terceirosArr.length > 1) {
          dados.terceiros = terceirosArr;
          dados.bulk_mode = true;
        } else {
          dados.nome_terceiro = rawTerceiro;
        }
      } else {
        dados.nome_terceiro = rawTerceiro;
      }
    }

    let url = '/api/lancamentos';
    let method = 'POST';
    if (id) {
      url = `/api/lancamentos/${id}`;
      method = 'PUT';
    }
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (res.status === 403) {
      const err = await res.json();
      mostrarAviso('Acesso Negado', err.error);
    } else if (res.ok) {
      const responseData = await res.json().catch(() => ({}));
      if (responseData.criados) {
        await softRefresh(1200); // 1.2s de delay no lote para garantir término da sync fire-and-forget
        fecharModais();
        ocultarLoading();
        mostrarAviso('Sucesso', `${responseData.criados} contas lançadas com sucesso!`);
      } else {
        await softRefresh();
        fecharModais();
        ocultarLoading();
        mostrarAviso('Sucesso', 'Lançamento salvo com sucesso!');
      }
    } else {
      console.error('%c[EnviarLancamento] ❌ Falha na requisição:', 'color: #ef4444;', res.statusText);
    }
  } catch (err) {
    console.error('%c[EnviarLancamento] ❌ Exceção na submissão:', 'color: #ef4444;', err);
  } finally {
    isSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
    }
  }
}

// ==============================================================================
// ✅ ANOTAÇÕES E CHECKLISTS (Global, Markdown e UX de Salvamento)
// ==============================================================================
let isAnotacaoGlobal = true;
let isAnotacaoEditMode = false;
let currentAnotacaoText = '';
let timeoutAnotacao = null;

async function carregarAnotacoes() {
  const m = isAnotacaoGlobal ? 0 : currentMonth;
  const y = isAnotacaoGlobal ? 0 : currentYear;

  try {
    const res = await fetch(`/api/anotacoes?month=${m}&year=${y}`);
    const data = await res.json();
    currentAnotacaoText = data.conteudo || '';
    const area = document.getElementById('anotacoesArea');
    if (area) area.value = currentAnotacaoText;
    renderAnotacoesPreview();
  } catch (err) {
    console.error('Erro ao carregar anotações', err);
  }
}

function alternarAbaAnotacao(global) {
  isAnotacaoGlobal = global;
  document.getElementById('btnAnotacaoMensal').classList.toggle('active', !global);
  document.getElementById('btnAnotacaoGlobal').classList.toggle('active', global);
  carregarAnotacoes();
}

function alternarModoAnotacao() {
  isAnotacaoEditMode = !isAnotacaoEditMode;
  const area = document.getElementById('anotacoesArea');
  const preview = document.getElementById('anotacoesPreview');
  const toolbar = document.getElementById('anotacoesToolbar');
  const btn = document.getElementById('btnAnotacaoModo');

  if (isAnotacaoEditMode) {
    area.style.display = 'block';
    toolbar.style.display = 'flex';
    preview.style.display = 'none';
    btn.innerHTML = '<span class="material-icons" style="font-size:16px;">visibility</span>';
    btn.title = 'Modo Leitura';
    area.focus();
  } else {
    area.style.display = 'none';
    toolbar.style.display = 'none';
    preview.style.display = 'block';
    btn.innerHTML = '<span class="material-icons" style="font-size:16px;">edit</span>';
    btn.title = 'Modo Edição';
    renderAnotacoesPreview();
  }
}

function renderAnotacoesPreview() {
  const preview = document.getElementById('anotacoesPreview');
  if (!preview) return;

  if (!currentAnotacaoText.trim()) {
    preview.innerHTML =
      '<div style="color: var(--text-secondary); font-style: italic; text-align: center; padding: 20px;">Nenhuma anotação. Clique em editar para começar.</div>';
    return;
  }

  const lines = currentAnotacaoText.split('\n');
  let html = '';

  lines.forEach((line, index) => {
    let parsed = line
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Auto-linkify URLs (abrir em nova guia)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    parsed = parsed.replace(urlRegex, function (url) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--blue); text-decoration: underline;">${url}</a>`;
    });

    if (parsed.trim().startsWith('- [ ]')) {
      const text = parsed.replace('- [ ]', '').trim();
      html += `<div class="checklist-item"><input type="checkbox" onchange="toggleChecklist(${index}, true)"> <span>${text}</span></div>`;
    } else if (parsed.trim().startsWith('- [x]')) {
      const text = parsed.replace('- [x]', '').trim();
      html += `<div class="checklist-item"><input type="checkbox" checked onchange="toggleChecklist(${index}, false)"> <span style="text-decoration: line-through; opacity: 0.6">${text}</span></div>`;
    } else {
      html += `<div style="min-height: 20px;">${parsed}</div>`;
    }
  });

  preview.innerHTML = html;
}

function toggleChecklist(index, isChecked) {
  const lines = currentAnotacaoText.split('\n');
  if (isChecked) {
    lines[index] = lines[index].replace('- [ ]', '- [x]');
  } else {
    lines[index] = lines[index].replace('- [x]', '- [ ]');
  }
  currentAnotacaoText = lines.join('\n');
  document.getElementById('anotacoesArea').value = currentAnotacaoText;
  renderAnotacoesPreview();
  salvarAnotacao();
}

function inserirFormatacao(prefix, suffix) {
  const area = document.getElementById('anotacoesArea');
  const start = area.selectionStart;
  const end = area.selectionEnd;
  const text = area.value;
  const selectedText = text.substring(start, end);

  const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
  area.value = newText;
  currentAnotacaoText = newText;

  area.focus();
  area.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);

  salvarAnotacao();
}

function salvarAnotacao() {
  const area = document.getElementById('anotacoesArea');
  if (!area) return;

  currentAnotacaoText = area.value;
  const m = isAnotacaoGlobal ? 0 : currentMonth;
  const y = isAnotacaoGlobal ? 0 : currentYear;

  const statusIcon = document.getElementById('statusSaveIcon');

  if (statusIcon) {
    statusIcon.innerText = 'cloud_upload';
    statusIcon.style.color = 'var(--text-secondary)';
    statusIcon.style.opacity = '0.7';
  }

  clearTimeout(timeoutAnotacao);
  timeoutAnotacao = setTimeout(async () => {
    try {
      await fetch('/api/anotacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo: currentAnotacaoText, month: m, year: y }),
      });
      if (statusIcon) {
        statusIcon.innerText = 'cloud_done';
        statusIcon.style.color = 'var(--green)';
        statusIcon.style.opacity = '1';
      }
    } catch (err) {
      console.error(err);
      if (statusIcon) {
        statusIcon.innerText = 'cloud_off';
        statusIcon.style.color = 'var(--red)';
      }
    }
  }, 800);
}

// --- FUNÇÃO DELETAR SINGLE REFEITA COM LOADING ---
function confirmarExclusao(id) {
  registerModalOpen();
  idExcluir = id;
  document.getElementById('modalConfirmar').classList.add('active');
}
document.getElementById('btnConfirmarExclusao').onclick = async () => {
  mostrarLoading();
  try {
    const res = await fetch(`/api/lancamentos/${idExcluir}`, { method: 'DELETE' });
    if (res.status === 403) {
      ocultarLoading();
      const err = await res.json();
      mostrarAviso('Acesso Negado', err.error);
    } else {
      await softRefresh();
      fecharModais();
      ocultarLoading();
    }
  } catch (e) {
    ocultarLoading();
  }
};

// ==============================================================================
// ✅ CONFIGURAÇÕES DO USUÁRIO
// ==============================================================================
async function salvarConfiguracoes() {
  const inputMinimo = document.getElementById('configDivisaoMinimo');
  if (!inputMinimo) return;

  const valorRaw = inputMinimo.value;
  // Converte "R$ 1.234,56" para 1234.56
  const valorNumerico = parseFloat(valorRaw.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());

  if (isNaN(valorNumerico)) {
    if (typeof mostrarAviso === 'function') mostrarAviso('Erro', 'Valor inválido.');
    return;
  }

  if (typeof mostrarLoading === 'function') mostrarLoading();
  try {
    const res = await fetch('/api/configuracoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave: 'divisao_casa_minimo', valor: valorNumerico }),
    });
    if (typeof ocultarLoading === 'function') ocultarLoading();
    if (res.ok) {
      await softRefresh();
      fecharModais();
    } else if (typeof mostrarAviso === 'function') mostrarAviso('Erro', 'Falha ao salvar configuração.');
  } catch (err) {
    if (typeof ocultarLoading === 'function') ocultarLoading();
    if (typeof mostrarAviso === 'function') mostrarAviso('Erro', 'Erro de conexão.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const formConfig = document.getElementById('formConfig');
  if (formConfig) {
    formConfig.addEventListener('submit', (e) => {
      e.preventDefault();
      salvarConfiguracoes();
    });
  }

  // Novo Listener para Regras de Sync
  const formRegraSync = document.getElementById('formRegraSync');
  if (formRegraSync) {
    formRegraSync.addEventListener('submit', (e) => {
      e.preventDefault();
      salvarRegraSync();
    });
  }

  // AUTO-TRIGGER WIZARD (Wave 4)
  const onboardingCompleted = document.body.dataset.onboardingCompleted === 'true';
  if (!onboardingCompleted && typeof abrirModalWizard === 'function') {
    // Delay curto para garantir que tudo carregou
    setTimeout(abrirModalWizard, 800);
  }
});

// ==============================================================================
// ✅ FINALIZAÇÃO DO WIZARD (Wave 4)
// ==============================================================================

async function finalizarWizard() {
  const partnerName = document.getElementById('wizardPartnerName').value.trim();
  const partnerID = parseInt(document.getElementById('wizardPartnerID').value) || null;
  const enableCasa = document.getElementById('wizardEnableCasa').checked;

  if (!partnerName) {
    mostrarAviso('Erro', 'O nome do parceiro é obrigatório para configurar a sincronização.');
    return;
  }

  mostrarLoading();
  try {
    const novasRegras = [];

    if (enableCasa) {
      novasRegras.push({
        tipo: 'DIVISAO_CASA',
        terceiroOrigem: 'Casa',
        usuarioDestino: partnerID || 2, // Fallback p/ 2 se vazio (comum em testes)
        valorMinimo: 750,
        terceiroEspelhoNoOrigem: partnerName,
        ativo: true
      });
    }

    // 1. Salva as regras (se houver)
    if (novasRegras.length > 0) {
      await fetch('/api/configuracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'regras_sync', valor: novasRegras }),
      });
    }

    await concluirOnboarding();
    document.body.dataset.regrasSync = JSON.stringify(novasRegras);

    if (typeof fecharModalWizard === 'function') fecharModalWizard();
    ocultarLoading();

    mostrarAviso('Tudo Pronto!', `Configuração concluída. Bem-vindo, ${document.body.dataset.username}!`);
    if (typeof softRefresh === 'function') await softRefresh();

  } catch (err) {
    ocultarLoading();
    mostrarAviso('Erro', 'Houve um problema ao salvar sua configuração inicial.');
  }
}

async function finalizarWizardSozinho() {
  mostrarLoading();
  try {
    await concluirOnboarding();
    if (typeof fecharModalWizard === 'function') fecharModalWizard();
    ocultarLoading();
    mostrarAviso('Bem-vindo!', `Configuração concluída. Você pode gerenciar sincronizações mais tarde nas configurações.`);
  } catch (err) {
    ocultarLoading();
    mostrarAviso('Erro', 'Falha ao finalizar configuração.');
  }
}

async function concluirOnboarding() {
  // Marca onboarding como concluído no banco
  await fetch('/api/configuracoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chave: 'onboarding_completed', valor: true }),
  });
  document.body.dataset.onboardingCompleted = 'true';
}

// ==============================================================================
// ✅ GERENCIAMENTO DE REGRAS DE SINCRONIZAÇÃO (SaaS)
// ==============================================================================

function getRegrasSync() {
  try {
    return JSON.parse(document.body.dataset.regrasSync || '[]');
  } catch (e) {
    return [];
  }
}

function renderizarRegrasSync() {
  const lista = document.getElementById('listaRegrasSync');
  if (!lista) return;

  const regras = getRegrasSync();

  if (regras.length === 0) {
    lista.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        Nenhuma regra configurada. Comece criando uma nova!
                       </div>`;
    return;
  }

  let html = '';
  regras.forEach((regra, index) => {
    const statusClass = regra.ativo !== false ? 'badge-sync-active' : 'badge-sync-inactive';
    const statusText = regra.ativo !== false ? 'Ativa' : 'Inativa';
    const desc = regra.tipo === 'COPIA_TOTAL' 
      ? `Copia <b>${regra.terceiroOrigem}</b> p/ Usuário <b>${regra.usuarioDestino}</b>`
      : `Divide <b>${regra.terceiroOrigem}</b> p/ Usuário <b>${regra.usuarioDestino}</b> (Min: R$ ${regra.valorMinimo || 0})`;

    html += `
      <div class="sync-rule-item">
        <div class="sync-rule-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="badge-sync ${statusClass}">${statusText}</span>
            <span style="font-size: 0.7rem; color: var(--primary); font-weight: bold;">${regra.tipo}</span>
          </div>
          <h4>${desc}</h4>
        </div>
        <div class="sync-rule-actions">
          <button class="btn-icon-small" onclick="editarRegraSync(${index})" title="Editar"><span class="material-icons" style="font-size: 18px;">edit</span></button>
          <button class="btn-icon-small danger" onclick="confirmarDeletarRegraSync(${index})" title="Excluir"><span class="material-icons" style="font-size: 18px;">delete</span></button>
        </div>
      </div>
    `;
  });

  lista.innerHTML = html;
}

function abrirFormNovaRegra() {
  if (typeof abrirModalRegraSync === 'function') abrirModalRegraSync(-1);
}

function editarRegraSync(index) {
  const regras = getRegrasSync();
  if (regras[index]) {
    if (typeof abrirModalRegraSync === 'function') abrirModalRegraSync(index, regras[index]);
  }
}

async function salvarRegraSync() {
  const index = parseInt(document.getElementById('syncRuleIndex').value);
  const tipo = document.getElementById('syncType').value;
  const regras = getRegrasSync();

  const novaRegra = {
    tipo: tipo,
    terceiroOrigem: document.getElementById('syncTerceiroOrigem').value,
    usuarioDestino: parseInt(document.getElementById('syncUsuarioDestino').value),
    ativo: document.getElementById('syncAtivo').checked
  };

  if (tipo === 'COPIA_TOTAL') {
    novaRegra.contaDestino = document.getElementById('syncContaDestino').value;
  } else if (tipo === 'DIVISAO_CASA') {
    novaRegra.valorMinimo = parseFloat(document.getElementById('syncValorMinimo').value) || 0;
    novaRegra.terceiroEspelhoNoOrigem = document.getElementById('syncTerceiroEspelho').value;
  }

  if (index === -1) {
    regras.push(novaRegra);
  } else {
    regras[index] = novaRegra;
  }

  await persistirRegrasSync(regras);
}

function confirmarDeletarRegraSync(index) {
  if (confirm('Deseja realmente excluir esta regra de sincronização?')) {
    deletarRegraSync(index);
  }
}

async function deletarRegraSync(index) {
  const regras = getRegrasSync();
  regras.splice(index, 1);
  await persistirRegrasSync(regras);
}

async function persistirRegrasSync(regras) {
  mostrarLoading();
  try {
    const res = await fetch('/api/configuracoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave: 'regras_sync', valor: regras }),
    });

    if (res.ok) {
      document.body.dataset.regrasSync = JSON.stringify(regras);
      renderizarRegrasSync();
      if (typeof fecharModalRegraSync === 'function') fecharModalRegraSync();
      ocultarLoading();
      mostrarAviso('Sucesso', 'Regras de sincronização atualizadas!');
    } else {
      throw new Error('Erro ao salvar');
    }
  } catch (err) {
    ocultarLoading();
    mostrarAviso('Erro', 'Falha ao salvar as regras no banco.');
  }
}
