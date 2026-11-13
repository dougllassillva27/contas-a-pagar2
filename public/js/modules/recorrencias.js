// ==============================================================================
// recorrencias.js - modal "Recorrências do cartão" (CRUD + geração do mês)
// ==============================================================================
// Uma recorrência pode ter rateio: `participantes` = [{ dono, valor }].
// "Gerar lançamentos do mês" cria os lançamentos CARTAO a partir das ativas,
// idempotente por (recorrência, dono, mês).
// ==============================================================================

import { escapeHTML } from './shared.js';

const brl = (n) =>
  'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let cache = [];
let editandoId = null;
let participantes = [];

function csrf() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : '';
}

function mesAno() {
  return {
    month: parseInt(document.body.dataset.month, 10),
    year: parseInt(document.body.dataset.year, 10),
  };
}

function aviso(texto, cor = 'var(--green)') {
  const el = document.getElementById('recorrenciasAviso');
  if (!el) return;
  el.textContent = texto;
  el.style.color = cor;
  if (texto) {
    clearTimeout(aviso._t);
    aviso._t = setTimeout(() => {
      el.textContent = '';
    }, 6000);
  }
}

function pill(texto, cor = 'azul') {
  return texto
    ? `<span class="conciliacao-pill conciliacao-pill-${cor}">${escapeHTML(texto)}</span>`
    : '';
}

function renderTabela() {
  const tbody = document.getElementById('listaRecorrencias');
  const totalEl = document.getElementById('recorrenciasTotal');
  if (!tbody) return;

  const ativas = cache.filter((r) => r.ativo);
  const total = ativas.reduce((s, r) => s + Number(r.valorTotal || 0), 0);
  if (totalEl) totalEl.textContent = `${ativas.length} ativas · ${brl(total)}/mês`;

  if (!cache.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-secondary)">Nenhuma recorrência cadastrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = cache
    .map((r) => {
      const rateio =
        r.participantes && r.participantes.length > 1
          ? r.participantes.map((p) => pill(`${p.dono || 'eu'} ${brl(p.valor)}`, 'cinza')).join(' ')
          : pill(r.participantes?.[0]?.dono || 'eu', 'verde');

      return `<tr style="${r.ativo ? '' : 'opacity:.55'}">
          <td style="text-align:left">${escapeHTML(r.descricao)}</td>
          <td style="text-align:center">${r.diaCobranca || '-'}</td>
          <td style="text-align:left">${rateio}</td>
          <td class="col-valor" style="text-align:right; white-space:nowrap">${brl(r.valorTotal)}</td>
          <td style="text-align:center">
            <input type="checkbox" ${r.ativo ? 'checked' : ''} onchange="toggleRecorrencia(${r.id}, this.checked)">
          </td>
          <td style="text-align:center">
            <span class="material-icons" role="button" tabindex="0" style="font-size:18px;cursor:pointer"
                  onclick="editarRecorrencia(${r.id})" data-tooltip="Editar" data-tooltip-dir="left">edit</span>
          </td>
        </tr>`;
    })
    .join('');
}

function linhaParticipante(p, i) {
  return `<div class="recorrencias-participante">
      <input type="text" placeholder="Quem (vazio = eu)" value="${escapeHTML(p.dono || '')}" data-campo="dono" data-i="${i}">
      <input type="text" inputmode="decimal" placeholder="0,00" value="${p.valor != null ? String(p.valor).replace('.', ',') : ''}" data-campo="valor" data-i="${i}">
      <span class="material-icons" role="button" tabindex="0" style="font-size:18px;cursor:pointer;color:var(--red)"
            onclick="removerParticipante(${i})" data-tooltip="Remover">close</span>
    </div>`;
}

function renderForm() {
  const box = document.getElementById('recorrenciasForm');
  if (!box) return;

  const r = editandoId ? cache.find((x) => x.id === editandoId) : null;

  box.innerHTML = `<div class="recorrencias-form-titulo">${r ? 'Editar recorrência' : 'Nova recorrência'}</div>
    <div class="recorrencias-form-linha">
      <label>Descrição
        <input type="text" id="recDescricao" value="${r ? escapeHTML(r.descricao) : ''}" placeholder="Ex: Claro Flex dia 21">
      </label>
      <label>Valor total
        <input type="text" inputmode="decimal" id="recValor" value="${r ? String(r.valorTotal).replace('.', ',') : ''}" placeholder="0,00">
      </label>
      <label>Dia da cobrança
        <input type="number" id="recDia" min="1" max="28" value="${r?.diaCobranca || ''}" placeholder="dia">
      </label>
    </div>

    <div class="recorrencias-form-titulo" style="margin-top:14px">
      Rateio
      <button class="btn-secondary" style="font-size:.75rem;padding:3px 9px" onclick="adicionarParticipante()">+ pessoa</button>
    </div>
    <div id="recParticipantes">${participantes.map(linhaParticipante).join('')}</div>

    <div class="recorrencias-form-acoes">
      <button class="btn-secondary" onclick="cancelarFormRecorrencia()">Cancelar</button>
      <button class="btn-primary" onclick="salvarRecorrenciaForm()">Salvar</button>
    </div>`;
  box.style.display = 'block';
}

// --- API ---------------------------------------------------------------------

async function carregar() {
  const tbody = document.getElementById('listaRecorrencias');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px">Carregando…</td></tr>`;
  try {
    const res = await fetch('/api/recorrencias?todas=1');
    const dados = await res.json();
    cache = dados.recorrencias || [];
    renderTabela();
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--red)">${escapeHTML(
      err.message
    )}</td></tr>`;
  }
}

function abrirForm(id) {
  editandoId = id || null;
  const r = id ? cache.find((x) => x.id === id) : null;
  participantes = r
    ? (r.participantes || []).map((p) => ({ dono: p.dono || '', valor: p.valor }))
    : [{ dono: '', valor: '' }];
  renderForm();
  document.getElementById('recDescricao')?.focus();
}

export function abrirModalRecorrencias() {
  const modal = document.getElementById('modalRecorrencias');
  if (!modal) return;
  if (document.querySelector('.modal-overlay.active')) return;

  const registerModalOpen =
    typeof window.registerModalOpen === 'function'
      ? window.registerModalOpen
      : () => {
          if (document.activeElement) document.activeElement.blur();
          document.body.classList.add('no-scroll');
          history.pushState({ modal: true }, '', '');
        };
  registerModalOpen();
  modal.classList.add('active');
  cancelarFormRecorrencia();
  carregar();
}

export function novaRecorrencia() {
  abrirForm(null);
}

export function editarRecorrencia(id) {
  abrirForm(Number(id));
}

export function cancelarFormRecorrencia() {
  editandoId = null;
  participantes = [];
  const box = document.getElementById('recorrenciasForm');
  if (box) {
    box.style.display = 'none';
    box.innerHTML = '';
  }
}

export function adicionarParticipante() {
  participantes.push({ dono: '', valor: '' });
  renderForm();
}

export function removerParticipante(i) {
  participantes.splice(i, 1);
  if (!participantes.length) participantes = [{ dono: '', valor: '' }];
  renderForm();
}

export async function salvarRecorrenciaForm() {
  const descricao = document.getElementById('recDescricao')?.value?.trim();
  const valorTotal = Number(String(document.getElementById('recValor')?.value || '').replace(',', '.'));
  const diaCobranca = Number(document.getElementById('recDia')?.value) || null;

  if (!descricao) return aviso('Informe a descrição.', 'var(--red)');
  if (!(valorTotal > 0)) return aviso('Informe o valor total.', 'var(--red)');

  // Coleta o rateio direto dos inputs (o usuário pode não ter clicado em "+ pessoa")
  const lista = [...document.querySelectorAll('#recParticipantes .recorrencia-participante, #recParticipantes .recorrencias-participante')];
  const partes = lista
    .map((linha) => {
      const dono = linha.querySelector('[data-campo="dono"]')?.value?.trim() || '';
      const valor = Number(String(linha.querySelector('[data-campo="valor"]')?.value || '').replace(',', '.'));
      return { dono, valor };
    })
    .filter((p) => p.valor > 0);

  const corpo = {
    descricao,
    valorTotal,
    diaCobranca,
    participantes: partes.length ? partes : [{ dono: '', valor: valorTotal }],
  };

  try {
    const url = editandoId ? `/api/recorrencias/${editandoId}` : '/api/recorrencias';
    const res = await fetch(url, {
      method: editandoId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf() },
      body: JSON.stringify(corpo),
    });
    const dados = await res.json();
    if (!res.ok || dados.success === false) throw new Error(dados.error || 'falha ao salvar');
    aviso(editandoId ? 'Recorrência atualizada.' : 'Recorrência criada.');
    cancelarFormRecorrencia();
    await carregar();
  } catch (err) {
    aviso(err.message, 'var(--red)');
  }
}

export async function toggleRecorrencia(id, ativo) {
  try {
    const res = await fetch(`/api/recorrencias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf() },
      body: JSON.stringify({ ativo: Boolean(ativo) }),
    });
    if (!res.ok) throw new Error('não foi possível alterar');
    aviso(ativo ? 'Reativada.' : 'Desativada - para de contar como prevista.');
    await carregar();
  } catch (err) {
    aviso(err.message, 'var(--red)');
    await carregar();
  }
}

export async function gerarLancamentosMes() {
  const { month, year } = mesAno();
  try {
    const res = await fetch('/api/recorrencias/gerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf() },
      body: JSON.stringify({ month, year }),
    });
    const dados = await res.json();
    if (!res.ok || dados.success === false) throw new Error(dados.error || 'falha ao gerar');
    const partes = [];
    if (dados.criados) partes.push(`${dados.criados} criado(s)`);
    if (dados.vinculados) partes.push(`${dados.vinculados} vinculado(s) ao que já existia`);
    if (dados.pulados) partes.push(`${dados.pulados} já estavam`);
    aviso(
      partes.length ? `${dados.mes}/${dados.ano}: ${partes.join(', ')}.` : 'Nada a fazer neste mês.',
      dados.criados || dados.vinculados ? 'var(--green)' : 'var(--text-secondary)'
    );
  } catch (err) {
    aviso(err.message, 'var(--red)');
  }
}

window.abrirModalRecorrencias = abrirModalRecorrencias;
window.novaRecorrencia = novaRecorrencia;
window.editarRecorrencia = editarRecorrencia;
window.cancelarFormRecorrencia = cancelarFormRecorrencia;
window.adicionarParticipante = adicionarParticipante;
window.removerParticipante = removerParticipante;
window.salvarRecorrenciaForm = salvarRecorrenciaForm;
window.toggleRecorrencia = toggleRecorrencia;
window.gerarLancamentosMes = gerarLancamentosMes;
