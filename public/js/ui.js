// ==============================================================================
// ✅ public/js/ui.js — Gerenciamento de Modais, Interações e Eventos DOM
// ==============================================================================

import { getCurrentMonth, getCurrentYear } from './modules/dashboard.js';

// ✅ OBS-20260531-13: Flag para suprimir popstate durante fechamento programático.
// Evita que history.back() assíncrono dispare fecharModais() reentrante que
// destruiria o modalAviso criado logo após o softRefresh no fluxo de dividir conta.
let _suppressPopstate = false;
let pessoaSelecionadaContexto = null;
let acaoConfirmadaCallback = null; // Variável de estado para callback de confirmação genérica

function registerModalOpen() {
  if (document.activeElement) document.activeElement.blur();
  document.body.classList.add('no-scroll');
  history.pushState({ modal: true }, '', '');
}

function handleModalClose() {
  document.body.classList.remove('no-scroll');
  if (!window.isBackNavigation && history.state && history.state.modal) {
    history.back();
  }
}

window.addEventListener('popstate', () => {
  if (_suppressPopstate) {
    return;
  }
  const activeModal = document.querySelector('.modal-overlay.active');
  if (activeModal) {
    window.isBackNavigation = true;
    if (activeModal.id === 'modalConfirmar') fecharConfirmacao();
    else if (activeModal.id === 'modalAviso') fecharModalAviso();
    else if (activeModal.id === 'modalConfirmacaoAcao') fecharConfirmacaoAcao();
    else if (activeModal.id === 'modalCalcularLuz') fecharModalCalcularLuz();
    else if (activeModal.id === 'modalConfiguracoes') fecharModalConfiguracoes();
    else fecharModais();
    window.isBackNavigation = false;
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
      else if (activeModal.id === 'modalConfiguracoes') fecharModalConfiguracoes();
      else fecharModais();
    }
    fecharMenuContexto();
  }
  
  // Acessibilidade: Ativar elementos com role="button" via teclado
  if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute('role') === 'button') {
    e.preventDefault();
    e.target.click();
  }

  if (e.altKey && e.key.toLowerCase() === 'a') {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    e.preventDefault();
    const modalUltimas = document.getElementById('modalUltimasContas');
    if (modalUltimas && !document.querySelector('.modal-overlay.active')) abrirModalUltimas();
  }
  if (e.altKey && e.key.toLowerCase() === 'n') {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    e.preventDefault();
    const modalAdicionar = document.getElementById('modalAdicionar');
    if (modalAdicionar && !document.querySelector('.modal-overlay.active')) abrirModalAdicionar();
  }
  if (e.altKey && e.key.toLowerCase() === 't') {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    e.preventDefault();
    const month = getCurrentMonth();
    const year = getCurrentYear();
    window.open(`/terceiros?month=${month}&year=${year}`, '_blank');
  }
  if (e.altKey && e.key.toLowerCase() === 'b') {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    e.preventDefault();
    fazerBackup();
  }
  if (e.altKey && e.code === 'KeyI') {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    e.preventDefault();
    const month = getCurrentMonth();
    const year = getCurrentYear();
    window.open(`/relatorio?month=${month}&year=${year}`, '_blank');
  }
  if (e.altKey && e.key.toLowerCase() === 'c') {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    e.preventDefault();
    toggleMesFechado();
  }
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'p') {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    e.preventDefault();
    togglePrivacidadeGlobal();
  }
});

async function toggleMesFechado() {
  const month = parseInt(document.body.dataset.month, 10);
  const year = parseInt(document.body.dataset.year, 10);

  try {
    const res = await fetch('/api/meses-fechados/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[toggleMesFechado] Erro API:', err);
      mostrarAviso('Erro', err.error || 'Falha ao alternar mês fechado.');
      return;
    }
    const data = await res.json();
    document.body.dataset.mesFechado = data.mesFechado.toString();
    mostrarAviso(
      'Sucesso',
      data.mesFechado ? 'Mês fechado com sucesso!' : 'Mês reaberto com sucesso!',
      () => {
        // Reload ao clicar no OK do modal
        if (typeof window.softRefreshCache === 'object') {
          window.softRefreshCache.clear();
        }
        location.reload();
      }
    );
  } catch (err) {
    console.error('[toggleMesFechado] Erro de conexão:', err);
    mostrarAviso('Erro', 'Erro de conexão.');
  }
}

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

function mostrarLoading() {
  document.getElementById('modalLoading').classList.add('active');
}
function ocultarLoading() {
  document.getElementById('modalLoading').classList.remove('active');
}

function abrirSidebar() {
  const mobileSidebar = document.getElementById('mobileSidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (!mobileSidebar || !sidebarOverlay) return;
  mobileSidebar.classList.add('open');
  sidebarOverlay.classList.add('open');
  document.body.classList.add('no-scroll');
}

function fecharSidebar() {
  const mobileSidebar = document.getElementById('mobileSidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (!mobileSidebar || !sidebarOverlay) return;
  mobileSidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
  document.body.classList.remove('no-scroll');
}

function fecharSidebarE(callback) {
  fecharSidebar();
  setTimeout(() => {
    if (typeof callback === 'function') callback();
  }, 300);
}

function abrirModalCalcularLuz() {
  const iframe = document.getElementById('iframeCalcularLuz');
  if (iframe && !iframe.getAttribute('src')) {
    iframe.src = `/calcularLuz-v2/index.html?v=${Date.now()}`;
  }
  registerModalOpen();
  document.getElementById('modalCalcularLuz').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharModalCalcularLuz() {
  handleModalClose();
  document.getElementById('modalCalcularLuz').classList.remove('active');
  document.body.style.overflow = '';
}

function abrirModalConfiguracoes() {
  registerModalOpen();
  const valorMinimo = document.body.dataset.configDivisaoMinimo || '750.00';
  const valorFormatado = parseFloat(valorMinimo).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  document.getElementById('configDivisaoMinimo').value = 'R$ ' + valorFormatado;
  
  // Reseta para a primeira aba
  const firstTabBtn = document.querySelector('.modal-tab');
  if (firstTabBtn) switchTab('tab-geral', firstTabBtn);

  document.getElementById('modalConfiguracoes').classList.add('active');
  
  // Carrega regras de sincronização
  if (typeof renderizarRegrasSync === 'function') renderizarRegrasSync();
}

function switchTab(tabId, btn) {
  // Remove active de todos os botões e conteúdos desta modal
  const container = btn.closest('.modal-box');
  container.querySelectorAll('.modal-tab').forEach(b => b.classList.remove('active'));
  container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  // Adiciona active no botão e conteúdo selecionado
  btn.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

function abrirModalRegraSync(index = -1, regra = null) {
  registerModalOpen();
  const form = document.getElementById('formRegraSync');
  form.reset();
  
  document.getElementById('syncRuleIndex').value = index;
  document.getElementById('tituloModalRegraSync').textContent = index === -1 ? 'Nova Regra' : 'Editar Regra';

  if (regra) {
    document.getElementById('syncType').value = regra.tipo;
    document.getElementById('syncTerceiroOrigem').value = regra.terceiroOrigem || '';
    document.getElementById('syncUsuarioDestino').value = regra.usuarioDestino || '';
    document.getElementById('syncAtivo').checked = regra.ativo !== false;

    if (regra.tipo === 'COPIA_TOTAL') {
      document.getElementById('syncContaDestino').value = regra.contaDestino || '';
    } else if (regra.tipo === 'DIVISAO_CASA') {
      document.getElementById('syncValorMinimo').value = regra.valorMinimo || '';
      document.getElementById('syncTerceiroEspelho').value = regra.terceiroEspelhoNoOrigem || '';
    }
  }

  toggleSyncFields();
  document.getElementById('modalRegraSync').classList.add('active');
}

function fecharModalRegraSync() {
  handleModalClose();
  document.getElementById('modalRegraSync').classList.remove('active');
}

function toggleSyncFields() {
  const type = document.getElementById('syncType').value;
  document.getElementById('fieldsCopiaTotal').style.display = type === 'COPIA_TOTAL' ? 'block' : 'none';
  document.getElementById('fieldsDivisaoCasa').style.display = type === 'DIVISAO_CASA' ? 'block' : 'none';
}

// ==============================================================================
// ✅ WIZARD DE ONBOARDING (WAVE 4)
// ==============================================================================
let currentWizardStep = 1;

function abrirModalWizard() {
  registerModalOpen();
  currentWizardStep = 1;
  showWizardStep(1);
  document.getElementById('modalWizard').classList.add('active');
  
  // Foco inicial
  setTimeout(() => {
    const input = document.getElementById('wizardPartnerName');
    if (input) input.focus();
  }, 200);
}

function fecharModalWizard() {
  handleModalClose();
  document.getElementById('modalWizard').classList.remove('active');
}

function showWizardStep(step) {
  document.querySelectorAll('.wizard-step').forEach(el => {
    el.style.display = parseInt(el.dataset.step) === step ? 'block' : 'none';
  });
}

function wizardNextStep() {
  if (currentWizardStep === 1) {
    const name = document.getElementById('wizardPartnerName').value.trim();
    if (!name) {
      if (typeof mostrarAviso === 'function') mostrarAviso('Campo Obrigatório', 'Por favor, informe o nome do seu parceiro(a).');
      return;
    }
  }
  
  currentWizardStep++;
  showWizardStep(currentWizardStep);
}

function wizardPrevStep() {
  if (currentWizardStep > 1) {
    currentWizardStep--;
    showWizardStep(currentWizardStep);
  }
}

function fecharModalConfiguracoes() {
  handleModalClose();
  document.getElementById('modalConfiguracoes').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
  // Restaura estado hide-rendas do localStorage
  if (localStorage.getItem('hideRendas') === 'true') {
    const icon = document.getElementById('iconEyeRendas');
    if (icon) icon.innerText = 'visibility_off';
  }

  document.querySelectorAll('th input[type="checkbox"]').forEach((checkbox) => {
    checkbox.setAttribute('data-tooltip', 'Marcar todas como já calculadas');
    checkbox.setAttribute('data-tooltip-dir', 'bottom-right');
  });

  // Inicializa drag & drop na carga inicial (monólito fazia no DOMContentLoaded)
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
});

function initDoubleTapMobile() {
  let lastTapTime = 0;
  const delay = 500;
  document.querySelectorAll('.trigger-p-nome').forEach((el) => {
    el.addEventListener(
      'touchend',
      function (e) {
        const now = new Date().getTime();
        const timeSince = now - lastTapTime;
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
  const isUltimas = pessoa === 'ULTIMAS';

  document
    .querySelectorAll(
      '#customContextMenu li:not(.delete-action):not(#btnMarcarCalculadas):not(#btnExcluirSelecionados):not(#btnMoverAnterior):not(#btnMoverSeguinte)'
    )
    .forEach((li) => {
      li.style.display = isUltimas ? 'none' : 'flex';
    });

  const btnDelete = document.querySelector('#customContextMenu li.delete-action');
  if (btnDelete) btnDelete.style.display = isUltimas ? 'none' : 'flex';
  const btnMarcar = document.getElementById('btnMarcarCalculadas');
  if (btnMarcar) btnMarcar.style.display = isUltimas ? 'flex' : 'none';
  const btnExcluirSelecionados = document.getElementById('btnExcluirSelecionados');
  const btnMoverAnterior = document.getElementById('btnMoverAnterior');
  const btnMoverSeguinte = document.getElementById('btnMoverSeguinte');

  let selectedCount = 0;
  if (isUltimas) {
    selectedCount = document.querySelectorAll('#listaUltimasConteudo tr.selected-row').length;
  }

  if (btnExcluirSelecionados) {
    if (isUltimas && selectedCount > 0) {
      btnExcluirSelecionados.style.display = 'flex';
      document.getElementById('textExcluirSelecionados').innerText = `Excluir ${selectedCount} item(s)`;
    } else {
      btnExcluirSelecionados.style.display = 'none';
    }
  }

  if (btnMoverAnterior) btnMoverAnterior.style.display = isUltimas && selectedCount > 0 ? 'flex' : 'none';
  if (btnMoverSeguinte) btnMoverSeguinte.style.display = isUltimas && selectedCount > 0 ? 'flex' : 'none';

  // ✅ Botão Dividir Conta: visível apenas com 1 seleção; disabled+tooltip com múltiplas
  const btnDividirConta = document.getElementById('btnDividirConta');
  if (btnDividirConta) {
    if (isUltimas && selectedCount === 1) {
      btnDividirConta.style.display = 'flex';
      btnDividirConta.classList.remove('disabled');
      btnDividirConta.removeAttribute('data-tooltip');
      btnDividirConta.onclick = () => {
        if (typeof abrirModalDividirConta === 'function') {
          abrirModalDividirConta(fecharMenuContexto, registerModalOpen, fecharModais);
        }
      };
    } else if (isUltimas && selectedCount > 1) {
      btnDividirConta.style.display = 'flex';
      btnDividirConta.classList.add('disabled');
      btnDividirConta.setAttribute('data-tooltip', 'Selecione apenas uma conta para dividir');
      btnDividirConta.onclick = null;
    } else {
      btnDividirConta.style.display = 'none';
    }
  }

  const divUltimas = document.getElementById('menuDividerUltimas');
  if (divUltimas) divUltimas.style.display = isUltimas ? 'flex' : 'none';
  const divGeral = menu.querySelector('.menu-divider:not(#menuDividerUltimas)');
  if (divGeral) divGeral.style.display = isUltimas ? 'none' : 'flex';

  menu.style.display = 'block';
  let x, y;
  if (e.changedTouches) {
    x = e.changedTouches[0].clientX;
    y = e.changedTouches[0].clientY;
  } else {
    x = e.clientX;
    y = e.clientY;
  }
  if (!x) x = window.innerWidth / 2;
  if (!y) y = window.innerHeight / 2;
  if (x + 220 > window.innerWidth) x -= 220;
  if (y + 180 > window.innerHeight) y -= 180;
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
}

function fecharMenuContexto() {
  document.getElementById('customContextMenu').style.display = 'none';
}
window.fecharMenuContexto = fecharMenuContexto;

window.onclick = (e) => {
  if (!e.target.closest('#customContextMenu')) fecharMenuContexto();
  if (e.target.classList.contains('modal-overlay') && e.target.id !== 'modalLoading') fecharModais();
};

function toggleAllConferido(checkbox) {
  const isChecked = checkbox.checked;
  const tbody = document.getElementById('listaUltimasConteudo');
  tbody.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.checked = isChecked;
    cb.dispatchEvent(new Event('change'));
  });
}

window.toggleRowSelection = function (e, row) {
  if (e.target.tagName === 'INPUT' || e.target.closest('.actions')) return;
  row.classList.toggle('selected-row');
};

// ✅ Marcar TODAS as contas do modal Últimas Adições como conferidas
async function executarAcaoConferidoLote() {
  fecharMenuContexto();
  mostrarLoading();
  try {
    const res = await fetch('/api/lancamentos/conferido-recentes', { method: 'POST' });
    if (res.ok) {
      document.querySelectorAll('#listaUltimasConteudo tr').forEach((row) => {
        row.classList.add('conferido');
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = true;
      });
      if (typeof window.atualizarTotalNaoConferido === 'function') window.atualizarTotalNaoConferido();
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

function fecharModais() {
  handleModalClose();
  document.querySelectorAll('.modal-overlay').forEach((m) => {
    if (m.id !== 'modalLoading') m.classList.remove('active');
  });
  const frmRenda = document.getElementById('formRenda');
  const frmConta = document.getElementById('formConta');
  if (frmRenda) frmRenda.reset();
  if (frmConta) frmConta.reset();
  if (document.getElementById('rendaId')) document.getElementById('rendaId').value = '';
  if (document.getElementById('contaId')) document.getElementById('contaId').value = '';
  if (document.getElementById('modalGridForm'))
    document.getElementById('modalGridForm').classList.remove('single-col');
  if (document.getElementById('colRenda')) document.getElementById('colRenda').style.display = 'block';
  if (document.getElementById('colConta')) document.getElementById('colConta').style.display = 'block';
  if (document.getElementById('modalTitulo'))
    document.getElementById('modalTitulo').innerText = 'Adicionar Lançamento';
  if (typeof toggleParcelas === 'function') toggleParcelas();
  if (typeof toggleBulkMode === 'function') toggleBulkMode();

  // CORREÇÃO: Resetar e ocultar o contador de lote nativo
  const bulkCounterNative = document.getElementById('bulkCounterNative');
  if (bulkCounterNative) {
    bulkCounterNative.style.display = 'none';
    bulkCounterNative.textContent = '';
  }

  // CORREÇÃO: Garantir reativação preventiva dos botões de submit no fechamento
  const btnSalvarConta = document.getElementById('btnSalvarConta');
  if (btnSalvarConta) {
    btnSalvarConta.disabled = false;
    btnSalvarConta.style.opacity = '1';
  }
  const btnSalvarRenda = document.getElementById('btnSalvarRenda');
  if (btnSalvarRenda) {
    btnSalvarRenda.disabled = false;
    btnSalvarRenda.style.opacity = '1';
  }

  // CORREÇÃO: Resetar a variável de submissão global
  if (typeof window.resetSubmitting === 'function') {
    window.resetSubmitting();
  }
}

function fecharModalAviso() {
  handleModalClose();
  document.getElementById('modalAviso').classList.remove('active');

  // Chama callback se existir
  if (window._avisoCallback && typeof window._avisoCallback.fn === 'function') {
    try {
      window._avisoCallback.fn();
    } catch (err) {
      console.error('[fecharModalAviso] Erro no callback:', err);
    }
    delete window._avisoCallback;
  }
}

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

// Handler do botão de confirmação de exclusão
document.addEventListener('click', async (e) => {
  const modal = document.getElementById('modalConfirmar');
  if (!modal || !modal.classList.contains('active')) return;

  // Verifica se clicou em botão com texto "Sim" ou classe similar
  const target = e.target.closest('button, .material-icons');
  if (!target) return;

  const btnText = target.textContent?.trim().toLowerCase();
  const isBtnSim = btnText.includes('sim') || target.id === 'btnConfirmarExclusao' || target.classList.contains('btn-primary');

  if (isBtnSim && window.idExcluir) {
    try {
      const res = await fetch(`/api/lancamentos/${window.idExcluir}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fecharConfirmacao();
        // Deleção única: refresh direto sem modal
        if (typeof window.refreshOnDelete === 'function') {
          await window.refreshOnDelete();
        }
      } else {
        const err = await res.json().catch(() => ({}));
        if (typeof window.mostrarAviso === 'function') {
          window.mostrarAviso('Erro', err.error || 'Falha ao excluir conta.');
        }
      }
    } catch (err) {
      if (typeof window.mostrarAviso === 'function') {
        window.mostrarAviso('Erro', 'Erro de conexão.');
      }
    }
  }
});

// Handler do botão de confirmação genérico (exclusão em massa)
if (document.getElementById('btnConfirmarAcao')) {
  document.getElementById('btnConfirmarAcao').addEventListener('click', async () => {
    if (typeof window.acaoConfirmadaCallback === 'function') {
      try {
        await window.acaoConfirmadaCallback();
      } catch (err) {
        // Erro já foi tratado no callback
      }
    }
  });
}

function mostrarAviso(titulo, msg, onFechar) {
  registerModalOpen();
  document.getElementById('msgAvisoTitulo').innerText = titulo;
  document.getElementById('msgAvisoTexto').innerText = msg;

  // Armazena callback para ser chamado ao fechar (protegendo existente)
  if (onFechar) {
    const callbackId = 'callback_' + Date.now();
    window._avisoCallback = { fn: onFechar, id: callbackId };
  }

  // Se for mensagem de sucesso sem callback específico, adiciona reload com cache-busting
  if (titulo === 'Sucesso' && !onFechar) {
    window._avisoCallback = {
      fn: () => {
        if (window._reloadAfterSuccess) {
          const url = new URL(window.location.href);
          url.searchParams.set('_t', Date.now());
          window.location.href = url.toString();
        }
      },
      id: 'refresh_callback'
    };
  }

  document.getElementById('modalAviso').classList.add('active');
}

function abrirModalAdicionar() {
  if (checkBloqueioMesFechado()) return;
  registerModalOpen();
  document.getElementById('modalAdicionar').classList.add('active');
  setTimeout(() => {
    const inputDesc = document.getElementById('contaDesc');
    if (inputDesc) inputDesc.focus();
  }, 100);
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

  // Acessibilidade: Foco automático no primeiro campo (Descrição)
  setTimeout(() => {
    const inputDesc = document.getElementById('contaDesc');
    if (inputDesc) inputDesc.focus();
  }, 100);
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

  // Acessibilidade: Foco automático no primeiro campo (Descrição)
  setTimeout(() => {
    const inputDesc = document.getElementById('rendaDesc');
    if (inputDesc) inputDesc.focus();
  }, 100);
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

function limparMascara(input) {
  if (input.value.includes('R$ 0,00')) input.value = '';
}
function handleEnterFatura(e, input) {
  if (e.key === 'Enter') input.blur();
}

async function salvarFaturaManual(input) {
  let val = input.value;
  if (!val) val = '0';
  const month = parseInt(document.body.dataset.month, 10);
  const year = parseInt(document.body.dataset.year, 10);
  try {
    const res = await fetch('/api/fatura-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valor: val, month, year }),
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

function togglePrivacidadeGlobal() {
  const html = document.documentElement;
  if (html.classList.contains('hide-global-mode')) {
    html.classList.remove('hide-global-mode');
    localStorage.setItem('hideGlobal', 'false');
  } else {
    html.classList.add('hide-global-mode');
    localStorage.setItem('hideGlobal', 'true');
  }
}

// ==============================================================================
// ✅ CONTROLE DO FORMULÁRIO DE LANÇAMENTO (Parcelas e Lote)
// ==============================================================================

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
    atualizarBulkCounter();
  } else {
    singleTerceiroGroup.style.display = 'flex';
    bulkTerceirosGroup.style.display = 'none';
    if (bulkCounter) bulkCounter.textContent = '';
  }
}

window.setBulkMode = function (isBulk) {
  const btnSim = document.getElementById('bulkBtnSim');
  const btnNao = document.getElementById('bulkBtnNao');

  if (!btnSim || !btnNao) return;

  btnSim.classList.remove('active');
  btnNao.classList.remove('active');

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

// ==============================================================================
// ✅ FUNÇÕES DE COMPARTILHAMENTO (Portal de Terceiros)
// ==============================================================================

let urlCompartilhamentoContexto = '';

async function compartilharLinkTerceiro() {
  fecharMenuContexto();
  const nome = pessoaSelecionadaContexto;
  if (!nome || nome === 'ULTIMAS') return;

  // Extrai mes/ano do dataset do body (definido em app.js.monolith)
  const month = document.body.dataset.month || new Date().getMonth() + 1;
  const year = document.body.dataset.year || new Date().getFullYear();

  mostrarLoading();
  try {
    const res = await fetch(`/api/terceiros/${encodeURIComponent(nome)}/token`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    if (data.error) {
      throw new Error(data.error);
    }

    ocultarLoading();

    urlCompartilhamentoContexto = `${window.location.origin}/contas/${data.token}?month=${month}&year=${year}`;

    const nomeEl = document.getElementById('nomePessoaShare');
    if (nomeEl) nomeEl.innerText = nome;

    registerModalOpen();
    document.getElementById('modalCompartilhar').classList.add('active');
  } catch (err) {
    ocultarLoading();
    mostrarAviso('Erro', `Não foi possível gerar o link de compartilhamento: ${err.message}`);
  }
}

function fecharModalCompartilhar() {
  handleModalClose();
  document.getElementById('modalCompartilhar').classList.remove('active');
}

function abrirLinkCompartilhado() {
  if (urlCompartilhamentoContexto) {
    window.open(urlCompartilhamentoContexto, '_blank');
    fecharModalCompartilhar();
  }
}

function copiarLinkCompartilhado() {
  if (urlCompartilhamentoContexto) {
    const nomeEl = document.getElementById('nomePessoaShare');
    const nome = nomeEl ? nomeEl.innerText : '';

    copiarAoClipboard(urlCompartilhamentoContexto).catch(console.error);

    _suppressPopstate = true;
    fecharModalCompartilhar();

    // Aguarda o history.back() completar antes de mostrar o próximo modal
    setTimeout(() => {
      mostrarAviso('Sucesso', `Link de ${nome} copiado para a área de transferência!`);

      setTimeout(() => {
        _suppressPopstate = false;
      }, 100);
    }, 150);
  }
}

function copiarAoClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch((err) => {
      console.error('Erro ao copiar:', err);
      fallbackCopiarAoClipboard(text);
      throw err;
    });
  } else {
    fallbackCopiarAoClipboard(text);
    return Promise.resolve();
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

// ==============================================================================
// ✅ ATUALIZAR TOTAIS DO DASHBOARD (sem reload completo)
// Chamado após toggle de status PAGO/PENDENTE.
// ==============================================================================
async function atualizarTotais() {
  const month = parseInt(document.body.dataset.month, 10);
  const year = parseInt(document.body.dataset.year, 10);
  try {
    const res = await fetch(`/api/dashboard/totals?month=${month}&year=${year}`);
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

    // Atualiza resumo de pessoas
    if (totais.resumoPessoas) {
      totais.resumoPessoas.forEach((p) => {
        const spanResumo = document.getElementById('totalResumo_' + p.pessoa.replace(/\s/g, ''));
        if (spanResumo) spanResumo.textContent = formatarMoeda(p.total);
      });
    }

    // Atualiza totais de terceiros
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
    console.error('[atualizarTotais] Erro:', err);
  }
}

// ==============================================================================
// ✅ FUNÇÕES DE MODAL PARA CARTÃO E RENDAS (exportadas para window)
// ==============================================================================

async function abrirModalCartaoPessoa(nomePessoa) {
  const month = parseInt(document.body.dataset.month, 10);
  const year = parseInt(document.body.dataset.year, 10);


  // Ativar modal ANTES do fetch para feedback visual imediato
  registerModalOpen();
  const modal = document.getElementById('modalDetalhesCartao');
  if (modal) modal.classList.add('active');

  // Carregar dados do cartão via API
  try {
    const res = await fetch(`/api/cartao/${encodeURIComponent(nomePessoa)}?month=${month}&year=${year}`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const itens = await res.json();

    document.getElementById('tituloModalCartao').innerText = `Cartão - ${nomePessoa}`;
    document.getElementById('totalModalCartao').innerText = '';
    const container = document.getElementById('listaCartaoPessoaConteudo');
    container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Carregando...</td></tr>';

    if (itens.length === 0) {
      container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhum lançamento.</td></tr>';
      return;
    }

    const total = itens.reduce((acc, item) => acc + Number(item.valor), 0);
    document.getElementById('totalModalCartao').innerText =
      'R$ ' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

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

    // Reinicializar drag and drop (reset flags para permitir init nos novos elementos)
    if (typeof window.initDragAndDrop === 'function') {
      window.__rowDndInicializado = false;
      window.initDragAndDrop();
    }
    if (typeof window.initTouchDragAndDrop === 'function') {
      window.__touchDndInicializado = false;
      window.initTouchDragAndDrop();
    }
  } catch (err) {
    console.error('[abrirModalCartaoPessoa] Erro:', err);
    mostrarAviso('Erro', 'Não foi possível carregar os dados do cartão.');
  }
}

async function abrirModalRendasDetalhes() {
  const month = parseInt(document.body.dataset.month, 10);
  const year = parseInt(document.body.dataset.year, 10);

  registerModalOpen();
  const modal = document.getElementById('modalRendasDetalhes');
  if (modal) modal.classList.add('active');

  // Carregar dados de rendas via API
  try {
    const res = await fetch(`/api/rendas?month=${month}&year=${year}`);
    const dados = await res.json();

    const conteudo = document.getElementById('listaRendasConteudo');
    const rendas = Array.isArray(dados) ? dados : (dados.rendas || []);

    if (conteudo) {
      if (rendas.length === 0) {
        conteudo.innerHTML = '<div style="text-align:center; padding:20px;">Nenhuma renda encontrada.</div>';
      } else {
        let html = '';
        rendas.forEach(r => {
          const v = Number(r.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
          const safeDesc = escapeHTML(r.descricao).replace(/'/g, "\\'");
          const cat = escapeHTML(r.categoria || '').replace(/'/g, "\\'");
          const rawValor = String(r.valor).replace('.', ',');
          html += `<div class="renda-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-color, #eee);">
            <span>${escapeHTML(r.descricao)}</span>
            <span><strong>R$ ${v}</strong></span>
            <span>
              <span class="material-icons" role="button" tabindex="0" style="font-size:18px; cursor:pointer;" onclick="editarRenda(${r.id},'${safeDesc}','${rawValor}','${cat}')" data-tooltip="Editar renda">edit</span>
              <span class="material-icons" role="button" tabindex="0" style="font-size:18px; cursor:pointer;" onclick="confirmarExclusao(${r.id})" data-tooltip="Excluir renda">delete</span>
            </span>
          </div>`;
        });
        conteudo.innerHTML = html;
      }
    }
  } catch (err) {
    console.error('[abrirModalRendasDetalhes] Erro:', err);
    mostrarAviso('Erro', 'Não foi possível carregar os dados de rendas.');
  }
}

// ==============================================================================
// ✅ EVENT LISTENER PARA BOTÃO CONFIRMAR DIVISÃO
// ==============================================================================

const btnConfirmarDivisao = document.getElementById('btnConfirmarDivisao');
if (btnConfirmarDivisao) {
  btnConfirmarDivisao.addEventListener('click', async () => {
    const input = document.getElementById('inputTerceirosDivisao');
    const terceiros = input.value.split(',').map((t) => t.trim()).filter(Boolean);

    if (terceiros.length === 0) return;

    // Chamar confirmarDivisaoConta com as funções necessárias
    if (typeof confirmarDivisaoConta === 'function') {
      await confirmarDivisaoConta(mostrarLoading, ocultarLoading, mostrarAviso);
    }
  });
}

// Exportar para window (para compatibilidade com HTML inline)
window.abrirModalCartaoPessoa = abrirModalCartaoPessoa;
window.abrirModalRendasDetalhes = abrirModalRendasDetalhes;
window.atualizarTotais = atualizarTotais;

// ✅ OBS-20260706-01 a OBS-20260707-05: Exportacao global COMPLETA de TODAS as funcoes inline
// Modulos ES6 com type=module criam escopo proprio e nao expoe funcoes ao escopo global window,
// quebrando chamadas inline onfocus/onkeypress/onblur/onclick nos modals EJS.
window.abrirMenuContexto = abrirMenuContexto;
window.toggleParcelas = toggleParcelas;
window.compartilharLinkTerceiro = typeof compartilharLinkTerceiro !== 'undefined' ? compartilharLinkTerceiro : undefined;
window.copiarLinkCompartilhado = copiarLinkCompartilhado;
window.abrirLinkCompartilhado = abrirLinkCompartilhado;
// ✅ Variavel pessoaSelecionadaContexto precisa ser acessivel no window para EJS
Object.defineProperty(window, 'pessoaSelecionadaContexto', {
  get() { return typeof pessoaSelecionadaContexto !== 'undefined' ? pessoaSelecionadaContexto : null; },
  set(val) { pessoaSelecionadaContexto = val; },
  configurable: true,
  enumerable: true
});
window.mascaraParcela = typeof mascaraParcela !== 'undefined' ? mascaraParcela : undefined;
window.executarAcaoConferidoLote = typeof executarAcaoConferidoLote !== 'undefined' ? executarAcaoConferidoLote : undefined;
window.fecharModais = typeof fecharModais !== 'undefined' ? fecharModais : undefined;
window.checkBloqueioMesFechado = typeof checkBloqueioMesFechado !== 'undefined' ? checkBloqueioMesFechado : undefined;
window.fecharSidebar = fecharSidebar;
window.abrirSidebar = abrirSidebar;
window.fecharSidebarE = fecharSidebarE;
window.abrirModalCalcularLuz = typeof abrirModalCalcularLuz !== 'undefined' ? abrirModalCalcularLuz : undefined;
window.editarConta = typeof editarConta !== 'undefined' ? editarConta : undefined;
window.toggleRendas = typeof toggleRendas !== 'undefined' ? toggleRendas : undefined;
window.limparMascara = limparMascara;
window.handleEnterFatura = handleEnterFatura;
window.salvarFaturaManual = salvarFaturaManual;
window.mostrarLoading = typeof mostrarLoading !== 'undefined' ? mostrarLoading : undefined;
window.ocultarLoading = typeof ocultarLoading !== 'undefined' ? ocultarLoading : undefined;
window.executarAcaoEmLotePessoa = typeof executarAcaoEmLotePessoa !== 'undefined' ? executarAcaoEmLotePessoa : undefined;

// ✅ OBS-20260706-01 a OBS-20260707-05: Exportacoes globais COMPLETAS
// Corrige ReferenceError: copiarLinkCompartilhado, abrirLinkCompartilhado, pessoaSelecionadaContexto
window.copiarLinkCompartilhado = copiarLinkCompartilhado;
window.abrirLinkCompartilhado = abrirLinkCompartilhado;
// ✅ Variavel pessoaSelecionadaContexto precisa ser acessivel no window para EJS
Object.defineProperty(window, 'pessoaSelecionadaContexto', {
  get() { return typeof pessoaSelecionadaContexto !== 'undefined' ? pessoaSelecionadaContexto : null; },
  set(val) { pessoaSelecionadaContexto = val; },
  configurable: true,
  enumerable: true
});
window.fecharModalCompartilhar = fecharModalCompartilhar;
window.compartilharLinkTerceiro = typeof compartilharLinkTerceiro !== 'undefined' ? compartilharLinkTerceiro : undefined;
window.mascaraParcela = typeof mascaraParcela !== 'undefined' ? mascaraParcela : undefined;
window.executarAcaoConferidoLote = typeof executarAcaoConferidoLote !== 'undefined' ? executarAcaoConferidoLote : undefined;

// ✅ CORRECAO SIDEBAR (OBS-20260707): Exportar funcoes usadas em onclick inline do sidebar.ejs
globalThis.abrirModalAdicionar = abrirModalAdicionar;
globalThis.abrirModalConfiguracoes = abrirModalConfiguracoes;
globalThis.abrirConfirmacaoAcao = abrirConfirmacaoAcao;
globalThis.toggleMesFechado = toggleMesFechado;
globalThis.fecharModalAviso = fecharModalAviso;
globalThis.switchTab = switchTab;
globalThis.copiarAoClipboard = copiarAoClipboard;
globalThis.mostrarAviso = mostrarAviso;

// Exportacoes adicionais para handlers inline (OBS-20260707)
globalThis.fecharSidebar = fecharSidebar;
globalThis.fecharSidebarE = fecharSidebarE;
globalThis.abrirModalCalcularLuz = abrirModalCalcularLuz;
globalThis.fecharModalRegraSync = fecharModalRegraSync;
globalThis.toggleSyncFields = toggleSyncFields;
globalThis.wizardNextStep = wizardNextStep;
globalThis.wizardPrevStep = wizardPrevStep;
globalThis.toggleAllConferido = toggleAllConferido;
globalThis.fecharModais = fecharModais;
globalThis.fecharConfirmacaoAcao = fecharConfirmacaoAcao;
globalThis.fecharConfirmacao = fecharConfirmacao;
globalThis.toggleRendas = toggleRendas;
globalThis.togglePrivacidadeGlobal = togglePrivacidadeGlobal;
globalThis.mascaraParcela = mascaraParcela;
globalThis.fecharModalCompartilhar = fecharModalCompartilhar;
globalThis.abrirLinkCompartilhado = abrirLinkCompartilhado;
globalThis.copiarLinkCompartilhado = copiarLinkCompartilhado;
globalThis.executarAcaoConferidoLote = executarAcaoConferidoLote;
globalThis.compartilharLinkTerceiro = compartilharLinkTerceiro;
globalThis.abrirModalCartaoPessoa = abrirModalCartaoPessoa;
globalThis.abrirModalRendasDetalhes = abrirModalRendasDetalhes;

function formatarValor(valor) {
  return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

