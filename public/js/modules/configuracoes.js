// ==============================================================================
// ✅ CONFIGURAÇÕES — Regras sync, wizard, configurações usuário
// ==============================================================================

import { softRefresh, softRefreshSafe } from './dashboard.js';
import { softRefreshCache } from './shared.js';

export async function salvarConfiguracoes(mostrarLoading, ocultarLoading, mostrarAviso, fecharModais) {
  const inputMinimo = document.getElementById('configDivisaoMinimo');
  if (!inputMinimo) return;

  const valorRaw = inputMinimo.value;
  const valorNumerico = parseFloat(valorRaw.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());

  if (isNaN(valorNumerico)) {
    if (typeof mostrarAviso === 'function') mostrarAviso('Erro', 'Valor inválido.');
    return;
  }

  if (typeof mostrarLoading === 'function') mostrarLoading();
  try {
    const res = await fetch('/api/configuracoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave: 'divisao_casa_minimo', valor: valorNumerico }),
    });
    if (typeof ocultarLoading === 'function') ocultarLoading();
    if (res.ok) {
      softRefreshCache.clear();
      await softRefresh(undefined, false);
      fecharModais();
    } else if (typeof mostrarAviso === 'function') mostrarAviso('Erro', 'Falha ao salvar configuração.');
  } catch (err) {
    if (typeof ocultarLoading === 'function') ocultarLoading();
    if (typeof mostrarAviso === 'function') mostrarAviso('Erro', 'Erro de conexão.');
  }
}

export function getRegrasSync() {
  try {
    return JSON.parse(document.body.dataset.regrasSync || '[]');
  } catch (e) {
    return [];
  }
}

export function renderizarRegrasSync() {
  const lista = document.getElementById('listaRegrasSync');
  if (!lista) return;

  const regras = getRegrasSync();

  if (regras.length === 0) {
    lista.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        Nenhuma regra configurada. Comece criando uma nova!
                       </div>`;
    return;
  }

  let html = '';
  regras.forEach((regra, index) => {
    const statusClass = regra.ativo !== false ? 'badge-sync-active' : 'badge-sync-inactive';
    const statusText = regra.ativo !== false ? 'Ativa' : 'Inativa';
    const desc = regra.tipo === 'COPIA_TOTAL'
      ? `Copia <b>${regra.terceiroOrigem}</b> p/ Usuário <b>${regra.usuarioDestino}</b>`
      : `Divide <b>${regra.terceiroOrigem}</b> p/ Usuário <b>${regra.usuarioDestino}</b> (Min: R$ ${regra.valorMinimo || 0})`;

    html += `
      <div class="sync-rule-item">
        <div class="sync-rule-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="badge-sync ${statusClass}">${statusText}</span>
            <span style="font-size: 0.7rem; color: var(--primary); font-weight: bold;">${regra.tipo}</span>
          </div>
          <h4>${desc}</h4>
        </div>
        <div class="sync-rule-actions">
          <button class="btn-icon-small" onclick="editarRegraSync(${index})" title="Editar"><span class="material-icons" style="font-size: 18px;">edit</span></button>
          <button class="btn-icon-small danger" onclick="confirmarDeletarRegraSync(${index})" title="Excluir"><span class="material-icons" style="font-size: 18px;">delete</span></button>
        </div>
      </div>
    `;
  });

  lista.innerHTML = html;
}

export function abrirFormNovaRegra() {
  if (typeof abrirModalRegraSync === 'function') abrirModalRegraSync(-1);
}

export function editarRegraSync(index) {
  const regras = getRegrasSync();
  if (regras[index]) {
    if (typeof abrirModalRegraSync === 'function') abrirModalRegraSync(index, regras[index]);
  }
}

export async function salvarRegraSync(mostrarLoading, ocultarLoading, mostrarAviso, fecharModalRegraSync) {
  const index = parseInt(document.getElementById('syncRuleIndex').value);
  const tipo = document.getElementById('syncType').value;
  const regras = getRegrasSync();

  const novaRegra = {
    tipo: tipo,
    terceiroOrigem: document.getElementById('syncTerceiroOrigem').value,
    usuarioDestino: parseInt(document.getElementById('syncUsuarioDestino').value),
    ativo: document.getElementById('syncAtivo').checked
  };

  if (tipo === 'COPIA_TOTAL') {
    novaRegra.contaDestino = document.getElementById('syncContaDestino').value;
  } else if (tipo === 'DIVISAO_CASA') {
    novaRegra.valorMinimo = parseFloat(document.getElementById('syncValorMinimo').value) || 0;
    novaRegra.terceiroEspelhoNoOrigem = document.getElementById('syncTerceiroEspelho').value;
  }

  if (index === -1) {
    regras.push(novaRegra);
  } else {
    regras[index] = novaRegra;
  }

  await persistirRegrasSync(regras, mostrarLoading, ocultarLoading, mostrarAviso, fecharModalRegraSync);
}

export function confirmarDeletarRegraSync(index) {
  if (confirm('Deseja realmente excluir esta regra de sincronização?')) {
    deletarRegraSync(index);
  }
}

export async function deletarRegraSync(index, mostrarLoading, ocultarLoading, mostrarAviso) {
  const regras = getRegrasSync();
  regras.splice(index, 1);
  await persistirRegrasSync(regras, mostrarLoading, ocultarLoading, mostrarAviso);
}

async function persistirRegrasSync(regras, mostrarLoading, ocultarLoading, mostrarAviso, fecharModalRegraSync) {
  mostrarLoading();
  try {
    const res = await fetch('/api/configuracoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave: 'regras_sync', valor: regras }),
    });

    if (res.ok) {
      document.body.dataset.regrasSync = JSON.stringify(regras);
      renderizarRegrasSync();
      if (typeof fecharModalRegraSync === 'function') fecharModalRegraSync();
      ocultarLoading();
      mostrarAviso('Sucesso', 'Regras de sincronização atualizadas!');
    } else {
      throw new Error('Erro ao salvar');
    }
  } catch (err) {
    ocultarLoading();
    mostrarAviso('Erro', 'Falha ao salvar as regras no banco.');
  }
}

export async function finalizarWizard(mostrarLoading, ocultarLoading, mostrarAviso, fecharModalWizard, concluirOnboarding, softRefresh) {
  const partnerName = document.getElementById('wizardPartnerName').value.trim();
  const partnerID = parseInt(document.getElementById('wizardPartnerID').value) || null;
  const enableCasa = document.getElementById('wizardEnableCasa').checked;

  if (!partnerName) {
    mostrarAviso('Erro', 'O nome do parceiro é obrigatório para configurar a sincronização.');
    return;
  }

  mostrarLoading();
  try {
    const novasRegras = [];

    if (enableCasa) {
      novasRegras.push({
        tipo: 'DIVISAO_CASA',
        terceiroOrigem: 'Casa',
        usuarioDestino: partnerID || 2,
        valorMinimo: 750,
        terceiroEspelhoNoOrigem: partnerName,
        ativo: true
      });
    }

    if (novasRegras.length > 0) {
      await fetch('/api/configuracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'regras_sync', valor: novasRegras }),
      });
    }

    await concluirOnboarding();
    document.body.dataset.regrasSync = JSON.stringify(novasRegras);

    if (typeof fecharModalWizard === 'function') fecharModalWizard();
    ocultarLoading();

    mostrarAviso('Tudo Pronto!', `Configuração concluída. Bem-vindo, ${document.body.dataset.username}!`);
    softRefreshCache.clear();
    if (typeof softRefresh === 'function') await softRefresh(undefined, false);

  } catch (err) {
    ocultarLoading();
    mostrarAviso('Erro', 'Houve um problema ao salvar sua configuração inicial.');
  }
}

export async function finalizarWizardSozinho(mostrarLoading, ocultarLoading, mostrarAviso, fecharModalWizard, concluirOnboarding) {
  mostrarLoading();
  try {
    await concluirOnboarding();
    if (typeof fecharModalWizard === 'function') fecharModalWizard();
    ocultarLoading();
    mostrarAviso('Bem-vindo!', `Configuração concluída. Você pode gerenciar sincronizações mais tarde nas configurações.`);
  } catch (err) {
    ocultarLoading();
    mostrarAviso('Erro', 'Falha ao finalizar configuração.');
  }
}

export async function concluirOnboarding() {
  await fetch('/api/configuracoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chave: 'onboarding_completed', valor: true }),
  });
  document.body.dataset.onboardingCompleted = 'true';
}
