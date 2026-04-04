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

// --- SISTEMA DE CONTROLE DE MODAL E HISTÓRICO ---
function registerModalOpen() {
  document.body.classList.add('no-scroll');
  history.pushState({ modal: true }, '', '');
}
function handleModalClose() {
  document.body.classList.remove('no-scroll');
  if (!isBackNavigation && history.state && history.state.modal) {
    history.back();
  }
}

window.addEventListener('popstate', () => {
  const activeModal = document.querySelector('.modal-overlay.active');
  if (activeModal) {
    isBackNavigation = true;
    if (activeModal.id === 'modalConfirmar') fecharConfirmacao();
    else if (activeModal.id === 'modalAviso') fecharModalAviso();
    else if (activeModal.id === 'modalConfirmacaoAcao') fecharConfirmacaoAcao();
    else if (activeModal.id === 'modalCalcularLuz') fecharModalCalcularLuz();
    else fecharModais();
    isBackNavigation = false;
  }
  fecharMenuContexto();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const activeModal = document.querySelector('.modal-overlay.active');
    if (activeModal) {
      if (activeModal.id === 'modalConfirmar') fecharConfirmacao();
      else if (activeModal.id === 'modalAviso') fecharModalAviso();
      else if (activeModal.id === 'modalConfirmacaoAcao') fecharConfirmacaoAcao();
      else if (activeModal.id === 'modalCalcularLuz') fecharModalCalcularLuz();
      else fecharModais();
    }
    fecharMenuContexto();
  }
});

// --- VERIFICAÇÃO DE MÊS FECHADO ---
function isMesFechado() {
  return document.body.dataset.mesFechado === 'true';
}

function checkBloqueioMesFechado() {
  if (isMesFechado()) {
    mostrarAviso('Mês Fechado', 'Este mês está fechado. Reabra-o no menu lateral para adicionar ou remover contas.');
    return true;
  }
  return false;
}

// --- FUNÇÕES DO NOVO MODAL DE LOADING ---
function mostrarLoading() {
  document.getElementById('modalLoading').classList.add('active');
}
function ocultarLoading() {
  document.getElementById('modalLoading').classList.remove('active');
}

// ==============================================================================
// ✅ SIDEBAR MOBILE (HAMBURGER MENU)
// ==============================================================================
const mobileSidebar = document.getElementById('mobileSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function abrirSidebar() {
  if (!mobileSidebar || !sidebarOverlay) return;
  mobileSidebar.classList.add('open');
  sidebarOverlay.classList.add('open');
  document.body.classList.add('no-scroll');
  // Se houver overlay de modal ou contexto, a sidebar ficará por cima (z-index 999)
}

function fecharSidebar() {
  if (!mobileSidebar || !sidebarOverlay) return;
  mobileSidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
  document.body.classList.remove('no-scroll');
}

/**
 * Fecha a Sidebar e em seguida dispara a função principal de modal.
 * Usado nos botões de dentro da sidebar.
 */
function fecharSidebarE(callback) {
  fecharSidebar();
  setTimeout(() => {
    if (typeof callback === 'function') callback();
  }, 300); // Aguarda o CSS transition
}

// ==============================================================================
// ✅ TOOLTIP CUSTOMIZADO (Substitui tooltip nativo do browser)
// ==============================================================================
const customTooltip = document.getElementById('customTooltip');

function showCustomTooltip(element, text) {
  if (!customTooltip) return;

  const rect = element.getBoundingClientRect();
  customTooltip.textContent = text;
  customTooltip.style.display = 'block';
  customTooltip.style.left = `${rect.left + rect.width / 2 - customTooltip.offsetWidth / 2}px`;
  customTooltip.style.top = `${rect.top - customTooltip.offsetHeight - 8}px`;
}

function hideCustomTooltip() {
  if (!customTooltip) return;
  customTooltip.style.display = 'none';
}

// ==============================================================================
// ✅ FUNÇÕES DO MODAL CALCULAR LUZ (IFRAME)
// ==============================================================================

function abrirModalCalcularLuz() {
  registerModalOpen();
  document.getElementById('modalCalcularLuz').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharModalCalcularLuz() {
  handleModalClose();
  document.getElementById('modalCalcularLuz').classList.remove('active');
  document.body.style.overflow = '';
}

// Adiciona listeners para tooltips customizados
document.addEventListener('DOMContentLoaded', () => {
  // Adiciona tooltips customizados para checkboxes do header
  document.querySelectorAll('th input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('mouseenter', (e) => {
      showCustomTooltip(e.target, 'Marcar todas como já calculadas');
    });
    checkbox.addEventListener('mouseleave', () => {
      hideCustomTooltip();
    });
  });
});

// --- DOUBLE TAP REAL PARA MOBILE (TOUCHEND) E POSICIONAMENTO CORRIGIDO ---
function initDoubleTapMobile() {
  let lastTapTime = 0;
  const delay = 500; // Tempo aumentado para facilitar o double tap

  document.querySelectorAll('.trigger-p-nome').forEach((el) => {
    el.addEventListener(
      'touchend',
      function (e) {
        const now = new Date().getTime();
        const timeSince = now - lastTapTime;

        // Verifica se é double tap
        if (timeSince < delay && timeSince > 0) {
          e.preventDefault();
          const pessoa = this.getAttribute('data-pessoa');
          abrirMenuContexto(e, pessoa);
        }

        lastTapTime = now;
      },
      { passive: false }
    );
  });
}

function abrirMenuContexto(e, pessoa) {
  if (e.cancelable && e.preventDefault) e.preventDefault();
  pessoaSelecionadaContexto = pessoa;
  const menu = document.getElementById('customContextMenu');

  // Controle de visibilidade dos itens do menu
  const isUltimas = pessoa === 'ULTIMAS';

  // Esconde itens de cartão se for 'ULTIMAS'
  document
    .querySelectorAll(
      '#customContextMenu li:not(.delete-action):not(#btnMarcarCalculadas):not(#btnExcluirSelecionados)'
    )
    .forEach((li) => {
      li.style.display = isUltimas ? 'none' : 'flex';
    });

  const btnDelete = document.querySelector('#customContextMenu li.delete-action');
  if (btnDelete) btnDelete.style.display = isUltimas ? 'none' : 'flex';

  const btnMarcar = document.getElementById('btnMarcarCalculadas');
  if (btnMarcar) btnMarcar.style.display = isUltimas ? 'flex' : 'none';

  const btnExcluirSelecionados = document.getElementById('btnExcluirSelecionados');
  if (btnExcluirSelecionados) {
    if (isUltimas) {
      const selectedCount = document.querySelectorAll('#listaUltimasConteudo tr.selected-row').length;
      if (selectedCount > 0) {
        btnExcluirSelecionados.style.display = 'flex';
        document.getElementById('textExcluirSelecionados').innerText =
          `Excluir ${selectedCount} ite${selectedCount > 1 ? 'ns' : 'm'} selecionado${selectedCount > 1 ? 's' : ''}`;
      } else {
        btnExcluirSelecionados.style.display = 'none';
      }
    } else {
      btnExcluirSelecionados.style.display = 'none';
    }
  }

  // Controle de divisores
  const divUltimas = document.getElementById('menuDividerUltimas');
  if (divUltimas) divUltimas.style.display = isUltimas ? 'flex' : 'none';

  // Esconder divisor geral se for a última ação (ou para evitar espaços vazios)
  const divGeral = menu.querySelector('.menu-divider:not(#menuDividerUltimas)');
  if (divGeral) {
    // Só mostra o divisor se NÃO for "Ultimas" (pois Ultimas tem seu próprio divisor condicional)
    divGeral.style.display = isUltimas ? 'none' : 'flex';
  }

  menu.style.display = 'block';

  // CORREÇÃO CRÍTICA: USAR CLIENTX/CLIENTY PARA POSITION FIXED
  let x, y;
  if (e.changedTouches) {
    // Evento de toque
    x = e.changedTouches[0].clientX;
    y = e.changedTouches[0].clientY;
  } else {
    // Evento de mouse
    x = e.clientX;
    y = e.clientY;
  }

  // Fallback
  if (!x) x = window.innerWidth / 2;
  if (!y) y = window.innerHeight / 2;

  // Ajuste para não sair da tela
  if (x + 220 > window.innerWidth) x -= 220;
  if (y + 180 > window.innerHeight) y -= 180;

  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
}

function fecharMenuContexto() {
  document.getElementById('customContextMenu').style.display = 'none';
}

window.onclick = (e) => {
  if (!e.target.closest('#customContextMenu')) fecharMenuContexto();
  if (e.target.classList.contains('modal-overlay') && e.target.id !== 'modalLoading') fecharModais();
};

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
    if (res.ok) window.location.reload();
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
        window.location.reload();
      }
    } catch (e) {
      ocultarLoading();
      mostrarAviso('Erro', 'Erro de rede.');
    }
  };
  modal.classList.add('active');
}

document.getElementById('btnConfirmarAcao').onclick = () => {
  if (acaoConfirmadaCallback) acaoConfirmadaCallback();
  fecharConfirmacaoAcao();
};

// ==============================================================================
// ✅ FUNÇÃO PARA TOGGLE ALL (MARCAR TODOS COMO CONFERIDO)
// ==============================================================================
function toggleAllConferido(checkbox) {
  const isChecked = checkbox.checked;
  const tbody = document.getElementById('listaUltimasConteudo');
  const checkboxes = tbody.querySelectorAll('input[type="checkbox"]');

  checkboxes.forEach((cb) => {
    cb.checked = isChecked;
    // Dispara o evento change para cada checkbox
    cb.dispatchEvent(new Event('change'));
  });
}

// ==============================================================================
// ✅ SELEÇÃO DE LINHAS (EXCLUSÃO EM LOTE)
// ==============================================================================
window.toggleRowSelection = function (e, row) {
  if (e.target.tagName === 'INPUT' || e.target.closest('.actions')) return;
  row.classList.toggle('selected-row');
};

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
      const quem = item.nometerceiro || currentUserName;

      // ✅ Mantém "R$" + valor em uma única linha (usa NBSP do currency pt-BR)
      const valorCurrency = Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      const descText = item.descricao + (item.parcelaatual ? ` (${item.parcelaatual}/${item.totalparcelas})` : '');

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

      const descHTML = `<div style="display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;"><span>${descText}</span>${badgeCmp}</div>`;

      const dt = item.datacriacao ? new Date(item.datacriacao) : null;
      const inseridoEm = dt
        ? `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
        : '--/--/----';

      // Segurança básica para strings dentro do onclick
      const safeDesc = String(item.descricao || '').replace(/'/g, "\\'");
      const safePessoa = String(item.nometerceiro || '').replace(/'/g, "\\'");

      const tipo = item.parcelaatual ? 'Parcelada' : 'Única';
      const pAtual = item.parcelaatual || '';
      const pTotal = item.totalparcelas || '';

      // Para manter o padrão das outras telas, editarConta espera valor sem "R$"
      const valorSemMoeda = Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

      // Checkbox "conferido" — persistente no banco
      const isConferido = item.conferido === true;
      const classeConferido = isConferido ? ' conferido' : '';

      html += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer;" class="${classeConferido}" data-id="${item.id}" onclick="toggleRowSelection(event, this)">
                <td style="text-align:center;"><input type="checkbox" onchange="alternarConferido(this, ${item.id})" ${isConferido ? 'checked' : ''}></td>
                <td class="col-data">${inseridoEm}</td>
                <td style="font-weight:500; color:var(--blue);">${quem}</td>
                <td class="col-desc">${descHTML}</td>
                <td class="col-valor" style="text-align:right; font-weight:bold; white-space:nowrap;">${valorCurrency}</td>
                <td class="actions" style="text-align:center;">
                    <span class="material-icons" style="font-size:18px; cursor:pointer;" onclick="editarConta(${item.id}, '${safeDesc}', '${valorSemMoeda}', '${tipo}', '${pAtual}', '${pTotal}', '${safePessoa}')">edit</span>
                    <span class="material-icons" style="font-size:18px; cursor:pointer;" onclick="confirmarExclusao(${item.id})">delete</span>
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
      window.location.reload();
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
        await atualizarTotais();
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
      const safeDesc = item.descricao.replace(/'/g, "\\'");
      const pAtual = item.parcelaatual || '';
      const pTotal = item.totalparcelas || '';
      const safePessoa = (item.nometerceiro || '').replace(/'/g, "\\'");
      let parcelasTexto =
        item.parcelaatual && item.totalparcelas
          ? `<small style="color:var(--text-secondary); margin-left:5px;">(${String(item.parcelaatual).padStart(2, '0')}/${String(item.totalparcelas).padStart(2, '0')})</small>`
          : '';
      html += `<tr class="draggable-row" draggable="true" data-id="${item.id}"><td width="20"><span class="material-icons drag-handle" style="font-size:16px;">drag_indicator</span></td><td width="30"><input type="checkbox" onchange="alternarStatus(this, ${item.id})" ${item.status === 'PAGO' ? 'checked' : ''}></td><td>${item.descricao} ${parcelasTexto}</td><td class="text-right">R$ ${v}</td><td class="actions"><span class="material-icons" style="font-size:18px;" onclick="editarConta(${item.id}, '${safeDesc}', '${v}', '${item.parcelaatual ? 'Parcelada' : 'Única'}', '${pAtual}', '${pTotal}', '${safePessoa}')">edit</span><span class="material-icons" style="font-size:18px;" onclick="confirmarExclusao(${item.id})">delete</span></td></tr>`;
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
      const safeDesc = renda.descricao.replace(/'/g, "\\'");
      html += `<div class="list-item"><div class="desc">${renda.descricao}</div><div style="display:flex;gap:15px;"><div class="val">R$ ${valorFormatado}</div><div class="actions"><span class="material-icons" onclick="editarRenda(${renda.id}, '${safeDesc}', '${valorFormatado}', '${renda.categoria}')">edit</span><span class="material-icons" onclick="confirmarExclusao(${renda.id})">delete</span></div></div></div>`;
    });
    container.innerHTML = html || 'Vazio';
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<div style="text-align:center; padding:20px; color: var(--red);">Erro ao carregar rendas.</div>';
  }
}

function fecharModais() {
  handleModalClose();
  document.querySelectorAll('.modal-overlay').forEach((m) => {
    if (m.id !== 'modalLoading') m.classList.remove('active');
  });
  setTimeout(() => {
    document.getElementById('formRenda').reset();
    document.getElementById('formConta').reset();
    document.getElementById('rendaId').value = '';
    document.getElementById('contaId').value = '';
    document.getElementById('modalGridForm').classList.remove('single-col');
    document.getElementById('colRenda').style.display = 'block';
    document.getElementById('colConta').style.display = 'block';
    document.getElementById('modalTitulo').innerText = 'Adicionar Lançamento';
    toggleParcelas();
    toggleBulkMode();
  }, 300);
}

function fecharModalAviso() {
  handleModalClose();
  document.getElementById('modalAviso').classList.remove('active');
}

// FUNÇÃO DE CONFIRMAÇÃO PARA O BOTÃO DE CÓPIA E EXCLUSÃO
function abrirConfirmacaoAcao(acao) {
  registerModalOpen();
  const modal = document.getElementById('modalConfirmacaoAcao');
  const titulo = document.getElementById('tituloConfirmacao');
  const texto = document.getElementById('textoConfirmacao');
  const icon = document.getElementById('iconConfirmacao');
  const btn = document.getElementById('btnConfirmarAcao');

  if (acao === 'COPIAR') {
    titulo.innerText = 'Copiar Contas';
    texto.innerText = 'Deseja copiar as contas fixas, parcelas e rendas do mês anterior para o mês atual?';
    icon.innerText = 'content_copy';
    icon.style.color = 'var(--blue)';
    btn.style.backgroundColor = 'var(--blue)';
    acaoConfirmadaCallback = executarCopia;
  } else if (acao === 'DELETAR') {
    titulo.innerText = 'Deletar Mês';
    texto.innerText = 'Deseja realmente apagar TODOS os lançamentos deste mês? Esta ação não pode ser desfeita.';
    icon.innerText = 'warning';
    icon.style.color = 'var(--red)';
    btn.style.backgroundColor = 'var(--red)';
    acaoConfirmadaCallback = executarDeleteMes;
  }

  modal.classList.add('active');
}

function fecharConfirmacaoAcao() {
  handleModalClose();
  document.getElementById('modalConfirmacaoAcao').classList.remove('active');
  acaoConfirmadaCallback = null;
}
function fecharConfirmacao() {
  handleModalClose();
  document.getElementById('modalConfirmar').classList.remove('active');
}

function editarConta(id, desc, valor, tipo, pAtual, pTotal, nomeTerceiro) {
  document.getElementById('modalDetalhesCartao').classList.remove('active');
  const modal = document.getElementById('modalAdicionar');
  document.getElementById('modalTitulo').innerText = 'Editar Conta';
  document.getElementById('modalGridForm').classList.add('single-col');
  document.getElementById('colRenda').style.display = 'none';
  document.getElementById('colConta').style.display = 'block';
  document.getElementById('tituloConta').innerText = 'Editar Dados';
  document.getElementById('btnSalvarConta').innerText = 'Salvar Alterações';
  document.getElementById('contaId').value = id;
  document.getElementById('contaDesc').value = desc;
  document.getElementById('contaValor').value = valor;
  document.getElementById('contaTipo').value = tipo;
  document.getElementById('contaTerceiro').value =
    nomeTerceiro && nomeTerceiro !== 'null' && nomeTerceiro !== 'undefined' ? nomeTerceiro : '';
  if (tipo === 'Parcelada' && pAtual && pTotal)
    document.getElementById('contaParcelas').value =
      String(pAtual).padStart(2, '0') + '/' + String(pTotal).padStart(2, '0');
  else document.getElementById('contaParcelas').value = '';
  toggleParcelas();
  modal.classList.add('active');
}

function editarRenda(id, descricao, valor, categoria) {
  document.getElementById('modalRendasDetalhes').classList.remove('active');
  const modal = document.getElementById('modalAdicionar');
  document.getElementById('modalTitulo').innerText = 'Editar Renda';
  document.getElementById('modalGridForm').classList.add('single-col');
  document.getElementById('colConta').style.display = 'none';
  document.getElementById('colRenda').style.display = 'block';
  document.getElementById('tituloRenda').innerText = 'Editar Dados';
  document.getElementById('btnSalvarRenda').innerText = 'Salvar Alterações';
  document.getElementById('rendaId').value = id;
  document.getElementById('rendaDesc').value = descricao;
  document.getElementById('rendaValor').value = valor;
  document.getElementById('rendaCat').value = categoria || 'Salário';
  modal.classList.add('active');
}

function toggleRendas(event) {
  if (event) event.stopPropagation();
  const icon = document.getElementById('iconEyeRendas');
  const html = document.documentElement;
  if (html.classList.contains('hide-rendas-mode')) {
    html.classList.remove('hide-rendas-mode');
    icon.innerText = 'visibility';
    localStorage.setItem('hideRendas', 'false');
  } else {
    html.classList.add('hide-rendas-mode');
    icon.innerText = 'visibility_off';
    localStorage.setItem('hideRendas', 'true');
  }
}

// --- INICIALIZAÇÃO NO DOMCONTENTLOADED ---
window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('hideRendas') === 'true') {
    const icon = document.getElementById('iconEyeRendas');
    if (icon) icon.innerText = 'visibility_off';
  }
  initDragAndDrop();
  initCardDragAndDrop();
  initTouchCardDragAndDrop(); // ✅ DND Cards Mobile
  initDoubleTapMobile();
  initTouchDragAndDrop(); // ✅ DND Linhas Mobile
});

function limparMascara(input) {
  if (input.value.includes('R$ 0,00')) input.value = '';
}
function handleEnterFatura(e, input) {
  if (e.key === 'Enter') {
    input.blur();
  }
}

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

// ===========================
// ✅ DRAG & DROP CARDS (PC Anti-Flicker)
// ===========================
function initCardDragAndDrop() {
  const draggables = document.querySelectorAll('.draggable-card');
  const container = document.querySelector('.drag-container-cards');
  if (!container) return;

  draggables.forEach((draggable) => {
    draggable.addEventListener('dragstart', () => {
      draggable.classList.add('dragging');
    });
    draggable.addEventListener('dragend', () => {
      draggable.classList.remove('dragging');
      salvarOrdemCards();
    });
  });
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const draggable = document.querySelector('.draggable-card.dragging');
    if (!draggable) return;

    const siblings = [...container.querySelectorAll('.draggable-card:not(.dragging)')];
    let hoverCard = null;

    // 🛡️ Bounding Box Collision (Fim do flickering no PC)
    for (let child of siblings) {
      const box = child.getBoundingClientRect();
      if (e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom) {
        hoverCard = child;
        break;
      }
    }

    if (hoverCard) {
      const box = hoverCard.getBoundingClientRect();
      if (e.clientX > box.left + box.width / 2) container.insertBefore(draggable, hoverCard.nextSibling);
      else container.insertBefore(draggable, hoverCard);
    }
  });
}

// ===========================
// ✅ DRAG & DROP CARDS (MOBILE)
// ===========================
function initTouchCardDragAndDrop() {
  if (window.__touchCardDndInicializado) return;
  window.__touchCardDndInicializado = true;

  let draggingCard = null;
  let activeContainer = null;

  function onTouchMove(e) {
    if (!draggingCard || !activeContainer) return;
    e.preventDefault(); // Impede rolagem enquanto arrasta

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;

    const siblings = [...activeContainer.querySelectorAll('.draggable-card:not(.dragging)')];
    let hoverCard = null;

    for (let child of siblings) {
      const box = child.getBoundingClientRect();
      if (touchX >= box.left && touchX <= box.right && touchY >= box.top && touchY <= box.bottom) {
        hoverCard = child;
        break;
      }
    }

    if (hoverCard) {
      const box = hoverCard.getBoundingClientRect();
      if (touchX > box.left + box.width / 2) activeContainer.insertBefore(draggingCard, hoverCard.nextSibling);
      else activeContainer.insertBefore(draggingCard, hoverCard);
    }
  }

  async function onTouchEnd() {
    if (!draggingCard || !activeContainer) return;
    draggingCard.classList.remove('dragging');
    try {
      await salvarOrdemCards();
    } catch (_) {}
    draggingCard = null;
    activeContainer = null;
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  }

  const container = document.querySelector('.drag-container-cards');
  if (container) {
    container.addEventListener(
      'touchstart',
      (e) => {
        // 🛡️ SÓ ativa se tocar no ícone de arrastar
        if (!e.target.closest('.drag-handle-card')) return;

        const card = e.target.closest('.draggable-card');
        if (!card) return;

        draggingCard = card;
        activeContainer = container;
        draggingCard.classList.add('dragging');

        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd, { passive: true });
      },
      { passive: true }
    );
  }
}

async function salvarOrdemCards() {
  const container = document.querySelector('.drag-container-cards');
  const nomes = [...container.querySelectorAll('.draggable-card')].map((card) => card.dataset.nome);
  try {
    await fetch('/api/cards/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nomes }),
    });
  } catch (err) {
    console.error(err);
  }
}

function fazerBackup() {
  window.location.href = '/api/backup';
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
      setTimeout(() => window.location.reload(), 1500);
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
      setTimeout(() => window.location.reload(), 1500);
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
  try {
    const res = await fetch(`/api/lancamentos/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    });
    if (!res.ok) {
      // Reverte se falhou
      checkbox.checked = !novoStatus;
      return;
    }
    // Busca os totais atualizados do servidor e atualiza os cards
    await atualizarTotais();
  } catch (err) {
    // Reverte em caso de erro de rede
    checkbox.checked = !novoStatus;
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

    if (elRendas) elRendas.textContent = formatarMoeda(totais.totalrendas);
    if (elContas) elContas.textContent = formatarMoeda(totais.totalcontas);
    if (elFalta) elFalta.textContent = formatarMoeda(totais.faltapagar);
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

function initDragAndDrop() {
  const draggables = document.querySelectorAll('.draggable-row');
  const containers = document.querySelectorAll('.drag-container');
  draggables.forEach((draggable) => {
    draggable.addEventListener('dragstart', () => {
      draggable.classList.add('dragging');
    });
    draggable.addEventListener('dragend', () => {
      draggable.classList.remove('dragging');
      salvarOrdem(draggable.parentElement);
    });
  });
  containers.forEach((container) => {
    container.ondragover = (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(container, e.clientY);
      const draggable = document.querySelector('.dragging');
      if (afterElement == null) container.appendChild(draggable);
      else container.insertBefore(draggable, afterElement);
    };
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.draggable-row:not(.dragging)')];
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
      else return closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

// ===========================
// ✅ DRAG & DROP LINHAS (MOBILE)
// ===========================
function initTouchDragAndDrop() {
  if (window.__touchDndInicializado) return;
  window.__touchDndInicializado = true;

  let draggingRow = null;
  let activeContainer = null;

  function onTouchMove(e) {
    if (!draggingRow || !activeContainer) return;
    e.preventDefault();

    const touchY = e.touches[0].clientY;
    const afterElement = getDragAfterElement(activeContainer, touchY);

    if (afterElement == null) activeContainer.appendChild(draggingRow);
    else activeContainer.insertBefore(draggingRow, afterElement);
  }

  async function onTouchEnd() {
    if (!draggingRow || !activeContainer) return;
    draggingRow.classList.remove('dragging');
    try {
      await salvarOrdem(activeContainer);
    } catch (_) {}
    draggingRow = null;
    activeContainer = null;

    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  }

  document.querySelectorAll('.drag-container').forEach((container) => {
    container.addEventListener(
      'touchstart',
      (e) => {
        // 🛡️ SÓ ativa se tocar no ícone de arrastar
        if (!e.target.closest('.drag-handle')) return;

        const row = e.target.closest('.draggable-row');
        if (!row) return;

        draggingRow = row;
        activeContainer = container;
        draggingRow.classList.add('dragging');

        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd, { passive: true });
      },
      { passive: true }
    );
  });
}

async function salvarOrdem(container) {
  const itens = [...container.querySelectorAll('.draggable-row')].map((row) => ({ id: row.dataset.id }));
  if (itens.length === 0) return;
  try {
    await fetch('/api/lancamentos/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens }),
    });
  } catch (err) {
    console.error('Erro', err);
  }
}

function toggleParcelas() {
  const tipo = document.getElementById('contaTipo').value;
  const div = document.getElementById('grupoParcelas');
  const input = div.querySelector('input');
  if (tipo === 'Parcelada') {
    div.style.display = 'flex';
    input.required = true;
  } else {
    div.style.display = 'none';
    input.required = false;
  }
}

// ==============================================================================
// ✅ NOVO: Toggle para modo bulk com botões Sim/Não
// ==============================================================================
function toggleBulkMode() {
  const btnSim = document.getElementById('bulkBtnSim');
  const btnNao = document.getElementById('bulkBtnNao');
  const singleTerceiroGroup = document.getElementById('grupoTerceiroSingle');
  const bulkTerceirosGroup = document.getElementById('grupoTerceirosBulk');
  const bulkCounter = document.getElementById('bulkCounter');

  if (!btnSim || !btnNao || !singleTerceiroGroup || !bulkTerceirosGroup) return;

  const isBulk = btnSim.classList.contains('active');

  if (isBulk) {
    singleTerceiroGroup.style.display = 'none';
    bulkTerceirosGroup.style.display = 'flex';
    // Atualiza contador
    atualizarBulkCounter();
  } else {
    singleTerceiroGroup.style.display = 'flex';
    bulkTerceirosGroup.style.display = 'none';
    if (bulkCounter) bulkCounter.textContent = '';
  }
}

// ✅ CORREÇÃO: Função setBulkMode agora está no escopo global
window.setBulkMode = function (isBulk) {
  const btnSim = document.getElementById('bulkBtnSim');
  const btnNao = document.getElementById('bulkBtnNao');

  if (!btnSim || !btnNao) return;

  // Remove active de ambos primeiro
  btnSim.classList.remove('active');
  btnNao.classList.remove('active');

  // Adiciona active no selecionado
  if (isBulk) {
    btnSim.classList.add('active');
  } else {
    btnNao.classList.add('active');
  }

  toggleBulkMode();
};

function atualizarBulkCounter() {
  const bulkInput = document.getElementById('contaTerceirosBulk');
  const bulkCounter = document.getElementById('bulkCounter');
  if (!bulkInput || !bulkCounter) return;

  const nomes = bulkInput.value
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  if (nomes.length > 0) {
    bulkCounter.textContent = `${nomes.length} lançamento(s) será(ão) criado(s)`;
    bulkCounter.style.color = 'var(--blue)';
  } else {
    bulkCounter.textContent = 'Adicione pelo menos 1 terceiro';
    bulkCounter.style.color = 'var(--red)';
  }
}

function mascaraParcela(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length > 4) v = v.substring(0, 4);
  if (v.length > 2) v = v.replace(/^(\d{2})(\d)/, '$1/$2');
  input.value = v;
}

async function enviarLancamento(e, tipoTransacao) {
  if (!id && checkBloqueioMesFechado()) return; // Apenas bloqueia POST (inserir), edição permite passar
  e.preventDefault();
  const form = e.target;
  const id = (tipoTransacao === 'RENDA' ? document.getElementById('rendaId') : document.getElementById('contaId'))
    .value;

  // Verifica se é modo bulk (apenas para CONTAS)
  const btnSim = document.getElementById('bulkBtnSim');
  const isBulk = btnSim && btnSim.classList.contains('active') && tipoTransacao === 'CONTA';

  if (isBulk) {
    await enviarLancamentoBulk(form);
    return;
  }

  const dados = {
    descricao: form.descricao.value,
    valor: form.valor.value,
    sub_tipo: form.sub_tipo.value,
    tipo_transacao: tipoTransacao,
    context_month: currentMonth,
    context_year: currentYear,
  };

  if (tipoTransacao === 'CONTA') {
    if (dados.sub_tipo === 'Parcelada') dados.parcelas = form.parcelas.value;
    dados.nome_terceiro = form.nome_terceiro.value;
  }

  try {
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
      window.location.reload();
    }
  } catch (err) {
    console.error(err);
  }
}

// ==============================================================================
// ✅ NOVO: Envio de lançamento em massa (bulk)
// ==============================================================================
async function enviarLancamentoBulk(form) {
  if (checkBloqueioMesFechado()) return;
  const bulkInput = document.getElementById('contaTerceirosBulk');
  if (!bulkInput) return;

  const terceiros = bulkInput.value
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  if (terceiros.length === 0) {
    mostrarAviso('Erro', 'Adicione pelo menos 1 terceiro separado por vírgula.');
    return;
  }

  const dados = {
    descricao: form.descricao.value,
    valor: form.valor.value,
    sub_tipo: form.sub_tipo.value,
    tipo_transacao: 'CONTA',
    context_month: currentMonth,
    context_year: currentYear,
    terceiros: terceiros, // Array de terceiros
    bulk_mode: true, // Flag para backend
  };

  if (dados.sub_tipo === 'Parcelada') dados.parcelas = form.parcelas.value;

  try {
    mostrarLoading();
    const res = await fetch('/api/lancamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });

    ocultarLoading();

    if (res.status === 403) {
      const err = await res.json();
      mostrarAviso('Acesso Negado', err.error);
      return;
    } else if (res.ok) {
      const result = await res.json();
      mostrarAviso('Sucesso', `${result.criados || terceiros.length} lançamento(s) criado(s) com sucesso!`);
      setTimeout(() => window.location.reload(), 1500);
    } else {
      const error = await res.json();
      mostrarAviso('Erro', error.error || 'Falha ao criar lançamentos em massa.');
    }
  } catch (err) {
    ocultarLoading();
    console.error(err);
    mostrarAviso('Erro', 'Erro de conexão.');
  }
}

let timeout = null;
function salvarAnotacao() {
  const t = document.getElementById('anotacoesArea').value;
  const status = document.getElementById('statusSave');
  clearTimeout(timeout);
  timeout = setTimeout(async () => {
    try {
      await fetch('/api/anotacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo: t, month: currentMonth, year: currentYear }),
      });
      if (status) {
        status.style.opacity = '1';
        setTimeout(() => (status.style.opacity = '0'), 2000);
      }
    } catch (err) {
      console.error(err);
    }
  }, 1000);
}
function mostrarAviso(titulo, msg) {
  registerModalOpen();
  document.getElementById('msgAvisoTitulo').innerText = titulo;
  document.getElementById('msgAvisoTexto').innerText = msg;
  document.getElementById('modalAviso').classList.add('active');
}
function abrirModalAdicionar() {
  if (checkBloqueioMesFechado()) return;
  registerModalOpen();
  document.getElementById('modalAdicionar').classList.add('active');
  // Foca automaticamente no campo de descrição da conta para agilizar a digitação
  setTimeout(() => {
    const inputDesc = document.getElementById('contaDesc');
    if (inputDesc) inputDesc.focus();
  }, 100);
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
      window.location.reload();
    }
  } catch (e) {
    ocultarLoading();
  }
};

// ==============================================================================
// ✅ PORTAL DE TERCEIROS - COMPARTILHAMENTO
// ==============================================================================

/**
 * Inicia o fluxo de compartilhamento do link público
 */
function compartilharLinkTerceiro() {
  fecharMenuContexto();
  const nome = pessoaSelecionadaContexto;
  if (!nome || nome === 'ULTIMAS') return;

  const userId = document.body.dataset.userid;
  const url = `${window.location.origin}/contas/${userId}/${encodeURIComponent(nome)}`;

  // Detecção de PC vs Celular
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // Comportamento Mobile: Copia direto e mostra aviso
    copiarAoClipboard(url);
    mostrarAviso('Link copiado!', url);
  } else {
    // Comportamento PC: Abre modal de escolhas
    const nomeEl = document.getElementById('nomePessoaShare');
    if (nomeEl) nomeEl.innerText = nome;

    registerModalOpen();
    document.getElementById('modalCompartilhar').classList.add('active');
  }
}

function fecharModalCompartilhar() {
  handleModalClose();
  document.getElementById('modalCompartilhar').classList.remove('active');
}

/**
 * Abre o link do portal em uma nova guia
 */
function abrirLinkCompartilhado() {
  const nome = pessoaSelecionadaContexto;
  if (nome) {
    const userId = document.body.dataset.userid;
    const url = `${window.location.origin}/contas/${userId}/${encodeURIComponent(nome)}`;
    window.open(url, '_blank');
    fecharModalCompartilhar();
  }
}

/**
 * Copia o link e fecha o modal
 */
function copiarLinkCompartilhado() {
  const nome = pessoaSelecionadaContexto;
  if (nome) {
    const userId = document.body.dataset.userid;
    const url = `${window.location.origin}/contas/${userId}/${encodeURIComponent(nome)}`;
    copiarAoClipboard(url);
    fecharModalCompartilhar();
    mostrarAviso('Sucesso', 'Link copiado para a área de transferência!');
  }
}

/**
 * Helper robusto para cópia de texto (Clipboard API + Fallback)
 */
function copiarAoClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error('Erro ao copiar: ', err);
      // fallback redundante em caso de erro na API
      fallbackCopiarAoClipboard(text);
    });
  } else {
    fallbackCopiarAoClipboard(text);
  }
}

function fallbackCopiarAoClipboard(text) {
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  const selected = document.getSelection().rangeCount > 0 ? document.getSelection().getRangeAt(0) : false;
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  if (selected) {
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(selected);
  }
}
