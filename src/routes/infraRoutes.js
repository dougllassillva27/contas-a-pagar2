const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Health público — mínimo exposto (sem uptime, latência, timestamp)
router.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    return res.status(200).json({ status: 'ok' });
  } catch (erro) {
    return res.status(503).json({ status: 'error' });
  }
});

// Health interno — detalhes completos (só via localhost/WireGuard)
router.get('/health/internal', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || '';
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.10.0.') || ip.startsWith('::ffff:127.') || ip.startsWith('::ffff:10.10.0.');
  if (!isLocal) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const inicio = Date.now();
  const uptimeSegundos = process.uptime();
  const dias = Math.floor(uptimeSegundos / 86400);
  const horas = Math.floor((uptimeSegundos % 86400) / 3600);
  const minutos = Math.floor((uptimeSegundos % 3600) / 60);
  const segundos = Math.floor(uptimeSegundos % 60);
  const uptimeFormatado = `${dias}d ${horas}h ${minutos}m ${segundos}s`;

  try {
    await db.query('SELECT 1');
    const latencyMs = Date.now() - inicio;
    return res.status(200).json({
      service: 'contas-a-pagar',
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
      service: 'contas-a-pagar',
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
