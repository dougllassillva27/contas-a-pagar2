/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');

// ==============================================================================
// TESTE UNITÁRIO DE JSDOM (CLIENT-SIDE JS)
// Garante que as funções de renderização dinâmica do app.js continuem
// adicionando os atributos CSS nos tooltips ao montar os modais.
// ==============================================================================
describe('Tooltips Dinâmicos no app.js (Modais Client-Side)', () => {
  let appCode;

  beforeAll(() => {
    // Lê os utilitários e o app.js
    const utilsCode = fs.readFileSync(path.resolve(__dirname, '../../public/js/utils.js'), 'utf8');
    appCode = fs.readFileSync(path.resolve(__dirname, '../../public/js/app.js'), 'utf8');
    
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
        },
      ],
    });

    // Injeta o script como tag para garantir escopo global (window)
    const script = document.createElement('script');
    script.textContent = appCode;
    document.body.appendChild(script);

    await window.abrirModalUltimas();

    // Seleciona a primeira linha e a célula de descrição para verificar o tooltip
    const firstRow = document.querySelector('#listaUltimasConteudo tr');
    const descriptionTd = firstRow.querySelector('.col-desc');
    expect(descriptionTd.dataset.tooltip).toBe('Última parcela ✅');
  });
});
