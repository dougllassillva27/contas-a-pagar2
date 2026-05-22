(function() {
  'use strict';
  
  const form = document.getElementById('lancamentoForm');
  const btnClose = document.getElementById('btnClose');
  const btnSubmit = document.getElementById('btnSubmit');
  const loading = document.getElementById('loading');
  const statusMessage = document.getElementById('statusMessage');
  const statusMessageText = document.getElementById('statusMessageText');
  
  const usuarioInput = document.getElementById('usuario_id');
  const btnDodo = document.getElementById('btnDodo');
  const btnVitoria = document.getElementById('btnVitoria');
  
  const tipoInput = document.getElementById('tipo');
  const btnFixa = document.getElementById('btnFixa');
  const btnUnica = document.getElementById('btnUnica');
  const btnParcelada = document.getElementById('btnParcelada');
  
  const parcelasGroup = document.getElementById('parcelasGroup');
  const parcelasInput = document.getElementById('parcelas');
  const descricaoInput = document.getElementById('descricao');
  const valorInput = document.getElementById('valor');
  
  let isSubmitting = false;
  let isClosing = false;

  // Converte valor digitado ("100", "100,50", "R$ 1.000,00") para float
  function parseValorParaApi(v) {
    // Remove R$, espaços e pontos de milhar
    let l = v.replace(/[R$\s.]/g, '');
    // Troca vírgula por ponto decimal
    l = l.replace(',', '.');
    return parseFloat(l) || 0;
  }

  function validarObrigatorio(input, errEl) {
    if (isClosing) return true;
    if (!input.value.trim()) {
      errEl.textContent = 'Campo obrigatório';
      input.classList.add('error');
      return false;
    }
    errEl.textContent = '';
    input.classList.remove('error');
    return true;
  }

  function validarValor(input, errEl) {
    if (isClosing) return true;
    const v = input.value.trim();
    if (!v) return validarObrigatorio(input, errEl);
    
    // Regex simplificada para aceitar números simples, decimais com vírgula, e opcionalmente R$
    const regex = /^(?:R\$?\s*)?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$/;
    if (!regex.test(v)) {
      errEl.textContent = 'Formato inválido. Ex: 100,00 ou 150';
      input.classList.add('error');
      return false;
    }
    
    const val = parseValorParaApi(v);
    if (val <= 0) {
      errEl.textContent = 'O valor deve ser maior que zero';
      input.classList.add('error');
      return false;
    }
    
    errEl.textContent = '';
    input.classList.remove('error');
    return true;
  }

  function closeModal() {
    isClosing = true;
    if (document.activeElement) document.activeElement.blur();

    form.reset();
    statusMessage.classList.add('hidden');
    parcelasGroup.classList.add('hidden');
    parcelasInput.required = false;
    
    document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    
    if (window.widgetAPI?.resizeWindow) window.widgetAPI.resizeWindow(700);
    if (window.widgetAPI?.hideWindow) window.widgetAPI.hideWindow();

    setTimeout(() => { isClosing = false; }, 200);
  }

  btnClose.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  });

  function selecionarUsuario(uid, btn) {
    usuarioInput.value = uid;
    [btnDodo, btnVitoria].forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  btnDodo.addEventListener('click', () => selecionarUsuario(1, btnDodo));
  btnVitoria.addEventListener('click', () => selecionarUsuario(2, btnVitoria));

  function selecionarTipo(tipoStr, btn) {
    tipoInput.value = tipoStr;
    [btnFixa, btnUnica, btnParcelada].forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    if (tipoStr === 'parcelada') {
      parcelasGroup.classList.remove('hidden');
      parcelasInput.required = true;
      if (window.widgetAPI?.resizeWindow) window.widgetAPI.resizeWindow(810);
    } else {
      parcelasGroup.classList.add('hidden');
      parcelasInput.required = false;
      parcelasInput.value = '';
      if (window.widgetAPI?.resizeWindow) window.widgetAPI.resizeWindow(700);
    }
  }

  btnFixa.addEventListener('click', () => selecionarTipo('fixa', btnFixa));
  btnUnica.addEventListener('click', () => selecionarTipo('unica', btnUnica));
  btnParcelada.addEventListener('click', () => selecionarTipo('parcelada', btnParcelada));

  parcelasInput.addEventListener('input', (e) => {
    let v = e.target.value.replace(/[^\d/]/g, '');
    if (!v.includes('/') && v.length > 2) {
        v = v.slice(0, 2) + '/' + v.slice(2);
    }
    e.target.value = v;
  });

  descricaoInput.addEventListener('blur', () => validarObrigatorio(descricaoInput, document.getElementById('error-descricao')));
  valorInput.addEventListener('blur', () => validarValor(valorInput, document.getElementById('error-valor')));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    isSubmitting = true;
    btnSubmit.disabled = true;
    const errors = [];
    
    if (!validarObrigatorio(descricaoInput, document.getElementById('error-descricao'))) errors.push('descrição');
    if (!validarValor(valorInput, document.getElementById('error-valor'))) errors.push('valor');
    if (!validarObrigatorio(tipoInput, document.getElementById('error-tipo'))) errors.push('tipo');
    
    if (errors.length > 0) {
      showStatus(`Corrija: ${errors.join(', ')}`, 'error');
      isSubmitting = false;
      btnSubmit.disabled = false;
      return;
    }
    
    loading.classList.remove('hidden');
    statusMessage.classList.add('hidden');
    
    const payload = {
      usuario_id: parseInt(usuarioInput.value, 10),
      descricao: descricaoInput.value.trim(),
      valor: valorInput.value.trim(),
      tipo: tipoInput.value,
      terceiro: document.getElementById('terceiro').value.trim() || null,
      parcelas: tipoInput.value === 'parcelada' ? parcelasInput.value.trim() : ''
    };

    try {
      const result = await window.widgetAPI.submitLancamento(payload);
      if (result.success) {
        showStatus('✅ Lançamento confirmado!', 'success');
        form.reset();
        parcelasGroup.classList.add('hidden');
        parcelasInput.required = false;
        setTimeout(() => closeModal(), 1500);
      } else {
        showStatus(`❌ ${result.error}`, 'error');
      }
    } catch (err) {
      console.error('[Form] Erro:', err);
      showStatus('❌ Erro de comunicação.', 'error');
    } finally {
      loading.classList.add('hidden');
      isSubmitting = false;
      btnSubmit.disabled = false;
    }
  });

  function showStatus(msg, type) {
    statusMessageText.textContent = msg;
    statusMessage.className = `status-overlay ${type}`;
    statusMessage.classList.remove('hidden');
    if (type === 'success') {
      setTimeout(() => statusMessage.classList.add('hidden'), 3000);
    }
  }

  if (window.widgetAPI?.onFocusForm) {
    window.widgetAPI.onFocusForm(() => {
      isClosing = true;
      document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
      document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
      setTimeout(() => { isClosing = false; }, 100);

      descricaoInput.focus();
      descricaoInput.select();
    });
  }

  setTimeout(() => descricaoInput.focus(), 100);
  console.log('[Widget Form] Inicializado');
})();