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
const { formatarSucesso, formatarSucessoBulk, formatarErro } = require('./responseFormatter');
const { STATUS, TIPO } = require('../../constants');

// Teclado inline acoplado ao balão da mensagem
const MENU_PRINCIPAL = {
  inline_keyboard: [
    [
      { text: '🧑 Dodo', callback_data: 'iniciar:dodo' },
      { text: '👩 Vitória', callback_data: 'iniciar:vitoria' },
    ],
  ],
};

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

    await processarCallback(bot, chatId, query, repo);
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
    await bot.sendMessage(chatId, '❌ Lançamento cancelado\\.', {
      parse_mode: 'MarkdownV2',
    });
    await bot.sendMessage(chatId, '👇 Deseja lançar mais alguma conta?', {
      reply_markup: MENU_PRINCIPAL,
    });
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
    await bot.sendMessage(chatId, ajuda, { parse_mode: 'MarkdownV2', reply_markup: MENU_PRINCIPAL });
    return;
  }

  await bot.sendMessage(chatId, 'Comando não reconhecido\\. Use /help', {
    parse_mode: 'MarkdownV2',
    reply_markup: MENU_PRINCIPAL,
  });
}

// ==============================================================================
// Processar resposta de texto (campos livres)
// ==============================================================================

async function processarTexto(bot, chatId, texto, repo) {
  const conversa = obterConversa(chatId);

  // Se não há conversa ativa, responde com o menu em vez de ficar mudo
  if (!conversa) {
    // Intercepta cliques residuais do teclado antigo (cache do app)
    if (texto === '🧑 Lançar Dodo' || texto === '👩 Lançar Vitória') {
      // Mantém a mensagem visível para forçar a limpeza definitiva do cache no mobile
      await bot.sendMessage(chatId, '🔄 Sincronizando interface...', {
        reply_markup: { remove_keyboard: true },
      });

      const arg = texto === '🧑 Lançar Dodo' ? 'dodo' : 'vitoria';
      await tratarComando(bot, chatId, `/iniciar${arg}`);
      return;
    }

    // Remove o teclado antigo do rodapé de forma definitiva mantendo a instrução no histórico
    await bot.sendMessage(chatId, '🔄 Sincronizando interface...', { reply_markup: { remove_keyboard: true } });

    await bot.sendMessage(chatId, '👇 Olá! Clique em um dos botões abaixo para iniciar um lançamento:', {
      reply_markup: MENU_PRINCIPAL,
    });
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

async function processarCallback(bot, chatId, query, repo) {
  const data = query.data;
  const messageId = query.message.message_id;
  // Callbacks têm formato: "campo:valor" (ex: "usuario:1", "tipo:fixa", "iniciar:dodo")
  const [campo, valor] = data.split(':');

  // Intercepta botões inline do menu principal antes de verificar conversa
  if (campo === 'iniciar') {
    const label = valor === 'dodo' ? '🧑 Dodo' : '👩 Vitória';

    bot
      .editMessageText(`✅ Lançar para: ${label}\n\u2800`, {
        chat_id: chatId,
        message_id: messageId,
      })
      .catch(() => {});

    await tratarComando(bot, chatId, `/iniciar${valor}`);
    return;
  }

  const conversa = obterConversa(chatId);
  if (!conversa) {
    bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId }).catch(() => {});
    await bot.sendMessage(chatId, 'Nenhum lançamento em andamento\\. Use /novo para iniciar\\.', {
      parse_mode: 'MarkdownV2',
    });
    return;
  }

  if (campo === 'usuario') {
    const label = valor === '1' ? '🧑 Dodo' : '👩 Vitória';
    await bot
      .editMessageText(`✅ *Conta:* ${label}\n\u2800`, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'MarkdownV2',
      })
      .catch(() => {});
    await avancarEEnviarProxima(bot, chatId, 'usuarioId', parseInt(valor, 10), repo);
  } else if (campo === 'tipo') {
    const labels = { fixa: '🔁 Fixa', unica: '1️⃣ Única', parcelada: '📊 Parcelada' };
    const label = labels[valor] || valor;
    await bot
      .editMessageText(`✅ *Tipo:* ${label}\n\u2800`, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'MarkdownV2',
      })
      .catch(() => {});

    // Salvar tipo normalizado para a lógica de parcelas
    conversa.dados.tipo = valor;
    const proxima = avancarConversa(chatId, 'tipo', valor);
    if (!proxima) {
      await finalizarEInserir(bot, chatId, repo);
    } else {
      await enviarPergunta(bot, chatId, proxima);
    }
  } else if (campo === 'terceiro') {
    // Se for 'eu' ou 'pular', salva null (conta própria), senão salva o nome
    const nomeTerceiro = valor === 'eu' || valor === 'pular' ? null : valor;
    const label = nomeTerceiro ? nomeTerceiro : '👤 Conta Própria';
    await bot
      .editMessageText(`✅ *Terceiro:* ${label}\n\u2800`, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'MarkdownV2',
      })
      .catch(() => {});

    await avancarEEnviarProxima(bot, chatId, 'terceiro', nomeTerceiro, repo);
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
      await bot.sendMessage(
        chatId,
        '🏷️ *Terceiro \\(de quem é a conta\\)?*\n_Selecione ou digite nomes separados por vírgula:_',
        {
          parse_mode: 'MarkdownV2',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '👤 Eu (própria)', callback_data: 'terceiro:eu' },
                { text: '🏠 Casa', callback_data: 'terceiro:Casa' },
              ],
              [
                { text: '❤️ Morr', callback_data: 'terceiro:Morr' },
                { text: '👩‍👧 Mãe', callback_data: 'terceiro:Mãe' },
              ],
              [
                { text: '👴 Vô', callback_data: 'terceiro:Vô' },
                { text: '👦 Davi', callback_data: 'terceiro:Davi' },
              ],
              [
                { text: '👧 Amanda', callback_data: 'terceiro:Amanda' },
                { text: '👦 Lorenzo', callback_data: 'terceiro:Lorenzo' },
              ],
            ],
          },
        }
      );
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

    // Interceptação para Lançamento em Lote (Bulk)
    let isBulk = false;
    let listaTerceiros = [];
    if (dadosBrutos.terceiro && dadosBrutos.terceiro.includes(',')) {
      listaTerceiros = dadosBrutos.terceiro
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n.length > 0);
      if (listaTerceiros.length > 1) {
        isBulk = true;
      }
    }

    if (isBulk) {
      const result = await repo.addLancamentosBulk(
        dados.usuarioId,
        {
          descricao: dados.descricao,
          valor: dados.valor,
          tipo: dados.tipo,
          status: dados.status,
          parcelaAtual: dados.parcelaAtual,
          totalParcelas: dados.totalParcelas,
          dataBase: dados.dataBase,
        },
        listaTerceiros
      );
      await bot.sendMessage(chatId, formatarSucessoBulk(dados, listaTerceiros, result.criados), {
        parse_mode: 'MarkdownV2',
      });
    } else {
      await repo.addLancamento(dados.usuarioId, {
        ...dados,
        // Asseguramos não passar o id para o insert, o resto já está estruturado
      });
      await bot.sendMessage(chatId, formatarSucesso(dados), { parse_mode: 'MarkdownV2' });
    }

    await bot.sendMessage(chatId, '👇 Deseja lançar mais alguma conta?', {
      reply_markup: MENU_PRINCIPAL,
    });
  } catch (err) {
    console.error('[Telegram] Erro ao inserir lançamento:', err.message);
    await bot.sendMessage(chatId, formatarErro('Erro interno ao registrar. Tente novamente.'), {
      parse_mode: 'MarkdownV2',
    });
    await bot.sendMessage(chatId, '👇 Tentar novamente ou lançar outra conta?', {
      reply_markup: MENU_PRINCIPAL,
    });
  }
}

module.exports = { criarBot };
