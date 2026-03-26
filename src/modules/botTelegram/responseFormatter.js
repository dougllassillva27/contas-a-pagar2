// ==============================================================================
// 💬 Formatador de Respostas do Telegram
// Monta as mensagens que o bot envia de volta ao usuário,
// no estilo visual do app Atalhos HTTP original...
// ==============================================================================

const { TIPO } = require('../../constants');

/**
 * Mapa de usuario_id → nome para exibição.
 * Centralizado aqui para manutenção fácil.
 */
const NOMES_USUARIOS = {
  1: 'Dodo',
  2: 'Vitória',
};

/**
 * Formata a resposta de sucesso para enviar no Telegram.
 *
 * @param {object} dados — objeto retornado pelo parser (após inserção)
 * @returns {string} — mensagem formatada
 */
function formatarSucesso(dados) {
  const nomeUsuario = NOMES_USUARIOS[dados.usuarioId] || `Usuário ${dados.usuarioId}`;
  const valorFormatado = `R$ ${dados.valor.toFixed(2).replace('.', ',')}`;
  const detalheTipo = montarDetalheTipo(dados);
  const terceiro = dados.nomeTerceiro || '—';

  return ['🏦 *Contas a Pagar \\- Lançamentos*', '', '✅ CONTA LANÇADA COM SUCESSO', '', `👤 Usuário: ${escaparMarkdown(nomeUsuario)}`, `📋 Descrição: ${escaparMarkdown(dados.descricao)}`, `💰 Valor: ${escaparMarkdown(valorFormatado)}`, `📌 Tipo: ${escaparMarkdown(detalheTipo)}`, `🏷️ Terceiro: ${escaparMarkdown(terceiro)}`].join('\n');
}

/**
 * Formata a resposta de erro para enviar no Telegram.
 *
 * @param {string} mensagemErro — descrição do erro
 * @returns {string} — mensagem formatada
 */
function formatarErro(mensagemErro) {
  return ['🏦 *Contas a Pagar \\- Lançamentos*', '', `❌ ${escaparMarkdown(mensagemErro)}`].join('\n');
}

/**
 * Monta o detalhe do tipo (ex: "Conta Fixa", "Crédito à vista", "Parcelado 1/10").
 */
function montarDetalheTipo(dados) {
  if (dados.tipo === TIPO.FIXA) return 'Conta Fixa';
  if (dados.totalParcelas) return `Parcelado ${dados.parcelaAtual}/${dados.totalParcelas}`;
  return 'Crédito à vista';
}

/**
 * Escapa caracteres especiais do MarkdownV2 do Telegram.
 * Referência: https://core.telegram.org/bots/api#markdownv2-style
 */
function escaparMarkdown(texto) {
  if (!texto) return '';
  return String(texto).replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

module.exports = { formatarSucesso, formatarErro, escaparMarkdown, NOMES_USUARIOS };
