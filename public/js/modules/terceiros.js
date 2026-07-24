// ==============================================================================
// ✅ TERCEIROS — Modal exclusão pessoa
// ==============================================================================

import { softRefresh } from './dashboard.js';
import { softRefreshCache } from './shared.js';

export function confirmarExclusaoPessoa(pessoaSelecionadaContexto, checkBloqueioMesFechado, fecharMenuContexto, registerModalOpen, mostrarLoading, ocultarLoading, mostrarAviso, fecharModais) {
  // Fallback para inline onclick que nao passa os DI params
  pessoaSelecionadaContexto = pessoaSelecionadaContexto || window.pessoaSelecionadaContexto;
  checkBloqueioMesFechado = checkBloqueioMesFechado || (typeof window.checkBloqueioMesFechado === 'function' ? window.checkBloqueioMesFechado : () => false);
  fecharMenuContexto = fecharMenuContexto || (typeof window.fecharMenuContexto === 'function' ? window.fecharMenuContexto : () => {});
  registerModalOpen = registerModalOpen || (typeof window.registerModalOpen === 'function' ? window.registerModalOpen : () => {});
  mostrarLoading = mostrarLoading || (typeof window.mostrarLoading === 'function' ? window.mostrarLoading : () => {});
  ocultarLoading = ocultarLoading || (typeof window.ocultarLoading === 'function' ? window.ocultarLoading : () => {});
  mostrarAviso = mostrarAviso || (typeof window.mostrarAviso === 'function' ? window.mostrarAviso : () => {});
  fecharModais = fecharModais || (typeof window.fecharModais === 'function' ? window.fecharModais : () => {});

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

  let acaoConfirmadaCallback = async () => {
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
        softRefreshCache.clear();
        await softRefresh(undefined, false);
        fecharModais();
        ocultarLoading();
      }
    } catch (e) {
      ocultarLoading();
      mostrarAviso('Erro', 'Erro de rede.');
    }
  };
  modal.classList.add('active');
  return acaoConfirmadaCallback;
}
