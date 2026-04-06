// ==============================================================================
// 🤖 Bot do Telegram — Modo Conversa Interativa
// Pergunta campo por campo usando inline keyboards e texto livre...
// ==============================================================================

const TelegramBot = require('node-telegram-bot-api');
const {
  ETAPAS,
  iniciarConversa,
  obterConversa,
  avancarConversa,
  finalizarConversa,
  cancelarConversa,
} = require('./conversationManager');
const { parseValor, normalizarParcelasPorTipo } = require('../../helpers/parseHelpers');
const { formatarSucesso, formatarErro } = require('./responseFormatter');
const { STATUS, TIPO } = require('../../constants');

/**
 * Cria e configura a instância do bot do Telegram.
 *
 * @param {object} config
 * @param {string} config.token — token do @BotFather
 * @param {string} config.chatIdPermitido — chat ID autorizado
 * @param {object} repo — repositório do banco de dados
 * @returns {TelegramBot}
 */
function criarBot({ token, chatIdPermitido, repo }) {
  const bot = new TelegramBot(token, { polling: false });

  // Configura o menu interativo nativo do Telegram (botão "/")
  bot
    .setMyCommands([
      { command: 'iniciar', description: 'Iniciar novo lançamento' },
      { command: 'iniciardodo', description: 'Lançamento rápido para Dodo' },
      { command: 'iniciarvitoria', description: 'Lançamento rápido para Vitória' },
      { command: 'cancelar', description: 'Cancelar lançamento em andamento' },
      { command: 'help', description: 'Ver comandos e ajuda' },
    ])
    .catch((err) => console.error('[Telegram] Erro ao definir comandos:', err.message));

  // --- Mensagens de texto ---
  bot.on('message', async (msg) => {
    const chatId = String(msg.chat.id);

    if (chatId !== String(chatIdPermitido)) {
      console.log(`[Telegram] Mensagem ignorada de chat não autorizado: ${chatId}`);
      return;
    }

    const texto = (msg.text || '').trim();
    if (!texto) return;

    // Comandos especiais
    if (texto.startsWith('/')) {
      await tratarComando(bot, chatId, texto);
      return;
    }

    // Processa resposta no fluxo da conversa
    await processarTexto(bot, chatId, texto, repo);
  });

  // --- Cliques em botões inline ---
  bot.on('callback_query', async (query) => {
    const chatId = String(query.message.chat.id);

    if (chatId !== String(chatIdPermitido)) return;

    await bot.answerCallbackQuery(query.id);
    await processarCallback(bot, chatId, query.data, repo);
  });

  return bot;
}

// ==============================================================================
// Comandos (/start, /help, /cancelar, /novo)
// ==============================================================================

async function tratarComando(bot, chatId, comando) {
  const partes = comando.toLowerCase().trim().split(/\s+/);
  const cmd = partes[0];
  let arg = partes[1]; // Ex: "dodo" em "/iniciar dodo"

  // Alias para atalhos clicáveis sem espaço
  if (cmd === '/iniciardodo' || cmd === '/iniciar_dodo') arg = 'dodo';
  if (cmd === '/iniciarvitoria' || cmd === '/iniciar_vitoria') arg = 'vitoria';

  const isIniciar = [
    '/novo',
    '/start',
    '/iniciar',
    '/iniciardodo',
    '/iniciarvitoria',
    '/iniciar_dodo',
    '/iniciar_vitoria',
  ].includes(cmd);

  if (isIniciar) {
    iniciarConversa(chatId);
    if (arg === 'dodo' || arg === 'vitoria') {
      const usuarioId = arg === 'dodo' ? 1 : 2;
      const proxima = avancarConversa(chatId, 'usuarioId', usuarioId);
      await enviarPergunta(bot, chatId, proxima);
    } else {
      await enviarPergunta(bot, chatId, ETAPAS.USUARIO);
    }
    return;
  }

  if (cmd === '/cancelar') {
    cancelarConversa(chatId);
    await bot.sendMessage(chatId, '❌ Lançamento cancelado\\.');
    return;
  }

  if (cmd === '/help') {
    const ajuda = [
      '🏦 *Bot Contas a Pagar*',
      '',
      '📌 *Comandos:*',
      '/iniciar \\- Iniciar novo lançamento',
      '/iniciardodo \\- Lançamento rápido \\(Dodo\\)',
      '/iniciarvitoria \\- Lançamento rápido \\(Vitória\\)',
      '/cancelar \\- Cancelar lançamento em andamento',
      '/help \\- Ver esta ajuda',
    ].join('\n');
    await bot.sendMessage(chatId, ajuda, { parse_mode: 'MarkdownV2' });
    return;
  }

  await bot.sendMessage(chatId, 'Comando não reconhecido\\. Use /help', { parse_mode: 'MarkdownV2' });
}

// ==============================================================================
// Processar resposta de texto (campos livres)
// ==============================================================================

async function processarTexto(bot, chatId, texto, repo) {
  const conversa = obterConversa(chatId);

  // Se não há conversa ativa, apenas ignora
  if (!conversa) {
    return;
  }

  const etapa = conversa.etapa;

  // Etapas que esperam texto livre
  switch (etapa) {
    case ETAPAS.DESCRICAO:
      await avancarEEnviarProxima(bot, chatId, 'descricao', texto, repo);
      break;

    case ETAPAS.VALOR: {
      const valor = parseValor(texto);
      if (valor <= 0) {
        await bot.sendMessage(chatId, '⚠️ Valor inválido. Envie algo como *R\\$ 100,00* ou *100*', {
          parse_mode: 'MarkdownV2',
        });
        return;
      }
      await avancarEEnviarProxima(bot, chatId, 'valor', valor, repo);
      break;
    }

    case ETAPAS.PARCELAS: {
      const parcelasNorm = normalizarParcelasPorTipo({
        isParcelada: true,
        parcelasRaw: texto,
      });
      if (parcelasNorm.erro) {
        await bot.sendMessage(chatId, `⚠️ ${parcelasNorm.erro}\nEnvie no formato *10* ou *1/10*`, {
          parse_mode: 'MarkdownV2',
        });
        return;
      }
      conversa.dados.parcelaAtual = parcelasNorm.parcelaAtual;
      conversa.dados.totalParcelas = parcelasNorm.totalParcelas;
      const proxima = avancarConversa(chatId, 'parcelas', texto);
      if (!proxima) {
        await finalizarEInserir(bot, chatId, repo);
      } else {
        await enviarPergunta(bot, chatId, proxima);
      }
      break;
    }

    case ETAPAS.TERCEIRO:
      await avancarEEnviarProxima(bot, chatId, 'terceiro', texto, repo);
      break;

    default:
      // Se está numa etapa que espera botão (USUARIO, TIPO), avisa
      await bot.sendMessage(chatId, '👆 Por favor, selecione uma opção usando os botões acima\\.');
      break;
  }
}

// ==============================================================================
// Processar callback de botões inline
// ==============================================================================

async function processarCallback(bot, chatId, data, repo) {
  const conversa = obterConversa(chatId);
  if (!conversa) {
    await bot.sendMessage(chatId, 'Nenhum lançamento em andamento\\. Use /novo para iniciar\\.', {
      parse_mode: 'MarkdownV2',
    });
    return;
  }

  // Callbacks têm formato: "campo:valor" (ex: "usuario:1", "tipo:fixa")
  const [campo, valor] = data.split(':');

  if (campo === 'usuario') {
    await avancarEEnviarProxima(bot, chatId, 'usuarioId', parseInt(valor, 10), repo);
  } else if (campo === 'tipo') {
    // Salvar tipo normalizado para a lógica de parcelas
    conversa.dados.tipo = valor;
    const proxima = avancarConversa(chatId, 'tipo', valor);
    if (!proxima) {
      await finalizarEInserir(bot, chatId, repo);
    } else {
      await enviarPergunta(bot, chatId, proxima);
    }
  } else if (campo === 'terceiro') {
    // Botão "Pular" para terceiro
    await avancarEEnviarProxima(bot, chatId, 'terceiro', null, repo);
  }
}

// ==============================================================================
// Avançar conversa e enviar próxima pergunta (ou finalizar)
// ==============================================================================

async function avancarEEnviarProxima(bot, chatId, campo, valor, repo) {
  const proxima = avancarConversa(chatId, campo, valor);

  if (!proxima) {
    await finalizarEInserir(bot, chatId, repo);
  } else {
    await enviarPergunta(bot, chatId, proxima);
  }
}

// ==============================================================================
// Enviar pergunta por etapa
// ==============================================================================

async function enviarPergunta(bot, chatId, etapa) {
  switch (etapa) {
    case ETAPAS.USUARIO:
      await bot.sendMessage(chatId, '👤 *Conta de quem?*', {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🧑 Dodo', callback_data: 'usuario:1' },
              { text: '👩 Vitória', callback_data: 'usuario:2' },
            ],
          ],
        },
      });
      break;

    case ETAPAS.DESCRICAO:
      await bot.sendMessage(chatId, '📋 *Qual a descrição?*\n_Ex: Netflix, Mercado, Rancho_', {
        parse_mode: 'MarkdownV2',
      });
      break;

    case ETAPAS.VALOR:
      await bot.sendMessage(chatId, '💰 *Qual o valor?*\n_Ex: R$ 100,00 ou 100_', {
        parse_mode: 'MarkdownV2',
      });
      break;

    case ETAPAS.TIPO:
      await bot.sendMessage(chatId, '📌 *Tipo de conta:*', {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔁 Fixa', callback_data: 'tipo:fixa' },
              { text: '1️⃣ Única', callback_data: 'tipo:unica' },
              { text: '📊 Parcelada', callback_data: 'tipo:parcelada' },
            ],
          ],
        },
      });
      break;

    case ETAPAS.PARCELAS:
      await bot.sendMessage(chatId, '🔢 *Quantas parcelas?*\n_Ex: 10 ou 1/10_', {
        parse_mode: 'MarkdownV2',
      });
      break;

    case ETAPAS.TERCEIRO:
      await bot.sendMessage(chatId, '🏷️ *Terceiro \\(de quem é a conta\\)?*\n_Ex: Morr, Mãe, Davi_', {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [[{ text: '⏭️ Pular (conta própria)', callback_data: 'terceiro:pular' }]],
        },
      });
      break;
  }
}

// ==============================================================================
// Finalizar conversa e inserir no banco
// ==============================================================================

async function finalizarEInserir(bot, chatId, repo) {
  const dadosBrutos = finalizarConversa(chatId);
  if (!dadosBrutos) return;

  try {
    const isFixa = dadosBrutos.tipo === 'fixa';
    const dbTipo = isFixa ? TIPO.FIXA : TIPO.CARTAO;
    const dataBase = new Date();

    // 🔒 VALIDAÇÃO DE MÊS FECHADO
    const isFechado = await repo.isMesFechado(dadosBrutos.usuarioId, dataBase.getMonth() + 1, dataBase.getFullYear());
    if (isFechado) {
      await bot.sendMessage(
        chatId,
        '❌ *Acesso Negado\\!*\nO mês atual está trancado no sistema\\.\nPor favor, acesse o painel web, reabra o mês e tente novamente\\.',
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    const dados = {
      usuarioId: dadosBrutos.usuarioId,
      descricao: dadosBrutos.descricao,
      valor: dadosBrutos.valor,
      tipo: dbTipo,
      status: STATUS.PENDENTE,
      parcelaAtual: dadosBrutos.parcelaAtual || null,
      totalParcelas: dadosBrutos.totalParcelas || null,
      nomeTerceiro: dadosBrutos.terceiro || null,
      dataBase: dataBase,
    };

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

module.exports = { criarBot };
