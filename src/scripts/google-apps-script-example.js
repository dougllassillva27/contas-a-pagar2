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
    method: 'post',
    headers: { 'x-api-key': API_TOKEN },
    muteHttpExceptions: true,
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

/**
 * Função de Ping (Keep-Alive) para o Render com Trava de Horário
 *
 * Instruções:
 * 1. Configure um acionador de tempo para rodar a cada 10 minutos.
 * 2. O script só fará o ping entre 08h00 e 21h59 (GMT-3), economizando a cota do Render de madrugada.
 */
function pingRenderHost() {
  const timeZone = 'America/Sao_Paulo';
  const date = new Date();
  const hourString = Utilities.formatDate(date, timeZone, 'HH');
  const hour = parseInt(hourString, 10);

  if (hour >= 22 || hour < 8) {
    Logger.log(
      'Fora do horário comercial (GMT-3). Hora atual: ' + hour + 'h. Ping cancelado para poupar horas no Render.'
    );
    return;
  }

  const url = 'https://contas-a-pagar-nsti.onrender.com/ping';
  const options = {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log('Status recebido da Render: ' + response.getResponseCode());
  } catch (erro) {
    Logger.log('Houve um erro no ping: ' + erro);
  }
}
