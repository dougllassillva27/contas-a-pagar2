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
    sw: path.join(testDir, 'test-versioning-sw.js'),
  };

  // Antes de todos os testes, cria os arquivos dummy
  beforeAll(() => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
    fs.writeFileSync(testFiles.css, 'body { color: red; }');
    fs.writeFileSync(testFiles.js, 'console.log("test");');
    fs.writeFileSync(testFiles.sw, 'console.log("service worker");');

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
    Object.values(testFiles).forEach((filePath) => fs.unlinkSync(filePath));
    if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
  });

  it('deve injetar hashes de versão em referências de CSS, JS e Service Worker', () => {
    execSync(`node "${versionerScript}"`, {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test', TEST_DIR: testDir },
    });
    const modifiedHtml = fs.readFileSync(testFiles.html, 'utf-8');
    expect(modifiedHtml).toMatch(/href="\/test-versioning-style\.css\?v=[a-f0-9]{8}"/);
    expect(modifiedHtml).toMatch(/src="\/test-versioning-main\.js\?v=[a-f0-9]{8}"/);
    expect(modifiedHtml).toMatch(/\.register\('\/test-versioning-sw\.js\?v=[a-f0-9]{8}'\)/);
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
