// ==============================================================================
// 🔧 Script de Setup do Webhook do Telegram
// Execute uma vez após o deploy: node botTelegram/setupWebhook.js..
// ==============================================================================

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
const EXTERNAL_URL = (process.env.APP_EXTERNAL_URL || process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || '').trim();

if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN não configurado no .env');
  process.exit(1);
}

if (!SECRET) {
  console.error('❌ TELEGRAM_WEBHOOK_SECRET não configurado no .env');
  process.exit(1);
}

if (!EXTERNAL_URL) {
  console.error('❌ URL pública não configurada (defina APP_EXTERNAL_URL ou RENDER_EXTERNAL_URL no .env)');
  console.error('   Exemplo VPS: APP_EXTERNAL_URL=https://financeiro.meudominio.com');
  console.error('   Exemplo Render: RENDER_EXTERNAL_URL=https://contas-a-pagar.onrender.com');
  process.exit(1);
}

const webhookUrl = `${EXTERNAL_URL}/telegram/webhook/${SECRET}`;

async function setup() {
  const bot = new TelegramBot(TOKEN, { polling: false });

  try {
    // Remove webhook anterior (se existir)
    await bot.deleteWebHook();
    console.log('🧹 Webhook anterior removido.');

    // Registra novo webhook
    await bot.setWebHook(webhookUrl);
    console.log(`✅ Webhook registrado com sucesso!`);
    console.log(`   URL: ${webhookUrl}`);

    // Verifica se ficou tudo certo
    const info = await bot.getWebHookInfo();
    console.log('\n📋 Info do Webhook:');
    console.log(`   URL:              ${info.url}`);
    console.log(`   Pending updates:  ${info.pending_update_count}`);

    if (info.last_error_message) {
      console.log(`   ⚠️ Último erro:  ${info.last_error_message}`);
    }
  } catch (err) {
    console.error('❌ Erro ao configurar webhook:', err.message);
    process.exit(1);
  }
}

setup();
