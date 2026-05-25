const axios = require('axios');
const { loadConfig } = require('../config/loader');

const apiClient = axios.create({
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Envia lançamento(s) via API de integração.
 * Se o campo terceiro contiver vírgulas (ex: "1,2"), faz N chamadas individuais
 * pois o endpoint /api/v1/integracao/lancamentos não suporta bulk_mode.
 */
async function enviarLancamento(lancamento) {
  const config = loadConfig();

  if (!lancamento?.descricao || !lancamento?.valor || !lancamento?.tipo) {
    return { success: false, error: 'Dados inválidos: descrição, valor e tipo são obrigatórios' };
  }

  if (!config.apiToken || config.apiToken === 'SEU_API_TOKEN_AQUI') {
    return { success: false, error: 'API token não configurado. Edite config/default.json' };
  }

  const terceiroRaw = lancamento.terceiro?.trim() || '';
  const hasMultipleTerceiros = terceiroRaw.includes(',');

  // Monta lista de terceiros a processar
  const terceirosList = hasMultipleTerceiros
    ? [...new Set(terceiroRaw.split(',').map(t => t.trim()).filter(t => t.length > 0))]
    : [terceiroRaw || null];

  const url = `${config.apiUrl}/api/v1/integracao/lancamentos`;
  const headers = { 'x-api-key': config.apiToken };

  try {
    let lastResponse;

    for (const terceiro of terceirosList) {
      const payload = {
        usuario_id: lancamento.usuario_id || config.defaultUserId,
        descricao: lancamento.descricao.trim(),
        valor: String(lancamento.valor).trim(),
        tipo: lancamento.tipo,
        terceiro: terceiro,
        parcelas: lancamento.parcelas?.trim() || ''
      };

      const response = await apiClient.post(url, payload, { headers });
      lastResponse = response;
    }

    return { success: true, data: lastResponse.data };
  } catch (err) {
    console.error('[API Client] Erro:', err.message);

    if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
      return { success: false, error: 'Servidor indisponível. Verifique se o sistema está rodando em ' + config.apiUrl };
    }
    if (err.response?.status === 401) {
      return { success: false, error: 'Token inválido. Verifique apiToken em config/default.json' };
    }
    if (err.response?.status === 400) {
      return { success: false, error: err.response.data?.error || 'Dados inválidos' };
    }
    if (err.response?.status >= 500) {
      return { success: false, error: 'Erro no servidor. Tente novamente em alguns instantes.' };
    }

    return { success: false, error: err.response?.data?.error || err.message || 'Erro desconhecido' };
  }
}

async function testarConexao() {
  const config = loadConfig();
  try {
    await apiClient.get(`${config.apiUrl}/health`, {
      timeout: 5000,
      headers: { 'x-api-key': config.apiToken }
    });
    return { ok: true, message: 'Conexão OK' };
  } catch (err) {
    return { ok: false, message: err.code === 'ECONNREFUSED' ? 'Servidor não responde' : err.message || 'Erro de conexão' };
  }
}

module.exports = { enviarLancamento, testarConexao, apiClient };
