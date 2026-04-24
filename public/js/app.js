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
        setTimeout(() => window.location.reload(), 3000);
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
  const form = e.target;
  const id = (tipoTransacao === 'RENDA' ? document.getElementById('rendaId') : document.getElementById('contaId'))
    .value;

  if (!id && checkBloqueioMesFechado()) return; // Apenas bloqueia POST (inserir), edição permite passar

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
      const responseData = await res.json().catch(() => ({}));
      if (responseData.criados) {
        mostrarAviso('Sucesso', `${responseData.criados} contas lançadas com sucesso!`);
        setTimeout(() => window.location.reload(), 3000);
      } else {
        window.location.reload();
      }
    }
  } catch (err) {
    console.error(err);
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
      window.location.reload();
    }
  } catch (e) {
    ocultarLoading();
  }
};
