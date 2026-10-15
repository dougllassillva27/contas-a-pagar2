// ==============================================================================
// 🔧 Helpers (funções utilitárias)
// Extraído de app.js — sem alteração de lógica
// ==============================================================================

/**
 * Converte valores vindos do front para número.
 * Aceita entradas como:
 * - "R$ 1.234,56"
 * - "1234,56"
 * - "1234.56"
 */
const parseValor = (v) => {
  if (v === null || v === undefined || v === '') return 0.0;

  const str = String(v).trim();
  // remove "R$", remove separador de milhar, troca vírgula por ponto
  const normalizado = str.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(normalizado);
  return Number.isFinite(n) ? n : 0.0;
};

/**
 * Normaliza texto: sempre retorna string trimada.
 * Evita "undefined", "null" e espaços extras.
 */
const normalizarTexto = (v) => String(v || '').trim();

/**
 * Normaliza o "tipo" da integração Android:
 * - entrada: "Fixa", "fixa", " parcelada "
 * - saída: "fixa", "parcelada"...
 */
const normalizarTipoIntegracao = (tipo) => normalizarTexto(tipo).toLowerCase();

/**
 * Faz parsing de parcelas em formatos flexíveis, para integração:
 * - "10"   => { atual: 1, total: 10 }
 * - "1/10" => { atual: 1, total: 10 }
 * - ""/null => { atual: null, total: null }
 */
const parseParcelasFlex = (parcelasRaw) => {
  const raw = normalizarTexto(parcelasRaw);
  if (!raw) return { atual: null, total: null };

  if (raw.includes('/')) {
    const [a, b] = raw.split('/');
    const atual = parseInt(a, 10);
    const total = parseInt(b, 10);

    return {
      atual: Number.isFinite(atual) ? atual : null,
      total: Number.isFinite(total) ? total : null,
    };
  }

  const total = parseInt(raw, 10);
  return {
    atual: 1,
    total: Number.isFinite(total) ? total : null,
  };
};

/**
 * Regra única de negócio (SRP): parcelas são gravadas quando VÊM no payload.
 *
 * Histórico (14/10/2026): antes esta função descartava as parcelas sempre que
 * `isParcelada` fosse false — e `isParcelada` só era true para tipo
 * 'parcelada'/'parcelado'. Como 'parcelado' grava Tipo=PARCELADO, que NÃO aparece
 * em nenhuma tela do app, era impossível criar uma parcelada visível E com
 * parcelas pela API. A UI nunca teve esse problema: `classificarLancamento`
 * grava CARTAO com pAtual/pTotal.
 *
 * O tipo deixou de decidir se as parcelas existem: `totalParcelas` é o marcador
 * de parcelada (é o que o dashboard projeta). `isParcelada` é mantido na
 * assinatura por compatibilidade, mas não filtra mais nada.
 *
 * - Sem parcelas no payload  => { parcelaAtual: null, totalParcelas: null }
 * - Com parcelas             => aceita "10" ou "1/10"; valida total >= 2,
 *                               atual >= 1 e atual <= total
 */
const normalizarParcelasPorTipo = ({ isParcelada, parcelasRaw }) => {
  const bruto = parcelasRaw === undefined || parcelasRaw === null
    ? ''
    : String(parcelasRaw).trim();

  if (!bruto) {
    return { parcelaAtual: null, totalParcelas: null };
  }

  const { atual, total } = parseParcelasFlex(bruto);

  // Validação mínima (sem ser agressiva demais)
  if (!total || total < 2 || !atual || atual < 1 || atual > total) {
    return { erro: 'Parcelas inválidas. Envie "10" ou "1/10" (total >= 2).' };
  }

  return { parcelaAtual: atual, totalParcelas: total };
};

module.exports = {
  parseValor,
  normalizarTexto,
  normalizarTipoIntegracao,
  parseParcelasFlex,
  normalizarParcelasPorTipo,
};
