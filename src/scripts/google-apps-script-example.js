/**
 * GOOGLE APPS SCRIPT - EXEMPLO DE AUTOMAÇÃO (ÚLTIMO DIA DO MÊS)
 * 
 * Instruções:
 * 1. Cole este código no seu Editor de Scripts do Google.
 * 2. Substitua 'SUA_URL_AQUI' e 'SEU_API_TOKEN_AQUI' pelos seus dados.
 * 3. Configure um acionador DIÁRIO (Contador de dias) entre 22:00 e 23:00.
 */

function verificarEExecutarCopia() {
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);
  
  // Se amanhã for dia 1, hoje é o último dia do mês
  if (amanha.getDate() === 1) {
    Logger.log('📅 Último dia do mês detectado. Iniciando cópia...');
    dispararWebhookCopia();
  } else {
    Logger.log('⏭️ Hoje não é o último dia. Nada a fazer.');
  }
}

/**
 * Função interna que faz o request para a API
 */
function dispararWebhookCopia() {
  const URL_BASE = 'https://SUA_URL_AQUI.onrender.com';
  const API_TOKEN = 'SEU_API_TOKEN_AQUI'; 
  const url = URL_BASE + '/api/v1/integracao/copiar-mensal';
  
  const options = {
    'method': 'post',
    'headers': { 'x-api-key': API_TOKEN },
    'muteHttpExceptions': true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    
    if (result.success) {
      Logger.log('✅ Automação concluída: ' + result.context);
      Logger.log('Pessoas processadas: ' + result.resultados.length);
    } else {
      Logger.log('❌ Erro na API: ' + result.error);
    }
  } catch (e) {
    Logger.log('💥 Erro no request: ' + e.toString());
  }
}
