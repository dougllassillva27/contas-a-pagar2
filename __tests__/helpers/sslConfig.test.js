// ==============================================================================
// 🧪 TESTES — Configuração de TLS do Postgres
// ==============================================================================

const { montarSsl } = require('../../src/config/sslConfig');

describe('montarSsl', () => {
  test('sem sslmode e sem override: sem TLS (banco local)', () => {
    expect(montarSsl('postgresql://u:p@postgres-contas:5432/contas', '')).toBe(false);
  });

  test('sslmode=disable: sem TLS', () => {
    expect(montarSsl('postgresql://u:p@host:5432/db?sslmode=disable', '')).toBe(false);
  });

  test('sslmode=require: cifra sem validar certificado', () => {
    expect(montarSsl('postgresql://u:p@host:5432/db?sslmode=require', '')).toEqual({
      rejectUnauthorized: false,
    });
  });

  test('sslmode=verify-full: valida certificado', () => {
    expect(montarSsl('postgresql://u:p@host:5432/db?sslmode=verify-full', '')).toEqual({
      rejectUnauthorized: true,
    });
  });

  test('sslmode=verify-ca: valida certificado', () => {
    expect(montarSsl('postgresql://u:p@host:5432/db?sslmode=verify-ca', '')).toEqual({
      rejectUnauthorized: true,
    });
  });

  test('override true força validação mesmo em require', () => {
    expect(montarSsl('postgresql://u:p@host:5432/db?sslmode=require', 'true')).toEqual({
      rejectUnauthorized: true,
    });
  });

  test('override false relaxa validação', () => {
    expect(montarSsl('postgresql://u:p@host:5432/db?sslmode=verify-full', 'false')).toEqual({
      rejectUnauthorized: false,
    });
  });

  test('override true sem sslmode liga TLS com validação', () => {
    expect(montarSsl('postgresql://u:p@host:5432/db', 'true')).toEqual({ rejectUnauthorized: true });
  });
});
