// ==============================================================================
// 🧪 Testes do Formatador de Respostas do Telegram.
// ==============================================================================

const { formatarSucesso, formatarErro, escaparMarkdown } = require('../../botTelegram/responseFormatter');

describe('formatarSucesso', () => {
  test('formata resposta com todos os campos preenchidos', () => {
    const dados = {
      usuarioId: 1,
      descricao: 'Internet',
      valor: 100.0,
      tipo: 'FIXA',
      parcelaAtual: null,
      totalParcelas: null,
      nomeTerceiro: 'Vitoria',
    };

    const resultado = formatarSucesso(dados);

    expect(resultado).toContain('CONTA LANÇADA COM SUCESSO');
    expect(resultado).toContain('Dodo');
    expect(resultado).toContain('Internet');
    expect(resultado).toContain('100,00');
    expect(resultado).toContain('Conta Fixa');
    expect(resultado).toContain('Vitoria');
  });

  test('formata resposta sem terceiro — mostra traço', () => {
    const dados = {
      usuarioId: 1,
      descricao: 'Luz',
      valor: 80.0,
      tipo: 'FIXA',
      parcelaAtual: null,
      totalParcelas: null,
      nomeTerceiro: null,
    };

    const resultado = formatarSucesso(dados);

    expect(resultado).toContain('—');
  });

  test('formata resposta tipo parcelado', () => {
    const dados = {
      usuarioId: 1,
      descricao: 'Tênis',
      valor: 500.0,
      tipo: 'CARTAO',
      parcelaAtual: 1,
      totalParcelas: 10,
      nomeTerceiro: 'Vitoria',
    };

    const resultado = formatarSucesso(dados);

    expect(resultado).toContain('1/10');
    expect(resultado).toContain('Parcelado');
  });

  test('formata resposta tipo crédito à vista', () => {
    const dados = {
      usuarioId: 2,
      descricao: 'Mercado',
      valor: 250.0,
      tipo: 'CARTAO',
      parcelaAtual: null,
      totalParcelas: null,
      nomeTerceiro: null,
    };

    const resultado = formatarSucesso(dados);

    expect(resultado).toContain('Vitória');
    expect(resultado).toContain('Crédito à vista');
  });

  test('formata resposta com usuario_id desconhecido', () => {
    const dados = {
      usuarioId: 99,
      descricao: 'Teste',
      valor: 10.0,
      tipo: 'FIXA',
      parcelaAtual: null,
      totalParcelas: null,
      nomeTerceiro: null,
    };

    const resultado = formatarSucesso(dados);

    expect(resultado).toContain('Usuário 99');
  });
});

describe('formatarErro', () => {
  test('formata mensagem de erro', () => {
    const resultado = formatarErro('Valor inválido.');

    expect(resultado).toContain('Contas a Pagar');
    expect(resultado).toContain('❌');
    expect(resultado).toContain('Valor inválido');
  });
});

describe('escaparMarkdown', () => {
  test('escapa caracteres especiais do MarkdownV2', () => {
    expect(escaparMarkdown('R$ 100.00')).toBe('R$ 100\\.00');
    expect(escaparMarkdown('teste_nome')).toBe('teste\\_nome');
    expect(escaparMarkdown('item (1)')).toBe('item \\(1\\)');
  });

  test('retorna string vazia para null/undefined', () => {
    expect(escaparMarkdown(null)).toBe('');
    expect(escaparMarkdown(undefined)).toBe('');
  });
});
