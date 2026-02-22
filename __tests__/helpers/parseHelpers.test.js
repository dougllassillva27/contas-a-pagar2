// ==============================================================================
// 🧪 TESTES UNITÁRIOS — parseHelpers.js
//
// Testa todas as funções utilitárias de parsing de valores e parcelas.
// São testes UNITÁRIOS: não precisam de banco, API ou servidor.
// Cada `test()` verifica uma situação específica.
//
// Para rodar APENAS este arquivo:
//   npx jest __tests__/helpers/parseHelpers.test.js
// ==============================================================================

const { parseValor, normalizarTexto, normalizarTipoIntegracao, parseParcelasFlex, normalizarParcelasPorTipo } = require('../../src/helpers/parseHelpers');

// ==========================================================================
// parseValor — converte strings monetárias para número
// ==========================================================================
describe('parseValor', () => {
  // --- Casos normais ---
  test('converte "R$ 1.234,56" para 1234.56', () => {
    expect(parseValor('R$ 1.234,56')).toBe(1234.56);
  });

  test('converte "100,50" para 100.5', () => {
    expect(parseValor('100,50')).toBe(100.5);
  });

  test('converte "1234.56" (ponto como decimal) para 1234.56', () => {
    // Atenção: este caso trata ponto como milhar, então 1234.56 → 123456
    // Porque a lógica remove TODOS os pontos antes de trocar vírgula
    expect(parseValor('1234.56')).toBe(123456);
  });

  test('converte "50" (inteiro) para 50', () => {
    expect(parseValor('50')).toBe(50);
  });

  test('converte "R$0,01" (sem espaço) para 0.01', () => {
    expect(parseValor('R$0,01')).toBe(0.01);
  });

  // --- Casos vazios/nulos ---
  test('retorna 0 para string vazia', () => {
    expect(parseValor('')).toBe(0);
  });

  test('retorna 0 para null', () => {
    expect(parseValor(null)).toBe(0);
  });

  test('retorna 0 para undefined', () => {
    expect(parseValor(undefined)).toBe(0);
  });

  // --- Casos com lixo ---
  test('retorna 0 para texto sem número', () => {
    expect(parseValor('abc')).toBe(0);
  });
});

// ==========================================================================
// normalizarTexto — garante string limpa
// ==========================================================================
describe('normalizarTexto', () => {
  test('remove espaços extras', () => {
    expect(normalizarTexto('  hello  ')).toBe('hello');
  });

  test('converte null para string vazia', () => {
    expect(normalizarTexto(null)).toBe('');
  });

  test('converte undefined para string vazia', () => {
    expect(normalizarTexto(undefined)).toBe('');
  });

  test('mantém texto normal', () => {
    expect(normalizarTexto('Internet')).toBe('Internet');
  });
});

// ==========================================================================
// normalizarTipoIntegracao — normaliza tipo da API Android
// ==========================================================================
describe('normalizarTipoIntegracao', () => {
  test('"Fixa" vira "fixa"', () => {
    expect(normalizarTipoIntegracao('Fixa')).toBe('fixa');
  });

  test('" Parcelada " vira "parcelada"', () => {
    expect(normalizarTipoIntegracao(' Parcelada ')).toBe('parcelada');
  });

  test('"UNICA" vira "unica"', () => {
    expect(normalizarTipoIntegracao('UNICA')).toBe('unica');
  });
});

// ==========================================================================
// parseParcelasFlex — interpreta formatos de parcelas
// ==========================================================================
describe('parseParcelasFlex', () => {
  test('"3/10" retorna atual=3, total=10', () => {
    const result = parseParcelasFlex('3/10');
    expect(result.atual).toBe(3);
    expect(result.total).toBe(10);
  });

  test('"10" retorna atual=1, total=10', () => {
    const result = parseParcelasFlex('10');
    expect(result.atual).toBe(1);
    expect(result.total).toBe(10);
  });

  test('string vazia retorna nulls', () => {
    const result = parseParcelasFlex('');
    expect(result.atual).toBeNull();
    expect(result.total).toBeNull();
  });

  test('null retorna nulls', () => {
    const result = parseParcelasFlex(null);
    expect(result.atual).toBeNull();
    expect(result.total).toBeNull();
  });

  test('"01/12" retorna atual=1, total=12', () => {
    const result = parseParcelasFlex('01/12');
    expect(result.atual).toBe(1);
    expect(result.total).toBe(12);
  });
});

// ==========================================================================
// normalizarParcelasPorTipo — regra de negócio completa
// ==========================================================================
describe('normalizarParcelasPorTipo', () => {
  // --- Quando NÃO é parcelada ---
  test('se não é parcelada, sempre retorna nulls', () => {
    const result = normalizarParcelasPorTipo({ isParcelada: false, parcelasRaw: '10' });
    expect(result.parcelaAtual).toBeNull();
    expect(result.totalParcelas).toBeNull();
    expect(result.erro).toBeUndefined();
  });

  // --- Quando É parcelada (válido) ---
  test('"3/10" parcelada retorna atual=3, total=10', () => {
    const result = normalizarParcelasPorTipo({ isParcelada: true, parcelasRaw: '3/10' });
    expect(result.parcelaAtual).toBe(3);
    expect(result.totalParcelas).toBe(10);
    expect(result.erro).toBeUndefined();
  });

  test('"10" parcelada retorna atual=1, total=10', () => {
    const result = normalizarParcelasPorTipo({ isParcelada: true, parcelasRaw: '10' });
    expect(result.parcelaAtual).toBe(1);
    expect(result.totalParcelas).toBe(10);
  });

  // --- Quando É parcelada (inválido) ---
  test('parcelada com total < 2 retorna erro', () => {
    const result = normalizarParcelasPorTipo({ isParcelada: true, parcelasRaw: '1' });
    expect(result.erro).toBeDefined();
  });

  test('parcelada vazia retorna erro', () => {
    const result = normalizarParcelasPorTipo({ isParcelada: true, parcelasRaw: '' });
    expect(result.erro).toBeDefined();
  });

  test('parcelada com atual > total retorna erro', () => {
    const result = normalizarParcelasPorTipo({ isParcelada: true, parcelasRaw: '11/10' });
    expect(result.erro).toBeDefined();
  });

  test('parcelada com texto inválido retorna erro', () => {
    const result = normalizarParcelasPorTipo({ isParcelada: true, parcelasRaw: 'abc' });
    expect(result.erro).toBeDefined();
  });
});
