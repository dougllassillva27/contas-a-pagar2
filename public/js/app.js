// ==============================================================================
// ✅ public/js/app.js — Entry point (ES6 modules)
// Atualizado: 2026-07-02 - Forçando novo hash para corrigir erro refreshOnDelete
// ==============================================================================

// Variáveis globais devem vir PRIMEIRO, antes de qualquer import
window.isBackNavigation = false;

import { softRefresh, softRefreshSafe, atualizarTotalNaoConferido, fazerBackup, refreshOnInsert, refreshOnDelete } from './modules/dashboard.js?v=e75b53e0';
import {
  executarAcaoEmLotePessoa,
  confirmarExclusaoPessoa,
  moverMes,
  moverLoteUltimas,
  abrirModalDividirConta,
  fecharModalDividirConta,
  confirmarDivisaoConta,
  confirmarExclusaoLoteUltimas,
  alternarConferido,
  confirmarExclusao,
  enviarLancamento,
  abrirModalUltimas,
  alternarStatus,
  atualizarBulkCounterNative,
  executarCopia,
  executarDeleteMes
} from './modules/lancamentos.js';
import { isAnotacaoGlobal, carregarAnotacoes, alternarAbaAnotacao, alternarModoAnotacao, renderAnotacoesPreview, toggleChecklist, inserirFormatacao, salvarAnotacao, initAnotacoes } from './modules/anotacoes.js';
import { salvarConfiguracoes, getRegrasSync, renderizarRegrasSync, editarRegraSync, confirmarDeletarRegraSync, salvarRegraSync, deletarRegraSync, finalizarWizard, finalizarWizardSozinho, concluirOnboarding } from './modules/configuracoes.js';
import { showCustomTooltip, hideCustomTooltip, initTooltipListeners } from './modules/tooltips.js';

// Expõe funções globalmente para compatibilidade com EJS templates
Object.assign(window, {
  softRefresh,
  softRefreshSafe,
  atualizarTotalNaoConferido,
  fazerBackup,
  executarAcaoEmLotePessoa,
  confirmarExclusaoPessoa,
  moverMes,
  moverLoteUltimas,
  abrirModalDividirConta,
  fecharModalDividirConta,
  confirmarDivisaoConta,
  confirmarExclusaoLoteUltimas,
  alternarConferido,
  confirmarExclusao,
  enviarLancamento,
  abrirModalUltimas,
  alternarStatus,
  atualizarBulkCounterNative,
  executarCopia,
  executarDeleteMes,
  carregarAnotacoes,
  alternarAbaAnotacao,
  alternarModoAnotacao,
  renderAnotacoesPreview,
  toggleChecklist,
  inserirFormatacao,
  salvarAnotacao,
  salvarConfiguracoes,
  getRegrasSync,
  renderizarRegrasSync,
  editarRegraSync,
  salvarRegraSync,
  deletarRegraSync,
  finalizarWizard,
  finalizarWizardSozinho,
  concluirOnboarding,
  showCustomTooltip,
  hideCustomTooltip,
});

// Variáveis globais mínimas
let isSubmitting = false;
window.resetSubmitting = () => { isSubmitting = false; };

// Inicializa tooltips nos checkboxes do header
initTooltipListeners();

// Garante que a aba Global das anotações inicie ativa
window.addEventListener('DOMContentLoaded', () => {
  const btnGlobal = document.getElementById('btnAnotacaoGlobal');
  const btnMensal = document.getElementById('btnAnotacaoMensal');

  if (btnGlobal && btnMensal) {
    btnGlobal.classList.add('active');
    btnMensal.classList.remove('active');
    carregarAnotacoes();
  }
});

// Service Worker cleanup (localhost only)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}

// Registrar funções de refresh no window para acesso global
window.refreshOnInsert = refreshOnInsert;
window.refreshOnDelete = refreshOnDelete;
