// ==============================================================================
// 🧪 TESTES — Política mínima de senha
// ==============================================================================

const { validarSenha, TAMANHO_MINIMO } = require('../../src/helpers/passwordPolicy');

describe('validarSenha', () => {
  test('aceita senha longa e não óbvia', () => {
    expect(validarSenha('cafe-com-pao-2026')).toEqual({ ok: true });
  });

  test('recusa senha vazia', () => {
    expect(validarSenha('').ok).toBe(false);
    expect(validarSenha(undefined).ok).toBe(false);
    expect(validarSenha(null).ok).toBe(false);
    expect(validarSenha(12345678901234).ok).toBe(false);
  });

  test('recusa senha menor que o mínimo', () => {
    const curta = 'a'.repeat(TAMANHO_MINIMO - 1);
    const resultado = validarSenha(curta);
    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toMatch(String(TAMANHO_MINIMO));
  });

  test('aceita exatamente o tamanho mínimo', () => {
    expect(validarSenha('a1b2c3d4e5f6').ok).toBe(true); // 12 chars, variada
  });

  test('recusa senha acima de 128 caracteres', () => {
    expect(validarSenha('a1'.repeat(70)).ok).toBe(false);
  });

  test('recusa senha igual ao login', () => {
    const resultado = validarSenha('douglas-silva', 'douglas-silva');
    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toMatch(/igual ao login/i);
  });

  test('recusa senha comum que passa no tamanho', () => {
    expect(validarSenha('123456789012').ok).toBe(false);
  });

  test('recusa senha com um único caractere repetido', () => {
    expect(validarSenha('aaaaaaaaaaaa').ok).toBe(false);
  });
});
