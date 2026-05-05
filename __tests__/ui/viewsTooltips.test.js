const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

// ==============================================================================
// TESTE UNITÁRIO/INTEGRAÇÃO DE VIEWS (SERVER-SIDE HTML)
// Garante que as lógicas condicionais do EJS injetem os tooltips corretamente
// sem precisar rodar o Express + Banco de Dados.
// ==============================================================================
describe('Tooltips 100% CSS nos Templates EJS', () => {
  const viewPath = path.resolve(__dirname, '../../src/views/index.ejs');

  test('Injeta atributos data-tooltip corretamente para faturas finais e ações', async () => {
    // Mock completo dos objetos injetados pelo controller
    const mockData = {
      nav: {
        atual: { month: 5, year: 2026, dateObj: new Date(2026, 4, 1) },
        ant: { month: 4, year: 2026 },
        prox: { month: 6, year: 2026 },
      },
      currentPath: '/',
      query: {},
      user: { nome: 'DouglasTest', id: 1 },
      mesFechado: false,
      configuracoes: { divisao_casa_minimo: '750.00' },
      totais: { totalrendas: 0, totalcontas: 0, faltapagar: 0, saldoprevisto: 0 },
      totalCasa: 0,
      faturaManual: 0,
      fixas: [],
      cartao: [
        {
          id: 1,
          descricao: 'Fatura Simulada do JSDOM',
          valor: 150.5,
          status: 'PENDENTE',
          parcelaatual: 3, // <-- Última parcela simulada
          totalparcelas: 3,
        },
      ],
      resumoPessoas: [{ pessoa: 'Amigo', total: 100 }],
      terceiros: [],
      // Fallback function global usada nas views
      safeJs: (str) => str || '',
    };

    // Compila o EJS diretamente para HTML puro
    const html = await ejs.renderFile(viewPath, mockData);

    // Asserções Visuais: Tooltip de Última Parcela
    expect(html).toContain('data-tooltip="Última parcela ✅"');

    // Asserções Visuais: Ícone de Visão (Olho)
    expect(html).toContain('data-tooltip="Visualizar contas"');

    // Asserções Visuais: Botões de Ação com direção forced-left
    expect(html).toContain('data-tooltip="Editar conta"');
    expect(html).toContain('data-tooltip-dir="left"');
  });
});
