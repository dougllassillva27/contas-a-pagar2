// ==============================================================================
// 🧪 Testes do Parser de Mensagem do Telegram
// ==============================================================================

const { parseMensagem } = require('../../botTelegram/messageParser');

describe('parseMensagem', () => {
  // ============================================================
  // Mensagens válidas
  // ============================================================

  test('mensagem completa com todos os campos', () => {
    const resultado = parseMensagem('1; Internet; R$ 100,00; fixa; ; Vitoria');

    expect(resultado.sucesso).toBe(true);
    expect(resultado.dados.usuarioId).toBe(1);
    expect(resultado.dados.descricao).toBe('Internet');
    expect(resultado.dados.valor).toBe(100.0);
    expect(resultado.dados.tipo).toBe('FIXA');
    expect(resultado.dados.nomeTerceiro).toBe('Vitoria');
    expect(resultado.dados.parcelaAtual).toBeNull();
    expect(resultado.dados.totalParcelas).toBeNull();
  });

  test('mensagem com parcelas (número total)', () => {
    const resultado = parseMensagem('1; Tênis Nike; R$ 500,00; parcelada; 10; Vitoria');

    expect(resultado.sucesso).toBe(true);
    expect(resultado.dados.tipo).toBe('CARTAO');
    expect(resultado.dados.parcelaAtual).toBe(1);
    expect(resultado.dados.totalParcelas).toBe(10);
    expect(resultado.dados.nomeTerceiro).toBe('Vitoria');
  });

  test('mensagem com parcelas no formato "1/10"', () => {
    const resultado = parseMensagem('1; Tênis; R$ 500,00; parcelada; 3/10;');

    expect(resultado.sucesso).toBe(true);
    expect(resultado.dados.parcelaAtual).toBe(3);
    expect(resultado.dados.totalParcelas).toBe(10);
  });

  test('mensagem tipo "unica" — crédito à vista', () => {
    const resultado = parseMensagem('2; Mercado; 250; unica; ;');

    expect(resultado.sucesso).toBe(true);
    expect(resultado.dados.usuarioId).toBe(2);
    expect(resultado.dados.valor).toBe(250);
    expect(resultado.dados.tipo).toBe('CARTAO');
    expect(resultado.dados.parcelaAtual).toBeNull();
    expect(resultado.dados.totalParcelas).toBeNull();
  });

  test('mensagem sem terceiro — deve ser null', () => {
    const resultado = parseMensagem('1; Luz; R$ 80,00; fixa; ;');

    expect(resultado.sucesso).toBe(true);
    expect(resultado.dados.nomeTerceiro).toBeNull();
  });

  test('valor em formato simples (sem R$)', () => {
    const resultado = parseMensagem('1; Aluguel; 1200; fixa; ;');

    expect(resultado.sucesso).toBe(true);
    expect(resultado.dados.valor).toBe(1200);
  });

  test('valor com separador de milhar brasileiro', () => {
    const resultado = parseMensagem('1; Aluguel; R$ 1.200,50; fixa; ;');

    expect(resultado.sucesso).toBe(true);
    expect(resultado.dados.valor).toBe(1200.5);
  });

  test('mensagem com apenas campos obrigatórios (4 campos)', () => {
    const resultado = parseMensagem('1; Teste; 50; unica');

    expect(resultado.sucesso).toBe(true);
    expect(resultado.dados.descricao).toBe('Teste');
    expect(resultado.dados.valor).toBe(50);
  });

  // ============================================================
  // Mensagens inválidas
  // ============================================================

  test('mensagem vazia — retorna erro', () => {
    const resultado = parseMensagem('');

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toContain('vazia');
  });

  test('null — retorna erro', () => {
    const resultado = parseMensagem(null);

    expect(resultado.sucesso).toBe(false);
  });

  test('undefined — retorna erro', () => {
    const resultado = parseMensagem(undefined);

    expect(resultado.sucesso).toBe(false);
  });

  test('poucos campos — retorna erro de formato', () => {
    const resultado = parseMensagem('1; Internet; 100');

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toContain('Formato');
  });

  test('usuario_id não numérico — retorna erro', () => {
    const resultado = parseMensagem('abc; Internet; 100; fixa; ;');

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toContain('usuário');
  });

  test('usuario_id zero — retorna erro', () => {
    const resultado = parseMensagem('0; Internet; 100; fixa; ;');

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toContain('usuário');
  });

  test('descrição vazia — retorna erro', () => {
    const resultado = parseMensagem('1; ; 100; fixa; ;');

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toContain('Descrição');
  });

  test('valor zero — retorna erro', () => {
    const resultado = parseMensagem('1; Internet; 0; fixa; ;');

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toContain('Valor');
  });

  test('valor texto inválido — retorna erro', () => {
    const resultado = parseMensagem('1; Internet; abc; fixa; ;');

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toContain('Valor');
  });

  test('parcelas inválidas em tipo parcelada — retorna erro', () => {
    const resultado = parseMensagem('1; Tênis; 500; parcelada; 1; ');

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toContain('Parcelas');
  });
});
