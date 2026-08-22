const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ==============================================================================
// TESTE DE INTEGRAÇÃO: SCRIPT DE VERSIONAMENTO (CACHE-BUSTING)
// Responsabilidade: Validar se o script 'versionador.js' injeta corretamente
// os hashes de versão (?v=...) em todos os tipos de assets referenciados.
// ==============================================================================
describe('Script de Versionamento (versionador.js)', () => {
  const versionerScript = path.resolve(__dirname, '../versionamento/versionador.js');

  // Diretório temporário isolado para não afetar o projeto real
  const testDir = path.resolve(__dirname, 'temp_public');
  const testFiles = {
    html: path.join(testDir, 'test-versioning-page.html'),
    css: path.join(testDir, 'test-versioning-style.css'),
    js: path.join(testDir, 'test-versioning-main.js'),
    module: path.join(testDir, 'test-versioning-module.js'),
    sw: path.join(testDir, 'test-versioning-sw.js'),
  };

  // Antes de todos os testes, cria os arquivos dummy
  beforeAll(() => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
    fs.writeFileSync(testFiles.css, 'body { color: red; }');
    fs.writeFileSync(testFiles.module, 'export const teste = 1;');
    fs.writeFileSync(testFiles.js, "import { teste } from './test-versioning-module.js';\nconsole.log(teste);");
    fs.writeFileSync(testFiles.sw, "const CACHE_NAME = 'test-cache-v1';\nconsole.log('service worker');");

    const htmlContent = `
      <html>
        <head>
          <link rel="stylesheet" href="/test-versioning-style.css">
        </head>
        <body>
          <script src="/test-versioning-main.js"></script>
          <script>
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/test-versioning-sw.js');
            }
          </script>
        </body>
      </html>
    `;
    fs.writeFileSync(testFiles.html, htmlContent);
  });

  // Depois de todos os testes, remove os arquivos dummy
  afterAll(() => {
    Object.values(testFiles).forEach((filePath) => {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (err) {
        console.warn(`[WARN] NÃ£o foi possÃ­vel remover arquivo temporÃ¡rio: ${filePath}`, err.message);
      }
    });
    try {
      if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
    } catch (err) {
      console.warn(`[WARN] NÃ£o foi possÃ­vel remover diretÃ³rio temporÃ¡rio: ${testDir}`, err.message);
    }
  });

  it('deve injetar hashes de versão em referências de CSS, JS, Service Worker e imports ES6', () => {
    execSync(`node "${versionerScript}"`, {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test', TEST_DIR: testDir },
    });
    const modifiedHtml = fs.readFileSync(testFiles.html, 'utf-8');
    expect(modifiedHtml).toMatch(/href="\/test-versioning-style\.css\?v=[a-f0-9]{8}"/);
    expect(modifiedHtml).toMatch(/src="\/test-versioning-main\.js\?v=[a-f0-9]{8}"/);
    expect(modifiedHtml).toMatch(/\.register\('\/test-versioning-sw\.js\?v=[a-f0-9]{8}'\)/);

    // Imports ES6: módulo referenciado via import deve receber ?v= com hash do conteúdo
    const modifiedJs = fs.readFileSync(testFiles.js, 'utf-8');
    expect(modifiedJs).toMatch(/from\s+'\.\/test-versioning-module\.js\?v=[a-f0-9]{8}'/);

    // CACHE_NAME do Service Worker: sufixo manual (-v1) substituído por hash automático
    const modifiedSw = fs.readFileSync(testFiles.sw, 'utf-8');
    expect(modifiedSw).toMatch(/const CACHE_NAME = 'test-cache-[0-9a-f]{8}';/);
  });
});

// ==============================================================================
// TESTE DE MAPEMENTO: DRY-RUN (Zero Side-Effects)
// ==============================================================================
describe('Dry-Run: Análise de Impacto do Versionador (Produção)', () => {
  it('deve listar os arquivos reais elegíveis para versionamento sem alterar o disco', () => {
    const dryRunScriptPath = path.join(__dirname, 'temp_dry_run.js');
    const resultPath = path.join(__dirname, 'dry_run_result.json');

    // Script temporário que intercepta a gravação
    const interceptorScript = `
      const fs = require('fs');
      const path = require('path');
      
      // Força o motor a ler as pastas REAIS do projeto ignorando o modo de teste
      process.env.NODE_ENV = 'production';
      
      const originalWrite = fs.writeFileSync;
      const affectedFiles = [];
      
      // Monkey Patch: Bloqueia a escrita física e guarda apenas o caminho
      fs.writeFileSync = function(caminho, conteudo, enc) {
        affectedFiles.push(caminho);
      };
      
      // Suprime logs normais do versionador para não sujar a leitura
      console.log = () => {}; 
      
      // Executa o motor real
      require('../versionamento/versionador.js');
      
      // Salva o relatório no disco usando a função original
      originalWrite(path.join(__dirname, 'dry_run_result.json'), JSON.stringify(affectedFiles));
    `;

    fs.writeFileSync(dryRunScriptPath, interceptorScript);
    execSync(`node "${dryRunScriptPath}"`);

    const files = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));

    fs.unlinkSync(dryRunScriptPath);
    fs.unlinkSync(resultPath);

    console.log('\n[DRY RUN] O versionador identificou atualizações nestes arquivos originais:');
    if (files.length === 0) {
      console.log(' -> Todos os arquivos já estão com os hashes de cache atualizados.');
    } else {
      files.forEach((f) => console.log(' -> ' + f));
    }
    console.log('-------------------------------------------------------------------\n');

    expect(Array.isArray(files)).toBe(true);
  });
});
