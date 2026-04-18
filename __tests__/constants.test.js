// ==============================================================================
// 🧪 TESTES UNITÁRIOS — Constants
// ==============================================================================

const constants = require('../src/constants');

describe('Constantes do Sistema (constants.js)', () => {
  test('STATUS contém PENDENTE e PAGO', () => {
    expect(constants.STATUS.PENDENTE).toBe('PENDENTE');
    expect(constants.STATUS.PAGO).toBe('PAGO');
  });

  test('TIPO contém FIXA, CARTAO e RENDA', () => {
    expect(constants.TIPO.FIXA).toBe('FIXA');
    expect(constants.TIPO.CARTAO).toBe('CARTAO');
    expect(constants.TIPO.RENDA).toBe('RENDA');
  });

  test('LIMITES possui valores numéricos válidos', () => {
    expect(typeof constants.LIMITES.ULTIMOS_LANCAMENTOS).toBe('number');
  });

  test('SQL_SEM_TERCEIRO retorna a string exata de validação nula', () => {
    expect(constants.SQL_SEM_TERCEIRO).toBe("(NomeTerceiro IS NULL OR NomeTerceiro = '')");
  });
});
