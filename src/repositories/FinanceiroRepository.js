// ==============================================================================
// FinanceiroRepository — Facade de compatibilidade
//
// Re-exporta todos os métodos dos repositories especializados como um único
// objeto. Garante que app.js e as rotas NÃO precisam mudar:
//   const repo = require('./repositories/FinanceiroRepository');
//   repo.addLancamento(...) // funciona igual
//
// Cada repository pode agora ser testado e mantido isoladamente.
// ==============================================================================

const UsuarioRepository = require('./UsuarioRepository');
const LancamentoRepository = require('./LancamentoRepository');
const AnotacaoRepository = require('./AnotacaoRepository');
const FaturaManualRepository = require('./FaturaManualRepository');
const OrdemCardsRepository = require('./OrdemCardsRepository');
const BackupRepository = require('./BackupRepository');

module.exports = {
  // Usuários
  ...UsuarioRepository,

  // Lançamentos (CRUD + queries)
  ...LancamentoRepository,

  // Anotações
  ...AnotacaoRepository,

  // Fatura Manual
  ...FaturaManualRepository,

  // Ordem dos Cards
  ...OrdemCardsRepository,

  // Backup
  ...BackupRepository,
};
