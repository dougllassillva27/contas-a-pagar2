// ==============================================================================
// 🤖 Bot do Telegram — Módulo Principal
// Recebe mensagens, parseia, insere no banco e responde ao usuário.
// ==============================================================================

const TelegramBot = require('node-telegram-bot-api');
const { parseMensagem, formatoEsperado } = require('./messageParser');
const { formatarSucesso, formatarErro } = require('./responseFormatter');

/**
 * Cria e configura a instância do bot do Telegram.
 *
 * @param {object} config — configurações do bot
 * @param {string} config.token — token do @BotFather
 * @param {string} config.chatIdPermitido — chat ID autorizado
 * @param {object} repo — repositório do banco de dados
 * @returns {TelegramBot} — instância configurada
 */
function criarBot({ token, chatIdPermitido, repo }) {
  // Modo webhook: NÃO usa polling (compatível com Render free)
  const bot = new TelegramBot(token, { polling: false });

  bot.on('message', async (msg) => {
    await processarMensagem(bot, msg, { chatIdPermitido, repo });
  });

  return bot;
}

/**
 * Processa uma mensagem recebida do Telegram.
 * Função separada para facilitar testes.
 */
async function processarMensagem(bot, msg, { chatIdPermitido, repo }) {
  const chatId = String(msg.chat.id);

  // --- Segurança: rejeita mensagens de chats não autorizados ---
  if (chatId !== String(chatIdPermitido)) {
    console.log(`[Telegram] Mensagem ignorada de chat não autorizado: ${chatId}`);
    return;
  }

  const texto = (msg.text || '').trim();

  // Ignora comandos especiais (ex: /start, /help)
  if (texto.startsWith('/')) {
    await responderComando(bot, chatId, texto);
    return;
  }

  // Ignora mensagens vazias (fotos, stickers, etc.)
  if (!texto) return;

  // --- Parse da mensagem ---
  const resultado = parseMensagem(texto);

  if (!resultado.sucesso) {
    await bot.sendMessage(chatId, formatarErro(resultado.erro), { parse_mode: 'MarkdownV2' });
    return;
  }

  // --- Inserção no banco ---
  try {
    const dados = resultado.dados;

    await repo.addLancamento(dados.usuarioId, {
      descricao: dados.descricao,
      valor: dados.valor,
      tipo: dados.tipo,
      status: dados.status,
      parcelaAtual: dados.parcelaAtual,
      totalParcelas: dados.totalParcelas,
      nomeTerceiro: dados.nomeTerceiro,
      dataBase: dados.dataBase,
    });

    await bot.sendMessage(chatId, formatarSucesso(dados), { parse_mode: 'MarkdownV2' });
  } catch (err) {
    console.error('[Telegram] Erro ao inserir lançamento:', err.message);
    await bot.sendMessage(chatId, formatarErro('Erro interno ao registrar. Tente novamente.'), {
      parse_mode: 'MarkdownV2',
    });
  }
}

/**
 * Responde a comandos especiais (/start, /help, etc.)
 */
async function responderComando(bot, chatId, comando) {
  const cmd = comando.toLowerCase().split(' ')[0];

  if (cmd === '/start' || cmd === '/help') {
    const ajuda = ['🏦 *Bot Contas a Pagar*', '', 'Envie uma mensagem no formato:', '`usuario; descricao; valor; tipo; parcelas; terceiro`', '', '📌 *Exemplos:*', '`1; Internet; R$ 100,00; fixa; ;`', '`1; Tênis; R$ 500,00; parcelada; 10; Vitoria`', '`2; Mercado; 250; unica; ;`', '', '📋 *Tipos:* fixa, unica, parcelada', '👤 *Usuários:* 1 \\= Dodo, 2 \\= Vitória'].join('\n');

    await bot.sendMessage(chatId, ajuda, { parse_mode: 'MarkdownV2' });
    return;
  }

  // Comando desconhecido — mostra ajuda
  await bot.sendMessage(chatId, 'Comando não reconhecido\\. Use /help para ver o formato\\.', {
    parse_mode: 'MarkdownV2',
  });
}

module.exports = { criarBot, processarMensagem };
