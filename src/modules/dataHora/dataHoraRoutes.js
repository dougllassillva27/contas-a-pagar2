// src/modules/dataHora/dataHoraRoutes.js

const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  // Chave da API e URL fornecidas na tarefa
  const apiKey = 'a06b2353d8msh4e73e696581e2b0p193f3bjsn4921007ae8cd';
  const url = 'https://world-time-api3.p.rapidapi.com/timezone/America/Sao_Paulo';
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'world-time-api3.p.rapidapi.com',
      'x-rapidapi-key': apiKey,
    },
  };

  try {
    const apiResponse = await fetch(url, options);
    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      throw new Error(`Erro na API externa: ${apiResponse.status} - ${errorBody}`);
    }
    const data = await apiResponse.json();
    const datetimeISO = data.datetime; // Ex: "2026-04-16T10:08:21.900-03:00"

    // Formatando para o padrão DD/MM/AAAA HH:mm
    const dateObj = new Date(datetimeISO);
    const dia = String(dateObj.getDate()).padStart(2, '0');
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const ano = dateObj.getFullYear();
    const hora = String(dateObj.getHours()).padStart(2, '0');
    const minuto = String(dateObj.getMinutes()).padStart(2, '0');
    const dataHoraFormatada = `${dia}/${mes}/${ano} ${hora}:${minuto}`;

    // Renderiza uma página HTML simples diretamente, sem precisar de um arquivo .ejs
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Data e Hora - Brasília</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:'Inter',sans-serif;background:#121212;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}.container{text-align:center;background:#1e1e1e;padding:40px;border-radius:16px;border:1px solid rgba(255,255,255,0.1)}h1{margin-top:0;color:#a0a0a0;font-size:1.2rem;font-weight:400}p{font-size:3rem;font-weight:700;margin-bottom:0;color:#3878e1}</style></head>
      <body><div class="container"><h1>Data e Hora Atuais (Brasília)</h1><p>${dataHoraFormatada}</p></div></body>
      </html>
    `);
  } catch (error) {
    console.error('[dataHora] Erro ao buscar horário:', error.message);
    res.status(500).send(`<h1>Erro 500</h1><p>Não foi possível obter o horário. Detalhes: ${error.message}</p>`);
  }
});

module.exports = router;
