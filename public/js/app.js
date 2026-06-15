// ==============================================================================
// ✅ public/js/app.js — Entry point (ES6 modules)
// ==============================================================================

// Variáveis globais devem vir PRIMEIRO, antes de qualquer import
window.isBackNavigation = false;

import { softRefresh, softRefreshSafe, atualizarTotalNaoConferido, fazerBackup } from './modules/dashboard.js';
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
import { isAnotacaoGlobal, carregarAnotacoes, alternarAbaAnotacao, alternarModoAnotacao, renderAnotacoesPreview, toggleChecklist, inserirFormatacao, salvarAnotacao } from './modules/anotacoes.js';
import { salvarConfiguracoes, getRegrasSync, renderizarRegrasSync, salvarRegraSync, deletarRegraSync, finalizarWizard, finalizarWizardSozinho, concluirOnboarding } from './modules/configuracoes.js';

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
  salvarRegraSync,
  deletarRegraSync,
  finalizarWizard,
  finalizarWizardSozinho,
  concluirOnboarding,
});

// Variáveis globais mínimas
let isSubmitting = false;
window.resetSubmitting = () => { isSubmitting = false; };

// Expõe funções adicionais para templates EJS inline
Object.assign(window, {
  // ... já exportadas acima
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
