// ==============================================================================
// ✅ public/js/ui.js — Gerenciamento de Modais, Interações e Eventos DOM
// ==============================================================================

function registerModalOpen() {
  if (document.activeElement) document.activeElement.blur();
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
    else if (activeModal.id === 'modalConfiguracoes') fecharModalConfiguracoes();
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
    window.open(`/terceiros?month=${currentMonth}&year=${currentYear}`, '_blank');
  }
  if (e.altKey && e.key.toLowerCase() === 'b') {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    e.preventDefault();
    fazerBackup();
  }
  if (e.altKey && e.code === 'KeyI') {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    e.preventDefault();
    window.open(`/relatorio?month=${currentMonth}&year=${currentYear}`, '_blank');
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
  document.querySelectorAll('th input[type="checkbox"]').forEach((checkbox) => {
    checkbox.setAttribute('data-tooltip', 'Marcar todas como já calculadas');
    checkbox.setAttribute('data-tooltip-dir', 'bottom-right');
  });
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

function fecharModais() {
  handleModalClose();
  document.querySelectorAll('.modal-overlay').forEach((m) => {
    if (m.id !== 'modalLoading') m.classList.remove('active');
  });
  setTimeout(() => {
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
  }, 300);
}

function fecharModalAviso() {
  handleModalClose();
  document.getElementById('modalAviso').classList.remove('active');
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

  mostrarLoading();
  try {
    const res = await fetch(`/api/terceiros/${encodeURIComponent(nome)}/token`);
    const data = await res.json();
    ocultarLoading();

    urlCompartilhamentoContexto = `${window.location.origin}/contas/${data.token}?month=${currentMonth}&year=${currentYear}`;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      copiarAoClipboard(urlCompartilhamentoContexto);
      mostrarAviso('Link copiado!', urlCompartilhamentoContexto);
    } else {
      const nomeEl = document.getElementById('nomePessoaShare');
      if (nomeEl) nomeEl.innerText = nome;

      registerModalOpen();
      document.getElementById('modalCompartilhar').classList.add('active');
    }
  } catch (err) {
    ocultarLoading();
    mostrarAviso('Erro', 'Não foi possível gerar o link de compartilhamento.');
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
    copiarAoClipboard(urlCompartilhamentoContexto);
    fecharModalCompartilhar();
    mostrarAviso('Sucesso', 'Link copiado para a área de transferência!');
  }
}

function copiarAoClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error('Erro ao copiar: ', err);
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

