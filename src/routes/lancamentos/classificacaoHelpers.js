const { STATUS, TIPO } = require('../../constants');
const { normalizarParcelasPorTipo } = require('../../helpers/parseHelpers');

/**
 * Classifica o tipo de lançamento a partir dos dados do formulário.
 * Centraliza a lógica usada tanto no POST (criar) quanto no PUT (editar).
 *
 * @returns {{ dbTipo, dbCategoria, pAtual, pTotal, dbStatus, erro? }}
 */
function classificarLancamento({ tipo_transacao, sub_tipo, parcelas }) {
  let dbTipo = sub_tipo === 'Fixa' ? TIPO.FIXA : TIPO.CARTAO;
  let dbStatus = STATUS.PENDENTE;
  let pAtual = null;
  let pTotal = null;
  let dbCategoria = null;

  if (tipo_transacao === TIPO.RENDA) {
    dbTipo = TIPO.RENDA;
    dbStatus = STATUS.PAGO;
    dbCategoria = sub_tipo;
  } else if (sub_tipo === 'Parcelada') {
    const parcelasNorm = normalizarParcelasPorTipo({
      isParcelada: true,
      parcelasRaw: parcelas,
    });

    if (parcelasNorm.erro) {
      return { erro: parcelasNorm.erro };
    }

    pAtual = parcelasNorm.parcelaAtual;
    pTotal = parcelasNorm.totalParcelas;
  }

  return { dbTipo, dbCategoria, dbStatus, pAtual, pTotal };
}

// Helper para escapar strings em contextos JavaScript (previne XSS em onclick)
const safeJs = (str) =>
  String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");

module.exports = { classificarLancamento, safeJs };
