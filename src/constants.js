// ==============================================================================
// Constantes do Sistema
// Centraliza valores que se repetem pelo código, evitando "magic strings".
// ==============================================================================

const STATUS = {
  PENDENTE: 'PENDENTE',
  PAGO: 'PAGO',
};

const TIPO = {
  FIXA: 'FIXA',
  CARTAO: 'CARTAO',
  RENDA: 'RENDA',
};

const LIMITES = {
  ULTIMOS_LANCAMENTOS: 30,
  BRUTE_FORCE_DELAY_MS: 500,
  ORDEM_DEFAULT: 9999,
};

// Fragmento SQL reutilizável: "sem terceiro" (owner do lançamento)
// Após normalização (initDatabase), apenas NULL é usado (partial index friendly)
const SQL_SEM_TERCEIRO = "NomeTerceiro IS NULL";

module.exports = { STATUS, TIPO, LIMITES, SQL_SEM_TERCEIRO };
