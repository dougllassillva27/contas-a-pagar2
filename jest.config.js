// ==============================================================================
// ⚙️ Configuração do Jest
// ==============================================================================

module.exports = {
  // Ambiente Node.js (não browser)
  testEnvironment: 'node',

  // Mostra cada teste individualmente
  verbose: true,

  // Onde buscar os testes
  testMatch: ['**/__tests__/**/*.test.js'],

  // Timeout para testes que acessam o banco (integração)
  testTimeout: 10000,
};
