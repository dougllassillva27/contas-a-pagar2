/**
 * Business Rules Configuration
 * Updated based on real electricity bill metrics.
 */
const TARIFF_CONFIG = {
  PRICE_PER_KWH: 1.0383, // TUSD (0.65380953) + TE (0.38448980) com impostos
  PUBLIC_LIGHTING: 13.57, // Contribuição Custeio IP-CIP
};

// DOM Elements
const form = document.getElementById('energyForm');
const resultCard = document.getElementById('resultCard');
const displayConsumo = document.getElementById('displayConsumo');
const displayValor = document.getElementById('displayValor');
const historyBody = document.getElementById('historyBody');

// State Management
let historyData = [];

// Extrai a API Key da URL (injetada via iframe src) para autenticar requisições
const urlParams = new URLSearchParams(window.location.search);
const API_KEY = urlParams.get('api_key') || '';

// Formatadores (Visuais apenas)
const formatReading = (value) => {
  return Number(value).toString().replace('.', ',');
};

const formatCurrency = (value) => {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Initialize Application
document.addEventListener('DOMContentLoaded', fetchHistory);

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
  const consumo = leituraAtual - leituraAnterior;
  const valorEstimado = consumo * TARIFF_CONFIG.PRICE_PER_KWH + TARIFF_CONFIG.PUBLIC_LIGHTING;

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
  };

  try {
    const response = await fetch('/api/salvar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
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
    const response = await fetch('/api/historico', {
      headers: { 'x-api-key': API_KEY },
    });

    if (response.status === 401) {
      console.error('API Key inválida ou não fornecida.');
      return;
    }
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
    const consumo = parseFloat(record.consumo_kwh) || parseFloat(record.consumo_conta) || 0;
    const valor = parseFloat(record.valor_estimado) || parseFloat(record.valor_conta) || 0;

    const leituraAtualExibicao =
      !leituraAtual || isNaN(leituraAtual) || leituraAtual === 0 ? '-' : formatReading(leituraAtual);

    tr.innerHTML = `
            <td>${record.mes_referencia}</td>
            <td>${formatReading(leituraAnt)}</td>
            <td>${leituraAtualExibicao}</td>
            <td>${formatReading(consumo)}</td>
            <td>${formatCurrency(valor)}</td>
            <td class="actions">
                <button onclick="reuseRecord(${record.id})" class="btn-reutilizar">Reutilizar</button>
                <button onclick="deleteRecord(${record.id})" class="btn-excluir">Excluir</button>
            </td>
        `;

    historyBody.appendChild(tr);
  });
}

// Reuse logic corrigida
window.reuseRecord = (id) => {
  const record = historyData.find((r) => r.id === id);
  if (record) {
    const lAtual = parseFloat(record.leitura_atual);
    const lAnt = parseFloat(record.leitura_anterior);

    // Se a leitura atual for maior que 0, usa ela. Senão (registro velho), usa a anterior.
    const valorReuso = lAnt; // Sempre reutiliza a leitura anterior

    document.getElementById('mesReferencia').value = '';
    document.getElementById('leituraAnterior').value = valorReuso;
    document.getElementById('leituraAtual').value = '';

    document.getElementById('mesReferencia').focus();
    resultCard.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

window.deleteRecord = async (id) => {
  if (!confirm('Deseja realmente excluir este registro?')) return;

  try {
    const response = await fetch(`/api/deletar/${id}`, {
      method: 'DELETE',
      headers: { 'x-api-key': API_KEY },
    });
    if (response.ok) {
      fetchHistory();
    }
  } catch (error) {
    console.error('Error deleting record:', error);
  }
};
