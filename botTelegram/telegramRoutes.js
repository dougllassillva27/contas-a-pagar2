// ==============================================================================
// 🌐 Rotas do Webhook do Telegram
// Recebe updates do Telegram via POST e repassa ao bot.
// ==============================================================================

const express = require('express');
const router = express.Router();
const { criarBot } = require('./telegramBot');

/**
 * Cria as rotas do Telegram e retorna o router do Express.
 *
 * @param {object} repo — repositório do banco de dados
 * @returns {express.Router}
 */
module.exports = function (repo) {
  const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim();
  const TELEGRAM_WEBHOOK_SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();

  // Se o token não estiver configurado, não monta as rotas
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('[Telegram] TELEGRAM_BOT_TOKEN não configurado. Bot desativado.');
    return router;
  }

  // Cria instância do bot
  const bot = criarBot({
    token: TELEGRAM_BOT_TOKEN,
    chatIdPermitido: TELEGRAM_CHAT_ID,
    repo,
  });

  /**
   * Webhook endpoint.
   * O `:secret` no path impede que qualquer pessoa envie payloads falsos.
   *
   * URL final: POST /telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>
   */
  router.post(`/telegram/webhook/${TELEGRAM_WEBHOOK_SECRET}`, (req, res) => {
    // Repassa o update para o bot processar
    bot.processUpdate(req.body);

    // Responde 200 imediatamente (Telegram exige resposta rápida)
    res.sendStatus(200);
  });

  console.log('[Telegram] Bot configurado. Webhook pronto.');
  return router;
};
