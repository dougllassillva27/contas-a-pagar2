/**
 * @jest-environment jsdom
 */
// A anotação acima avisa o Jest que este teste precisa simular um Navegador (DOM)

const fs = require('fs');
const path = require('path');

// Lemos todos os módulos fracionados para emular a nova arquitetura
const utilsJsPath = path.resolve(__dirname, '../../public/js/utils.js');
const utilsJsCode = fs.readFileSync(utilsJsPath, 'utf8');
const uiJsPath = path.resolve(__dirname, '../../public/js/ui.js');
const uiJsCode = fs.readFileSync(uiJsPath, 'utf8');
const dragdropJsPath = path.resolve(__dirname, '../../public/js/dragdrop.js');
const dragdropJsCode = fs.readFileSync(dragdropJsPath, 'utf8');

// Lemos o arquivo app.js real do projeto
const appJsPath = path.resolve(__dirname, '../../public/js/app.js');
const appJsCode = fs.readFileSync(appJsPath, 'utf8');

describe('Frontend - Lógica do app.js', () => {
  beforeEach(() => {
    // 1. Preparamos o HTML (DOM) falso para o script usar
    document.body.innerHTML = `
      <form id="formConta">
        <input type="hidden" id="contaId" value="1427" />
        <input type="text" name="descricao" value="Gasolina" />
        <input type="text" name="valor" value="123" />
        <input type="hidden" name="sub_tipo" value="Fixa" />
        <input type="hidden" name="nome_terceiro" value="" />
      </form>
    `;

    // 2. Injetamos as variáveis que o EJS normalmente injetaria
    document.body.dataset.month = '3';
    document.body.dataset.year = '2026';
    document.body.dataset.username = 'Dodo';
    document.body.dataset.mesFechado = 'false';

    // 3. Executamos os scripts na ordem exata de dependência
    window.eval(utilsJsCode + '\n' + uiJsCode + '\n' + dragdropJsCode + '\n' + appJsCode);

    // 4. Mock (simulamos) o Fetch para não tentar bater na API de verdade
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('enviarLancamento deve extrair o ID corretamente e evitar o reload da página sem dar ReferenceError', async () => {
    const form = document.getElementById('formConta');

    // Simulamos o evento 'e' que o navegador envia quando o form é submetido
    const mockEvent = { preventDefault: jest.fn(), target: form };

    // Chamamos a função global criada pelo app.js
    await window.enviarLancamento(mockEvent, 'CONTA');

    // Se o JS quebrar com 'ReferenceError' (como aconteceu antes), ele nunca chegará nas linhas abaixo!

    // Validamos se ele parou o reload da página:
    expect(mockEvent.preventDefault).toHaveBeenCalled();

    // Validamos se ele fez a requisição PUT chamando a API com o ID correto (1427):
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/lancamentos/1427',
      expect.objectContaining({
        method: 'PUT',
      })
    );
  });
});
