// Netlify Function: dataHora
// Caminho: functions/dataHora.js

exports.handler = async (event, context) => {
  // Simulação do middleware createAuthHybrid/x-api-key
  // Conforme scripts AHK do usuário em geral.txt
  const API_KEY = "@Dodo@@Xp6yp4zq";
  const providedKey = event.headers['x-api-key'] || event.queryStringParameters?.apiKey;

  if (providedKey !== API_KEY) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "Unauthorized - API Key missing or invalid" })
    };
  }

  try {
    // Obtenção da hora atual em Brasília (UTC-3) usando Intl para evitar dependências externas (RapidAPI)
    const now = new Date();
    
    // Formatador para o padrão DD/MM/YYYY HH:mm
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const getV = (type) => parts.find(p => p.type === type).value;
    
    const dataHoraFormatada = `${getV('day')}/${getV('month')}/${getV('year')} ${getV('hour')}:${getV('minute')}`;

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // Facilita consumo direto se necessário
      },
      body: JSON.stringify({
        success: true,
        dataHoraFormatada,
        datetime: now.toISOString(),
        timezone: "America/Sao_Paulo"
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
