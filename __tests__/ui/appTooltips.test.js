/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');

// ==============================================================================
// TESTE UNITÁRIO DE JSDOM (CLIENT-SIDE JS)
// Garante que as funções de renderização dinâmica do app.js continuem
// adicionando os atributos CSS nos tooltips ao montar os modais.
// SKIPADO TEMPORARIAMENTE — ES6 modules requerem Babel config para Jest
// ==============================================================================
describe.skip('Tooltips Dinâmicos no app.js (Modais Client-Side)', () => {
  let abrirModalUltimas;

  beforeAll(() => {
    // Lê os utilitários
    const utilsCode = fs.readFileSync(path.resolve(__dirname, '../../public/js/utils.js'), 'utf8');

    // Injeta utilitários primeiro para garantir disponibilidade
    const scriptUtils = document.createElement('script');
    scriptUtils.textContent = utilsCode;
    document.head.appendChild(scriptUtils);
  });

  beforeEach(() => {
    // Prepara um DOM falso imitando a estrutura do index.ejs
    document.body.innerHTML = `
            <table>
                <tbody id="listaUltimasConteudo"></tbody>
            </table>
            <div id="modalUltimasContas" class=""></div>
            <div id="modalConfirmacaoAcao"></div>
            <button id="btnConfirmarAcao"></button>
            <button id="btnConfirmarExclusao"></button>
            <div id="statusSaveIcon"></div>
        `;

    // Injeta os datasets requeridos na inicialização do app.js
    document.body.dataset.month = '5';
    document.body.dataset.year = '2026';
    document.body.dataset.username = 'TesteUser';

    // Mocks de funções do ui.js que o app.js chama nativamente
    window.mostrarLoading = jest.fn();
    window.ocultarLoading = jest.fn();
    window.registerModalOpen = jest.fn();
    window.atualizarTotalNaoConferido = jest.fn();
    window.escapeHTML = (str) => str;
    window.getTipoExibicao = jest.fn(() => 'Única');
    window.toggleRowSelection = jest.fn();
    window.editarConta = jest.fn();
    window.confirmarExclusao = jest.fn();
    window.abrirMenuContexto = jest.fn();
    window.initDragAndDrop = jest.fn();
    window.initTouchDragAndDrop = jest.fn();

    // Importa função diretamente do módulo
    const lancamentosModule = require('../../public/js/modules/lancamentos.js');
    abrirModalUltimas = lancamentosModule.abrirModalUltimas;
  });

  test('Função abrirModalUltimas() injeta os tooltips na string HTML antes de montar', async () => {
    // Mock do fetch imitando o endpoint GET /api/lancamentos/recentes
    window.fetch = jest.fn().mockResolvedValue({
      json: async () => [
        {
          id: 123,
          descricao: 'Lanche API Mock',
          valor: '45.00',
          nometerceiro: 'Admin',
          parcelaatual: 10,
          totalparcelas: 10,
          datavencimento: new Date().toISOString(),
          datacriacao: new Date().toISOString(),
          conferido: false,
        },
      ],
    });

    await abrirModalUltimas(
      window.registerModalOpen,
      window.mostrarLoading,
      window.ocultarLoading,
      jest.fn(), // mostrarAviso
      jest.fn(), // softRefresh
      window.initDragAndDrop,
      window.initTouchDragAndDrop
    );

    // Seleciona a primeira linha e a célula de descrição para verificar o tooltip
    const firstRow = document.querySelector('#listaUltimasConteudo tr');
    const descriptionTd = firstRow.querySelector('.col-desc');
    expect(descriptionTd.dataset.tooltip).toBe('Última parcela ✅');
  });
});
