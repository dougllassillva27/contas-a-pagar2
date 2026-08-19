/**
 * Business Rules Configuration
 * Tarifas carregadas do backend (GET /configuracoes) por usuário.
 * Defaults = conta referência JUL/26 enquanto o fetch não resolve.
 */
const DEFAULT_TARIFF_CONFIG = {
  tusd: 0.74627832,
  te: 0.45158577,
  cip: 13.57,
  bandeira_amarela: 2.39,
  bandeira_vermelha1: 0,
  bandeira_vermelha2: 0,
};

// DOM Elements
const form = document.getElementById('energyForm');
const configForm = document.getElementById('configForm');
const feedbackModal = document.getElementById('feedbackModal');
const feedbackModalTitle = document.getElementById('feedbackModalTitle');
const feedbackModalMessage = document.getElementById('feedbackModalMessage');
const resultCard = document.getElementById('resultCard');
const displayConsumo = document.getElementById('displayConsumo');
const displayValor = document.getElementById('displayValor');
const historyBody = document.getElementById('historyBody');

// State Management
let historyData = [];
let tariffConfig = { ...DEFAULT_TARIFF_CONFIG };

// Valor da bandeira (R$/100 kWh) conforme seleção do formulário
const getValorBandeira = (bandeira) => {
  const mapa = {
    verde: 0,
    amarela: Number(tariffConfig.bandeira_amarela) || 0,
    vermelha1: Number(tariffConfig.bandeira_vermelha1) || 0,
    vermelha2: Number(tariffConfig.bandeira_vermelha2) || 0,
  };
  return mapa[bandeira] || 0;
};

// Formatadores (Visuais apenas)
const formatReading = (value) => {
  return Number(value).toString().replace('.', ',');
};

const formatCurrency = (value) => {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const round2 = (value) => Math.round(value * 100) / 100;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  fetchHistory();
  fetchConfig();
});

// Event Listeners
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const mesReferencia = document.getElementById('mesReferencia').value;
  const leituraAnterior = parseFloat(document.getElementById('leituraAnterior').value);
  const leituraAtual = parseFloat(document.getElementById('leituraAtual').value);

  if (leituraAtual < leituraAnterior) {
    alert('A leitura atual não pode ser menor que a leitura anterior.');
    return;
  }

  // Core Business Logic
  // valor = consumo × (TUSD + TE) + adicional de bandeira + CIP
  const consumo = leituraAtual - leituraAnterior;
  const bandeira = document.getElementById('bandeira').value;
  const adicionalBandeira = round2((consumo / 100) * getValorBandeira(bandeira));
  const valorEstimado = round2(
    consumo * (Number(tariffConfig.tusd) + Number(tariffConfig.te)) + adicionalBandeira + Number(tariffConfig.cip)
  );

  // Update UI Results
  displayConsumo.textContent = `${formatReading(consumo)} kWh`;
  displayValor.textContent = formatCurrency(valorEstimado);
  resultCard.style.display = 'block';

  // Prepare API Payload
  const payload = {
    mesReferencia,
    leituraAnterior,
    leituraAtual,
    consumo,
    valorEstimado,
    bandeira,
    adicionalBandeira,
  };

  try {
    const response = await fetch('/calcularLuz-v2/api/salvar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      form.reset();
      fetchHistory();
    } else {
      const errorData = await response.json();
      console.error('Failed to save record:', errorData);
      alert(`Erro ao salvar: ${errorData.details || 'Verifique o console'}`);
    }
  } catch (error) {
    console.error('API Error:', error);
  }
});

// Fetch History from Backend
async function fetchHistory() {
  try {
    const response = await fetch('/calcularLuz-v2/api/historico');
    const data = await response.json();
    historyData = data;
    renderHistoryTable();
  } catch (error) {
    console.error('Error fetching history:', error);
  }
}

// Render Table
function renderHistoryTable() {
  historyBody.innerHTML = '';

  historyData.slice(0, 5).forEach((record) => {
    // Limita a exibição aos 5 registros mais recentes
    const tr = document.createElement('tr');

    const leituraAnt = parseFloat(record.leitura_anterior) || 0;
    const leituraAtual = parseFloat(record.leitura_atual);
    const consumo = parseFloat(record.consumo_kwh) || 0;
    const valor = parseFloat(record.valor_estimado) || 0;

    const leituraAtualExibicao =
      !leituraAtual || isNaN(leituraAtual) || leituraAtual === 0 ? '-' : formatReading(leituraAtual);

    tr.innerHTML = `
            <td>${record.mes_referencia}</td>
            <td>${formatReading(leituraAnt)}</td>
            <td>${leituraAtualExibicao}</td>
            <td>${formatReading(consumo)}</td>
            <td>${formatCurrency(valor)}</td>
            <td class="actions">
                <button onclick="reuseRecord(${record.id})" class="btn-reutilizar" title="Usa a 'Leitura Anterior' deste registro para preencher o formulário.">Reutilizar</button>
                <button onclick="deleteRecord(${record.id})" class="btn-excluir">Excluir</button>
            </td>
        `;

    historyBody.appendChild(tr);
  });
}

// ✅ CORRIGIDO: Lógica de reutilização para pegar a leitura ANTERIOR do registro clicado
window.reuseRecord = (id) => {
  const record = historyData.find((r) => r.id === id);
  if (record) {
    const valorReuso = parseFloat(record.leitura_anterior);

    document.getElementById('leituraAnterior').value = valorReuso;
    document.getElementById('mesReferencia').value = '';
    document.getElementById('leituraAtual').value = '';

    document.getElementById('mesReferencia').focus();
    resultCard.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

window.deleteRecord = async (id) => {
  if (!confirm('Deseja realmente excluir este registro?')) return;

  try {
    const response = await fetch(`/calcularLuz-v2/api/deletar/${id}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      fetchHistory();
    }
  } catch (error) {
    console.error('Error deleting record:', error);
  }
};

// ============================================================================
// Modal de Feedback (substitui alert no padrão visual do sistema)
// ============================================================================

function showFeedbackModal(title, message) {
  feedbackModalTitle.textContent = title;
  feedbackModalMessage.textContent = message;
  feedbackModal.classList.add('active');
}

function hideFeedbackModal() {
  feedbackModal.classList.remove('active');
}

document.getElementById('feedbackModalOk').addEventListener('click', hideFeedbackModal);
document.getElementById('feedbackModalClose').addEventListener('click', hideFeedbackModal);
document.getElementById('feedbackModal').addEventListener('click', (e) => {
  if (e.target.id === 'feedbackModal') hideFeedbackModal();
});

// ============================================================================
// Configurações de Tarifas (GET/PUT /configuracoes)
// ============================================================================

async function fetchConfig() {
  try {
    const response = await fetch('/calcularLuz-v2/api/configuracoes');
    const data = await response.json();
    tariffConfig = { ...DEFAULT_TARIFF_CONFIG, ...data };
    fillConfigForm();
  } catch (error) {
    console.error('Error fetching config:', error);
  }
}

function fillConfigForm() {
  document.getElementById('cfgTusd').value = tariffConfig.tusd;
  document.getElementById('cfgTe').value = tariffConfig.te;
  document.getElementById('cfgCip').value = tariffConfig.cip;
  document.getElementById('cfgBandeiraAmarela').value = tariffConfig.bandeira_amarela;
  document.getElementById('cfgBandeiraVermelha1').value = tariffConfig.bandeira_vermelha1;
  document.getElementById('cfgBandeiraVermelha2').value = tariffConfig.bandeira_vermelha2;
}

configForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    tusd: parseFloat(document.getElementById('cfgTusd').value),
    te: parseFloat(document.getElementById('cfgTe').value),
    cip: parseFloat(document.getElementById('cfgCip').value),
    bandeira_amarela: parseFloat(document.getElementById('cfgBandeiraAmarela').value),
    bandeira_vermelha1: parseFloat(document.getElementById('cfgBandeiraVermelha1').value),
    bandeira_vermelha2: parseFloat(document.getElementById('cfgBandeiraVermelha2').value),
  };

  try {
    const response = await fetch('/calcularLuz-v2/api/configuracoes', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      tariffConfig = { ...tariffConfig, ...payload };
      showFeedbackModal('Configurações', 'Configurações salvas com sucesso.');
    } else {
      const errorData = await response.json();
      showFeedbackModal('Erro', errorData.error || 'Não foi possível salvar as configurações.');
    }
  } catch (error) {
    console.error('API Error:', error);
    showFeedbackModal('Erro', 'Erro de conexão ao salvar configurações.');
  }
});
