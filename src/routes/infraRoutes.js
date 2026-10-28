const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');

// ==============================================================================
// Gate do health interno
// Só é "local" quando o cliente é o próprio peer da conexão (sem proxy no meio),
// porque req.ip vem de X-Forwarded-For com `trust proxy` ligado. Requisição
// proxiada (nginx) ou vinda de outro container cai na exigência de x-api-key.
// ==============================================================================
function normalizarIp(valor) {
  return String(valor || '').replace(/^::ffff:/, '');
}

function ehEnderecoLocal(ip) {
  const normalizado = normalizarIp(ip);
  return (
    normalizado === '127.0.0.1' ||
    normalizado === '::1' ||
    normalizado.startsWith('127.') ||
    normalizado.startsWith('10.10.0.')
  );
}

function requisicaoLocal(req) {
  const peer = normalizarIp(req.socket && req.socket.remoteAddress);
  const cliente = normalizarIp(req.ip);
  if (!peer || peer !== cliente) {
    return false; // proxy na frente: o IP do header não é confiável
  }
  return ehEnderecoLocal(peer);
}

function tokenValido(req) {
  const esperado = (process.env.API_TOKEN || '').trim();
  const enviado = (req.headers['x-api-key'] || '').trim();
  if (!esperado || !enviado) return false;

  const a = Buffer.from(enviado);
  const b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Health público — mínimo exposto (sem uptime, latência, timestamp)
router.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    return res.status(200).json({ status: 'ok' });
  } catch (erro) {
    return res.status(503).json({ status: 'error' });
  }
});

// Health interno — detalhes completos (só local de verdade ou com x-api-key)
router.get('/health/internal', async (req, res) => {
  const autorizado = requisicaoLocal(req) || tokenValido(req);
  if (!autorizado) {
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
