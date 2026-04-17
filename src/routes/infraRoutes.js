const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/health', async (req, res) => {
  const inicio = Date.now();
  const uptimeSegundos = process.uptime();
  const dias = Math.floor(uptimeSegundos / 86400);
  const horas = Math.floor((uptimeSegundos % 86400) / 3600);
  const minutos = Math.floor((uptimeSegundos % 3600) / 60);
  const segundos = Math.floor(uptimeSegundos % 60);
  const uptimeFormatado = `${dias}d ${horas}h ${minutos}m ${segundos}s`;
  const serviceName = 'contas-a-pagar';

  try {
    await db.query('SELECT 1');
    const latencyMs = Date.now() - inicio;
    return res.status(200).json({
      service: serviceName,
      status: 'ok',
      app: 'online',
      db: 'online',
      latency_ms: latencyMs,
      uptime: uptimeFormatado,
      timestamp: new Date().toISOString(),
    });
  } catch (erro) {
    const latencyMs = Date.now() - inicio;
    return res.status(503).json({
      service: serviceName,
      status: 'error',
      app: 'online',
      db: 'offline',
      latency_ms: latencyMs,
      uptime: uptimeFormatado,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/ping', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'contas-a-pagar',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
