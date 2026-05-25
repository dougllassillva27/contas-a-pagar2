(function() {
  'use strict';

  const hotkeyInput = document.getElementById('hotkey');
  const configForm = document.getElementById('configForm');
  const autoStartInput = document.getElementById('autoStart');
  const autoCloseOnSuccessInput = document.getElementById('autoCloseOnSuccess');
  const btnClose = document.getElementById('btnClose');
  const loading = document.getElementById('loading');
  const statusMessage = document.getElementById('statusMessage');
  const statusMessageText = document.getElementById('statusMessageText');
  const errorHotkey = document.getElementById('error-hotkey');

  let isSubmitting = false;

  function adjustWindowHeight() {
    if (!window.widgetAPI?.resizeWindow) return;
    setTimeout(() => {
      const modal = document.querySelector('.modal-container');
      if (modal) {
        // Altura do modal + padding do body (16px top + 16px bottom = 32px)
        const totalHeight = modal.offsetHeight + 32;
        window.widgetAPI.resizeWindow(totalHeight);
      }
    }, 10);
  }

  // Carrega as configurações de disco e atualiza a tela
  async function loadCurrentConfig() {
    if (!window.widgetAPI?.getConfig) return;
    try {
      const config = await window.widgetAPI.getConfig();
      hotkeyInput.value = config.hotkey || 'Ctrl+Alt+N';
      autoStartInput.checked = config.autoStart || false;
      autoCloseOnSuccessInput.checked = config.autoCloseOnSuccess !== false;
      adjustWindowHeight();
    } catch (err) {
      console.error('[Config JS] Erro ao buscar configs:', err);
    }
  }

  // Carga inicial
  loadCurrentConfig();

  // Escuta seletor focus-config (IPC vindo do main ao abrir)
  if (window.widgetAPI?.onFocusConfig) {
    window.widgetAPI.onFocusConfig(() => {
      errorHotkey.textContent = '';
      hotkeyInput.classList.remove('error');
      loadCurrentConfig();
      adjustWindowHeight();
    });
  }

  // Capturador Inteligente de Atalho Global (Teclado)
  hotkeyInput.addEventListener('keydown', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Limpa se apertar Backspace ou Delete
    if (e.key === 'Backspace' || e.key === 'Delete') {
      hotkeyInput.value = '';
      return;
    }

    // Ignora teclas modificadoras isoladas
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      return;
    }

    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    // Converte e padroniza o nome das teclas
    let keyName = e.key.toUpperCase();
    if (keyName === 'ARROWUP') keyName = 'Up';
    if (keyName === 'ARROWDOWN') keyName = 'Down';
    if (keyName === 'ARROWLEFT') keyName = 'Left';
    if (keyName === 'ARROWRIGHT') keyName = 'Right';
    if (keyName === ' ') keyName = 'Space';

    // Atalhos precisam obrigatoriamente de modificadores
    if (parts.length === 0) {
      return;
    }

    parts.push(keyName);
    hotkeyInput.value = parts.join('+');
  });

  // Salva no formulário
  configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!hotkeyInput.value.trim()) {
      errorHotkey.textContent = 'Campo obrigatório';
      hotkeyInput.classList.add('error');
      adjustWindowHeight();
      return;
    } else {
      errorHotkey.textContent = '';
      hotkeyInput.classList.remove('error');
      adjustWindowHeight();
    }

    isSubmitting = true;
    loading.classList.remove('hidden');

    const updates = {
      hotkey: hotkeyInput.value.trim(),
      autoStart: autoStartInput.checked,
      autoCloseOnSuccess: autoCloseOnSuccessInput.checked
    };

    try {
      const res = await window.widgetAPI.saveConfig(updates);
      if (res.success) {
        showStatus('✅ Configurações salvas!', 'success');
        setTimeout(() => {
          closeConfig();
        }, 1500);
      } else {
        showStatus(`❌ ${res.error}`, 'error');
      }
    } catch (err) {
      console.error('[Config JS] Erro ao salvar:', err);
      showStatus('❌ Erro de comunicação.', 'error');
    } finally {
      loading.classList.add('hidden');
      isSubmitting = false;
    }
  });

  function showStatus(msg, type) {
    statusMessageText.textContent = msg;
    statusMessage.className = `status-overlay ${type}`;
    statusMessage.classList.remove('hidden');
    adjustWindowHeight();
    setTimeout(() => {
      statusMessage.classList.add('hidden');
      adjustWindowHeight();
    }, 2500);
  }

  function closeConfig() {
    if (window.widgetAPI?.closeConfig) {
      window.widgetAPI.closeConfig();
    }
  }

  btnClose.addEventListener('click', closeConfig);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeConfig();
    }
  });
})();
