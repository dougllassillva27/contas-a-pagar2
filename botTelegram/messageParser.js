// ==============================================================================
// 📩 Parser de Mensagem do Telegram
// Converte uma mensagem de texto separada por ponto e vírgula
// em um objeto estruturado para inserção no sistema.
// ==============================================================================

const { parseValor, normalizarTipoIntegracao, normalizarParcelasPorTipo } = require('../src/helpers/parseHelpers');
const { STATUS, TIPO } = require('../src/constants');

/**
 * Formato esperado da mensagem:
 * "usuario_id; descricao; valor; tipo; parcelas; terceiro"
 *
 * Exemplos:
 *   "1; Internet; R$ 100,00; fixa; ;"
 *   "1; Tênis Nike; R$ 500,00; parcelada; 10; Vitoria"
 *   "2; Aluguel; 1200; fixa; ; "
 */

const CAMPOS_MINIMOS = 4;

/**
 * Faz o parse da mensagem do Telegram.
 *
 * @param {string} mensagem — texto cru recebido do Telegram
 * @returns {{ sucesso: boolean, dados?: object, erro?: string }}
 */
function parseMensagem(mensagem) {
  if (!mensagem || typeof mensagem !== 'string') {
    return { sucesso: false, erro: 'Mensagem vazia ou inválida.' };
  }

  const partes = mensagem.split(';').map((p) => p.trim());

  if (partes.length < CAMPOS_MINIMOS) {
    return {
      sucesso: false,
      erro: formatoEsperado(),
    };
  }

  const [usuarioRaw, descricao, valorRaw, tipoRaw, parcelasRaw, terceiroRaw] = partes;

  // --- Validação do usuario_id ---
  const usuarioId = parseInt(usuarioRaw, 10);
  if (!Number.isFinite(usuarioId) || usuarioId <= 0) {
    return { sucesso: false, erro: 'ID do usuário inválido. Use 1 (Dodo) ou 2 (Vitória).' };
  }

  // --- Validação da descrição ---
  if (!descricao) {
    return { sucesso: false, erro: 'Descrição é obrigatória.' };
  }

  // --- Valor ---
  const valor = parseValor(valorRaw);
  if (valor <= 0) {
    return { sucesso: false, erro: 'Valor inválido. Envie algo como "R$ 100,00" ou "100".' };
  }

  // --- Tipo ---
  const tipoNorm = normalizarTipoIntegracao(tipoRaw);
  if (!tipoNorm) {
    return { sucesso: false, erro: 'Tipo é obrigatório. Use: fixa, unica ou parcelada.' };
  }

  const isFixa = tipoNorm === 'fixa';
  const isParcelada = tipoNorm === 'parcelada';
  const dbTipo = isFixa ? TIPO.FIXA : TIPO.CARTAO;

  // --- Parcelas ---
  const parcelasNorm = normalizarParcelasPorTipo({
    isParcelada,
    parcelasRaw: parcelasRaw || '',
  });

  if (parcelasNorm.erro) {
    return { sucesso: false, erro: parcelasNorm.erro };
  }

  // --- Monta objeto final ---
  return {
    sucesso: true,
    dados: {
      usuarioId,
      descricao,
      valor,
      tipo: dbTipo,
      status: STATUS.PENDENTE,
      parcelaAtual: parcelasNorm.parcelaAtual,
      totalParcelas: parcelasNorm.totalParcelas,
      nomeTerceiro: terceiroRaw || null,
      dataBase: new Date(),
    },
  };
}

/**
 * Retorna a mensagem de ajuda com o formato esperado.
 */
function formatoEsperado() {
  return '❌ Formato inválido.\n\n' + '📝 Formato esperado:\n' + 'usuario_id; descricao; valor; tipo; parcelas; terceiro\n\n' + '📌 Exemplos:\n' + '1; Internet; R$ 100,00; fixa; ;\n' + '1; Tênis; R$ 500,00; parcelada; 10; Vitoria\n' + '2; Mercado; 250; unica; ;';
}

module.exports = { parseMensagem, formatoEsperado };
