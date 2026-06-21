// ==============================================================================
// ✅ LANÇAMENTOS — Mover mês, dividir conta, exclusões, status toggle
// ==============================================================================

import { softRefresh, softRefreshSafe, atualizarTotalNaoConferido, getCurrentMonth, getCurrentYear } from './dashboard.js';
import { escapeHTML, softRefreshCache } from './shared.js';

export function alternarStatus(checkbox, id) {
  const novoStatus = checkbox.checked ? 'PAGO' : 'PENDENTE';
  const row = checkbox.closest('tr');

  fetch(`/api/lancamentos/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: novoStatus }),
  })
  .then(res => {
    if (res.status === 401 || res.status === 403) {
      // Sessão expirada - redireciona para login
      window.location.href = '/login';
      return;
    }
    if (!res.ok) {
      checkbox.checked = !checkbox.checked;
      return;
    }
    if (row) {
      if (checkbox.checked) row.classList.add('linha-paga');
      else row.classList.remove('linha-paga');
    }
    // Atualiza totais via função global
    if (typeof window.atualizarTotais === 'function') window.atualizarTotais();
  })
  .catch(err => {
    checkbox.checked = !checkbox.checked;
    console.error(err);
  });
}

export function atualizarBulkCounterNative(input) {
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
}

export async function executarAcaoEmLotePessoa(novoStatus, pessoaSelecionadaContexto, currentMonth, currentYear) {
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
    if (res.ok) {
      softRefreshCache.clear();
      await softRefresh(undefined, false);
      // ✅ Fecha o menu de contexto após ação bem-sucedida
      if (typeof window.fecharMenuContexto === 'function') {
        window.fecharMenuContexto();
      }
    } else {
      mostrarAviso('Erro', 'Falha ao atualizar lote.');
    }
  } catch (err) {
    console.error(err);
  }
}

export function confirmarExclusaoPessoa(pessoaSelecionadaContexto, checkBloqueioMesFechado, fecharMenuContexto, registerModalOpen, mostrarLoading, ocultarLoading, mostrarAviso, fecharModais) {
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

export async function moverMes(e, ids, direcao, checkBloqueioMesFechado, mostrarLoading, ocultarLoading, mostrarAviso) {
  if (e) e.stopPropagation();
  // Fallback para inline onclick que nao passa os DI params
  checkBloqueioMesFechado = checkBloqueioMesFechado || (typeof window.checkBloqueioMesFechado === 'function' ? window.checkBloqueioMesFechado : () => false);
  mostrarLoading = mostrarLoading || (typeof window.mostrarLoading === 'function' ? window.mostrarLoading : () => {});
  ocultarLoading = ocultarLoading || (typeof window.ocultarLoading === 'function' ? window.ocultarLoading : () => {});
  mostrarAviso = mostrarAviso || (typeof window.mostrarAviso === 'function' ? window.mostrarAviso : () => {});
  const fecharModais = typeof window.fecharModais === 'function' ? window.fecharModais : () => {};
  if (checkBloqueioMesFechado()) return;
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
      // Fecha modal primeiro para feedback visual imediato
      fecharModais();
      softRefreshCache.clear();
      await softRefresh(undefined, false);
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

export function moverLoteUltimas(fecharMenuContexto) {
  fecharMenuContexto();
  const selectedRows = document.querySelectorAll('#listaUltimasConteudo tr.selected-row');
  const ids = Array.from(selectedRows).map((tr) => Number(tr.dataset.id));
  if (ids.length === 0) return;
  // moverMes chamado externamente
}

let _idContaDividir = null;
let _valorContaDividir = 0;

export function abrirModalDividirConta(fecharMenuContexto, registerModalOpen, fecharModais) {
  fecharMenuContexto();
  const selectedRow = document.querySelector('#listaUltimasConteudo tr.selected-row');
  if (!selectedRow) return;

  _idContaDividir = Number(selectedRow.dataset.id);
  const celValor = selectedRow.querySelector('.col-valor');
  if (celValor) {
    _valorContaDividir = parseFloat(celValor.textContent.replace(/[^0-9,-]/g, '').replace(',', '.')) || 0;
  }

  const resumo = document.getElementById('dividirContaResumo');
  const input = document.getElementById('inputTerceirosDivisao');
  const preview = document.getElementById('dividirContaPreview');
  const btnConfirmar = document.getElementById('btnConfirmarDivisao');

  resumo.textContent = `Conta de ${_valorContaDividir.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
  input.value = '';
  preview.textContent = '';
  btnConfirmar.disabled = true;

  document.getElementById('modalDividirConta').classList.add('active');
  registerModalOpen();
  const modalUltimas = document.getElementById('modalUltimasAdicoes');
  if (modalUltimas) modalUltimas.classList.remove('active');
  setTimeout(() => input.focus(), 100);
}

export function fecharModalDividirConta() {
  document.getElementById('modalDividirConta').classList.remove('active');
  _idContaDividir = null;
  _valorContaDividir = 0;
}

export async function confirmarDivisaoConta(mostrarLoading, ocultarLoading, mostrarAviso) {
  const input = document.getElementById('inputTerceirosDivisao');
  const terceiros = input.value.split(',').map((t) => t.trim()).filter(Boolean);

  const idParaDividir = _idContaDividir;
  if (terceiros.length === 0 || !idParaDividir) return;

  mostrarLoading();

  try {
    const res = await fetch('/api/lancamentos/dividir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idOriginal: idParaDividir, terceiros }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // Limpar cache ANTES do refresh para garantir dados frescos
      softRefreshCache.clear();
      fecharModalDividirConta();
      ocultarLoading();
      await softRefreshSafe(800, false);
      mostrarAviso('Sucesso', 'Conta dividida com sucesso!');
      return;
    } else {
      const msgMap = {
        'Conta não encontrada ou não pertence ao usuário.': 'Conta não encontrada.',
        'Informe pelo menos um terceiro válido para divisão.': 'Nenhum terceiro válido informado.',
        'Limite de 20 terceiros por divisão excedido.': 'Limite de 20 terceiros excedido.',
        'Valor da conta deve ser maior que zero para divisão.': 'Valor insuficiente para divisão.',
      };
      const msgAmigavel = msgMap[data.error] || data.error || 'Erro desconhecido.';
      mostrarAviso('Erro', msgAmigavel);
    }
  } catch (err) {
    console.error('[confirmarDivisaoConta]', err);
    mostrarAviso('Erro', 'Erro de conexão ao dividir conta.');
  } finally {
    ocultarLoading();
  }
}

export function confirmarExclusaoLoteUltimas() {
  const fecharMenuContexto = typeof window.fecharMenuContexto === 'function' ? window.fecharMenuContexto : () => {};
  const registerModalOpen = typeof window.registerModalOpen === 'function' ? window.registerModalOpen : () => {};
  const mostrarLoading = typeof window.mostrarLoading === 'function' ? window.mostrarLoading : () => {};
  const ocultarLoading = typeof window.ocultarLoading === 'function' ? window.ocultarLoading : () => {};
  const mostrarAviso = typeof window.mostrarAviso === 'function' ? window.mostrarAviso : () => {};

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

  window.acaoConfirmadaCallback = async () => {
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
        // Limpar cache ANTES do refresh para garantir dados frescos
        softRefreshCache.clear();
        selectedRows.forEach((tr) => tr.remove());
        atualizarTotalNaoConferido();

        // Fechar modal de confirmação
        const modal = document.getElementById('modalConfirmacaoAcao');
        if (modal) modal.classList.remove('active');

        ocultarLoading();
        mostrarAviso('Sucesso', `${ids.length} itens excluídos.`);

        // Refresh imediato sem delay
        await softRefresh(undefined, false);
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

export async function alternarConferido(checkbox, id) {
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

export function confirmarExclusao(id) {
  const registerModalOpen = typeof window.registerModalOpen === 'function' ? window.registerModalOpen : () => {};
  registerModalOpen();
  window.idExcluir = id;
  document.getElementById('modalConfirmar').classList.add('active');
}

export async function enviarLancamento(e, tipoTransacao) {
  let isSubmitting = false;
  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();
  const checkBloqueioMesFechado = typeof window.checkBloqueioMesFechado === 'function' ? window.checkBloqueioMesFechado : () => false;
  const mostrarAviso = typeof window.mostrarAviso === 'function' ? window.mostrarAviso : () => {};
  const softRefresh = typeof window.softRefresh === 'function' ? window.softRefresh : () => {};
  const fecharModais = typeof window.fecharModais === 'function' ? window.fecharModais : () => {};
  const ocultarLoading = typeof window.ocultarLoading === 'function' ? window.ocultarLoading : () => {};

  e.preventDefault();
  if (isSubmitting) return;
  isSubmitting = true;

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
  }

  try {
    const id = (tipoTransacao === 'RENDA' ? document.getElementById('rendaId') : document.getElementById('contaId')).value;

    if (!id && checkBloqueioMesFechado()) {
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
      }
      return;
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
      // Limpar cache ANTES do refresh para garantir dados frescos
      softRefreshCache.clear();

      // Aguardar refresh COM loading visível
      if (responseData.criados) {
        await softRefreshSafe(1500, false);
        fecharModais();
        ocultarLoading();
        mostrarAviso('Sucesso', `${responseData.criados} contas lançadas com sucesso!`);
      } else {
        await softRefreshSafe(1500, false);
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

export async function abrirModalUltimas() {
  const registerModalOpen = typeof window.registerModalOpen === 'function' ? window.registerModalOpen : () => {};
  const mostrarLoading = typeof window.mostrarLoading === 'function' ? window.mostrarLoading : () => {};
  const ocultarLoading = typeof window.ocultarLoading === 'function' ? window.ocultarLoading : () => {};
  const mostrarAviso = typeof window.mostrarAviso === 'function' ? window.mostrarAviso : () => {};
  const softRefresh = typeof window.softRefresh === 'function' ? window.softRefresh : () => {};
  const initDragAndDrop = typeof window.initDragAndDrop === 'function' ? window.initDragAndDrop : () => {};
  const initTouchDragAndDrop = typeof window.initTouchDragAndDrop === 'function' ? window.initTouchDragAndDrop : () => {};

  registerModalOpen();
  document.getElementById('modalUltimasContas').classList.add('active');

  const loadingHtml = '<tr><td colspan="6" style="text-align:center; padding:20px;">Carregando...</td></tr>';
  const tbody = document.getElementById('listaUltimasConteudo');
  tbody.innerHTML = loadingHtml;

  try {
    const res = await fetch('/api/lancamentos/recentes');
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhum registro recente.</td></tr>';
      return;
    }

    let html = '';
    const currentUserName = document.body.dataset.username || 'Usuário';
    data.forEach((item) => {
      const quem = escapeHTML(item.nometerceiro || currentUserName);
      const valorCurrency = Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const descText = escapeHTML(item.descricao) + (item.parcelaatual ? ` (${item.parcelaatual}/${item.totalparcelas})` : '');

      let badgeCmp = '';
      if (item.datavencimento) {
        const dtCmp = new Date(item.datavencimento);
        dtCmp.setHours(12);
        if (!isNaN(dtCmp.getTime())) {
          const mesesShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          const nomeMes = mesesShort[dtCmp.getMonth()];
          const anoCurto = String(dtCmp.getFullYear()).slice(-2);
          badgeCmp = `<span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.15); color: #60A5FA; white-space: nowrap; flex-shrink: 0;" title="Mês de Competência">${nomeMes}/${anoCurto}</span>`;
        }
      }

      const tipoConta = getTipoExibicao(item);
      const badgeTipo = `<span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #473720; color: #fff; white-space: nowrap; flex-shrink: 0;" title="Tipo de Conta">${tipoConta}</span>`;

      const descHTML = `<div style="display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;"><span>${descText}</span>${badgeCmp}${badgeTipo}</div>`;

      const dt = item.datacriacao ? new Date(item.datacriacao) : null;
      const inseridoEm = dt ? `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}` : '--/--/----';

      const safeDesc = escapeHTML(item.descricao || '').replace(/'/g, "\\'");
      const safePessoa = escapeHTML(item.nometerceiro || '').replace(/'/g, "\\'");

      const pAtual = item.parcelaatual || '';
      const pTotal = item.totalparcelas || '';
      const valorSemMoeda = Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

      const isConferido = item.conferido === true;
      const classeConferido = isConferido ? ' conferido' : '';
      const classeUltima = item.parcelaatual && item.totalparcelas && item.parcelaatual === item.totalparcelas && item.totalparcelas > 1 ? ' ultima-parcela' : '';
      const titleUltima = classeUltima ? ' data-tooltip="Última parcela ✅"' : '';

      html += `<tr style="border-bottom: 1px solid rgba(255,0.05); cursor: pointer;" class="${classeConferido}${classeUltima}" data-id="${item.id}" onclick="toggleRowSelection(event, this)">
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
    ocultarLoading();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color: var(--red);">Erro ao carregar.</td></tr>';
    ocultarLoading();
  }
}

export async function executarCopia() {
  // Fecha o modal de confirmação antes de iniciar
  const modalConfirmacao = document.getElementById('modalConfirmacaoAcao');
  if (modalConfirmacao) modalConfirmacao.classList.remove('active');

  try {
    const currentMonth = getCurrentMonth();
    const currentYear = getCurrentYear();


    if (typeof window.mostrarLoading === 'function') window.mostrarLoading();

    const res = await fetch('/api/lancamentos/copiar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: currentMonth, year: currentYear })
    });

    const data = await res.json();


    if (typeof window.ocultarLoading === 'function') window.ocultarLoading();

    if (data.success) {
      if (typeof window.mostrarAviso === 'function') {
        window.mostrarAviso('Sucesso', 'Contas copiadas com sucesso!');
        // Aguarda o usuário clicar OK antes de fazer refresh
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      softRefreshCache.clear();
      await softRefresh(undefined, false);
    } else {
      if (typeof window.mostrarAviso === 'function') {
        window.mostrarAviso('Erro', data.error || 'Falha ao copiar contas.');
      }
    }
  } catch (err) {
    console.error('[executarCopia] Erro:', err);
    if (typeof window.ocultarLoading === 'function') window.ocultarLoading();
    if (typeof window.mostrarAviso === 'function') {
      window.mostrarAviso('Erro', 'Erro de conexão ao copiar contas.');
    }
  }
}

export async function executarDeleteMes() {
  // Fecha o modal de confirmação antes de iniciar
  const modalConfirmacao = document.getElementById('modalConfirmacaoAcao');
  if (modalConfirmacao) modalConfirmacao.classList.remove('active');

  try {
    const currentMonth = getCurrentMonth();
    const currentYear = getCurrentYear();


    if (typeof window.mostrarLoading === 'function') window.mostrarLoading();

    const res = await fetch(`/api/lancamentos/mes?month=${currentMonth}&year=${currentYear}`, {
      method: 'DELETE'
    });

    const data = await res.json();


    if (typeof window.ocultarLoading === 'function') window.ocultarLoading();

    if (data.success) {
      if (typeof window.mostrarAviso === 'function') {
        window.mostrarAviso('Sucesso', 'Mês deletado com sucesso!');
        // Aguarda o usuário clicar OK antes de fazer refresh
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      softRefreshCache.clear();
      await softRefresh(undefined, false);
    } else {
      if (typeof window.mostrarAviso === 'function') {
        window.mostrarAviso('Erro', data.error || 'Falha ao deletar mês.');
      }
    }
  } catch (err) {
    console.error('[executarDeleteMes] Erro:', err);
    if (typeof window.ocultarLoading === 'function') window.ocultarLoading();
    if (typeof window.mostrarAviso === 'function') {
      window.mostrarAviso('Erro', 'Erro de conexão ao deletar mês.');
    }
  }
}
