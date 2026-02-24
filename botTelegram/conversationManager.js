// ==============================================================================
// 💬 Gerenciador de Conversas do Bot Telegram
// Máquina de estados que controla o fluxo passo a passo.
// Cada chat tem seu próprio estado independente.
// ==============================================================================

/**
 * Etapas da conversa, em ordem:
 * 1. USUARIO   → Inline keyboard (Dodo / Vitória)
 * 2. DESCRICAO → Texto livre
 * 3. VALOR     → Texto livre
 * 4. TIPO      → Inline keyboard (Fixa / Única / Parcelada)
 * 5. PARCELAS  → Texto livre (SÓ se tipo = parcelada)
 * 6. TERCEIRO  → Texto livre
 * 7. (fim)     → Insere no banco
 */
const ETAPAS = {
  USUARIO: 'USUARIO',
  DESCRICAO: 'DESCRICAO',
  VALOR: 'VALOR',
  TIPO: 'TIPO',
  PARCELAS: 'PARCELAS',
  TERCEIRO: 'TERCEIRO',
};

// Ordem das etapas (parcelas é condicional, tratada no fluxo)
const FLUXO_PADRAO = [
  ETAPAS.USUARIO,
  ETAPAS.DESCRICAO,
  ETAPAS.VALOR,
  ETAPAS.TIPO,
  // PARCELAS é inserido dinamicamente se tipo = parcelada
  ETAPAS.TERCEIRO,
];

/**
 * Armazena conversas ativas em memória.
 * Chave: chatId (string), Valor: { etapa, dados }
 *
 * Para uso pessoal com 1 usuário, Map em memória é suficiente.
 */
const conversas = new Map();

/**
 * Inicia uma nova conversa, resetando o estado.
 */
function iniciarConversa(chatId) {
  conversas.set(String(chatId), {
    etapa: ETAPAS.USUARIO,
    dados: {},
  });
}

/**
 * Retorna o estado atual da conversa, ou null se não há conversa ativa.
 */
function obterConversa(chatId) {
  return conversas.get(String(chatId)) || null;
}

/**
 * Salva um valor no estado da conversa e avança para a próxima etapa.
 *
 * @returns {string|null} — próxima etapa, ou null se conversa finalizada
 */
function avancarConversa(chatId, campo, valor) {
  const conversa = conversas.get(String(chatId));
  if (!conversa) return null;

  conversa.dados[campo] = valor;

  const proximaEtapa = calcularProximaEtapa(conversa.etapa, conversa.dados);
  conversa.etapa = proximaEtapa;

  return proximaEtapa;
}

/**
 * Retorna os dados coletados de uma conversa finalizada e limpa o estado.
 */
function finalizarConversa(chatId) {
  const conversa = conversas.get(String(chatId));
  if (!conversa) return null;

  const dados = { ...conversa.dados };
  conversas.delete(String(chatId));
  return dados;
}

/**
 * Cancela uma conversa ativa.
 */
function cancelarConversa(chatId) {
  conversas.delete(String(chatId));
}

/**
 * Calcula a próxima etapa com base na etapa atual e nos dados coletados.
 * Lógica especial: PARCELAS só aparece se tipo = 'parcelada'.
 */
function calcularProximaEtapa(etapaAtual, dados) {
  switch (etapaAtual) {
    case ETAPAS.USUARIO:
      return ETAPAS.DESCRICAO;
    case ETAPAS.DESCRICAO:
      return ETAPAS.VALOR;
    case ETAPAS.VALOR:
      return ETAPAS.TIPO;
    case ETAPAS.TIPO:
      // Se tipo for parcelada, pergunta parcelas; senão, pula para terceiro
      return dados.tipo === 'parcelada' ? ETAPAS.PARCELAS : ETAPAS.TERCEIRO;
    case ETAPAS.PARCELAS:
      return ETAPAS.TERCEIRO;
    case ETAPAS.TERCEIRO:
      return null; // Conversa finalizada
    default:
      return null;
  }
}

module.exports = {
  ETAPAS,
  iniciarConversa,
  obterConversa,
  avancarConversa,
  finalizarConversa,
  cancelarConversa,
  calcularProximaEtapa,
};
