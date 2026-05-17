Douglas Silva@DOUGLAS-PC MINGW64 ~
$ cd "D:\Onedrive - Douglas\OneDrive\Pessoal\Dodo\Programacao\Git\contas-a-pagar"

Douglas Silva@DOUGLAS-PC MINGW64 /d/Onedrive - Douglas/OneDrive/Pessoal/Dodo/Programacao/Git/contas-a-pagar (main)
$ npm test

> gestao-financeira-cloud@1.0.0 test
> jest --verbose

PASS **tests**/botTelegram/messageParser.test.js
conversationManager
√ iniciarConversa — cria estado na etapa USUARIO (8 ms)
√ obterConversa — retorna null se não há conversa (1 ms)
√ cancelarConversa — remove a conversa (1 ms)
√ finalizarConversa — retorna dados e limpa o estado
√ finalizarConversa — retorna null se não há conversa
√ fluxo completo SEM parcelas (tipo fixa) (1 ms)
√ fluxo completo COM parcelas (tipo parcelada) (1 ms)
√ fluxo tipo "unica" — pula parcelas
√ USUARIO → DESCRICAO (1 ms)
√ DESCRICAO → VALOR
√ VALOR → TIPO
√ TIPO (fixa) → TERCEIRO
√ TIPO (parcelada) → PARCELAS
√ PARCELAS → TERCEIRO
√ TERCEIRO → null (fim)

PASS **tests**/repositories/UsuarioRepository.test.js
getTodosUsuarios
√ retorna lista de usuários resumida (10 ms)
√ retorna array vazio e loga erro em caso de falha (1 ms)
criarUsuario
√ insere novo usuário e retorna os dados (1 ms)
obterUsuarioPorLogin
√ retorna o usuário quando encontrado (1 ms)
√ retorna undefined quando não encontrado (1 ms)
√ retorna null e loga erro quando o banco falha (3 ms)
getUsuarioById
√ retorna o usuário quando encontrado pelo ID (1 ms)
√ retorna undefined quando ID não existe (1 ms)
√ retorna null e loga erro quando o banco falha (1 ms)

PASS **tests**/helpers/parseHelpers.test.js
parseValor
√ converte "R$ 1.234,56" para 1234.56 (6 ms)
√ converte "100,50" para 100.5 (2 ms)
√ converte "1234.56" (ponto como decimal) para 1234.56 (3 ms)
√ converte "50" (inteiro) para 50 (1 ms)
√ converte "R$0,01" (sem espaço) para 0.01
√ retorna 0 para string vazia (35 ms)
√ retorna 0 para null (1 ms)
√ retorna 0 para undefined (1 ms)
√ retorna 0 para texto sem número (1 ms)
normalizarTexto
√ remove espaços extras
√ converte null para string vazia
√ converte undefined para string vazia
√ mantém texto normal (1 ms)
normalizarTipoIntegracao
√ "Fixa" vira "fixa" (1 ms)
√ " Parcelada " vira "parcelada"
√ "UNICA" vira "unica"
parseParcelasFlex
√ "3/10" retorna atual=3, total=10
√ "10" retorna atual=1, total=10 (2 ms)
√ string vazia retorna nulls (1 ms)
√ null retorna nulls
√ "01/12" retorna atual=1, total=12 (1 ms)
normalizarParcelasPorTipo
√ se não é parcelada, sempre retorna nulls (1 ms)
√ "3/10" parcelada retorna atual=3, total=10
√ "10" parcelada retorna atual=1, total=10 (1 ms)
√ parcelada com total < 2 retorna erro
√ parcelada vazia retorna erro (1 ms)
√ parcelada com atual > total retorna erro
√ parcelada com texto inválido retorna erro

PASS **tests**/repositories/TokenRepository.test.js
gerarToken
√ deve gerar um token hexadecimal de 64 caracteres (7 ms)
√ deve gerar tokens únicos a cada chamada (1 ms)
criarToken
√ deve inserir token no banco e retornar dados formatados (49 ms)
√ deve usar 90 dias como padrão de expiração (2 ms)
validarToken
√ deve retornar usuário quando token é válido e não expirado (2 ms)
√ deve retornar null quando token não existe (1 ms)
√ deve retornar null quando token está expirado (1 ms)
revogarToken
√ deve deletar o token do banco (1 ms)
√ deve funcionar mesmo se token não existir (2 ms)
limparTokensExpirados
√ deve deletar tokens expirados e retornar contador (1 ms)
√ deve retornar 0 se nenhum token for deletado
renovarToken
√ deve estender expiração de token válido e retornar dados atualizados (3 ms)
√ deve retornar null se token não for encontrado ou estiver inválido (1 ms)
√ deve usar 90 dias como padrão de renovação

Iniciando cache-busting (MODO TESTE ISOLADO)...
PASS **tests**/repositories/LancamentoRepository.test.js
addLancamento
√ insere lançamento com todos os campos (12 ms)
√ usa STATUS.PENDENTE como padrão quando status não fornecido (1 ms)
updateStatus
√ atualiza status de um lançamento específico (3 ms)
updateConferido
√ marca lançamento como conferido (2 ms)
√ desmarca lançamento conferido
updateConferidoBatchRecent
√ marca os últimos lançamentos como conferidos (2 ms)
deleteLancamento
√ deleta lançamento filtrando por userId
getDetalhesRendas
√ chama getLancamentosPorTipo com tipo RENDA (2 ms)
copyMonth
√ virada de ano: dezembro (12) → janeiro (1) do ano seguinte (2 ms)
√ não copia parcela quando parcelaAtual >= totalParcelas (7 ms)
√ incrementa parcelaAtual quando há parcelas pendentes (1 ms)
√ não copia se não houver itens no mês (1 ms)
√ faz rollback em caso de erro (18 ms)
getLancamentosTerceiro
√ busca lançamentos pelo nome do terceiro, mês e ano (1 ms)
√ retorna array vazio se terceiro não tem lançamentos
getDashboardTotals
√ deve retornar os totais consolidados do mês corretamente (2 ms)
addLancamentosBulk
√ deve inserir múltiplos lançamentos e usar transação (BEGIN/COMMIT) (2 ms)
√ deve fazer ROLLBACK em caso de falha (1 ms)
deleteLancamentosEmLote
√ deve deletar múltiplos lançamentos e retornar a quantidade de linhas afetadas (1 ms)
√ deve retornar 0 se array for vazio ou inválido

[ATUALIZADO] D:\Onedrive - Douglas\OneDrive\Pessoal\Dodo\Programacao\Git\contas-a-pagar\_\_tests\_\_\temp_public\test-versioning-page.html
Versionamento concluído com sucesso.
console.warn
[SYNC] Tipo de regra desconhecido: DESCONHECIDO

      31 |
      32 |         default:
    > 33 |           console.warn(`[SYNC] Tipo de regra desconhecido: ${tipo}`);
         |                   ^
      34 |       }
      35 |       const durationRegra = Date.now() - startRegra;
      36 |       if (process.env.DEBUG_PERF === 'true' || process.env.DEBUG_PERF === '1') {

      at Object.warn [as executarSincronizacaoDinamica] (src/services/syncService.js:33:19)
      at Object.<anonymous> (__tests__/services/syncService.test.js:101:5)

PASS **tests**/services/syncService.test.js
syncService (Dinâmico)
√ deve processar regra COPIA_TOTAL corretamente (2 ms)
√ deve processar regra DIVISAO_CASA corretamente (1 ms)
√ deve respeitar o valor mínimo na DIVISAO_CASA (1 ms)
√ deve ignorar regras inativas
√ deve tratar erros de regras individuais sem quebrar o lote (71 ms)

PASS **tests**/repositories/OrdemCardsRepository.test.js
getOrdemCards
√ deve retornar lista ordenada por ordem ASC (2 ms)
√ deve retornar array vazio se não houver cards (1 ms)
saveOrdemCards
√ deve salvar a nova ordem usando transação (BEGIN -> DELETE -> INSERTs -> COMMIT) (2 ms)
√ deve fazer ROLLBACK em caso de erro durante a transação (23 ms)

console.log
[dotenv@17.2.4] injecting env (11) from .env -- tip: 📡 add observability to secrets: https://dotenvx.com/ops

      at _log (node_modules/dotenv/lib/main.js:142:11)

PASS **tests**/repositories/FaturaManualRepository.test.js
getFaturaManual
√ deve retornar o valor da fatura quando encontrado (2 ms)
√ deve retornar 0 se a fatura não existir (array vazio)
√ deve retornar 0 se o valor retornado for null ou inválido
√ deve capturar erros do banco e retornar 0 silenciosamente
saveFaturaManual
√ deve inserir ou atualizar o valor via ON CONFLICT (1 ms)
√ deve aceitar valores inteiros e decimais

PASS **tests**/repositories/AnotacaoRepository.test.js
getAnotacoes
√ deve retornar o conteúdo da anotação quando encontrado (1 ms)
√ deve retornar string vazia se nenhuma anotação existir (1 ms)
updateAnotacoes
√ deve inserir ou atualizar a anotação via ON CONFLICT (1 ms)
√ deve lidar com textos longos (verificação de parâmetros)

PASS **tests**/botTelegram/responseFormatter.test.js
formatarSucesso
√ formata resposta com todos os campos preenchidos (2 ms)
√ formata resposta sem terceiro — mostra traço
√ formata resposta tipo parcelado (1 ms)
√ formata resposta tipo crédito à vista
√ formata resposta com usuario_id desconhecido (1 ms)
formatarErro
√ formata mensagem de erro
escaparMarkdown
√ escapa caracteres especiais do MarkdownV2 (1 ms)
√ retorna string vazia para null/undefined

console.log
[API-AUTH] Bloqueado. Token fornecido: Sim

      at log (src/middlewares/auth.js:53:15)

console.log
[API-AUTH] Bloqueado. Token fornecido: Não

      at log (src/middlewares/auth.js:53:15)

console.log
[API-AUTH] Bloqueado. Token fornecido: Não

      at log (src/middlewares/auth.js:53:15)

PASS **tests**/middlewares/auth.test.js
authMiddleware
√ se tem sessão com user, chama next() (acesso liberado) (8 ms)
√ se NÃO tem sessão, redireciona para /login (2 ms)
√ se sessão existe mas sem user, redireciona para /login (1 ms)
createApiAuth
√ token correto → chama next() (acesso liberado) (1 ms)
√ token errado → retorna 401 (105 ms)
√ sem header x-api-key → retorna 401 (8 ms)
√ token vazio → retorna 401 (8 ms)

PASS **tests**/helpers/asyncHandler.test.js
asyncHandler
√ deve chamar next() com o erro quando ocorre um erro SÍNCRONO (3 ms)
√ deve chamar next() com o erro quando ocorre um erro ASSÍNCRONO (2 ms)
√ deve executar normalmente e chamar next sem erros em caso de sucesso
√ deve passar req, res e next corretamente para a função original (1 ms)

PASS **tests**/modules/calcularLuz/calcularLuzRoutes.test.js
Módulo Calcular Luz - Suíte Refatorada
√ GET - deve retornar lista de registros (200) (44 ms)
√ POST - deve criar novo registro (200/201) (38 ms)
√ DELETE - deve deletar registro (200/204) (23 ms)
√ GET - deve retornar erro 500 se o DB falhar (15 ms)
√ POST - deve rejeitar requisição sem dados obrigatórios (400) (6 ms)

PASS **tests**/ui/viewsTooltips.test.js
Tooltips 100% CSS nos Templates EJS
√ Injeta atributos data-tooltip corretamente para faturas finais e ações (47 ms)

PASS **tests**/repositories/LajeadoRepository.test.js
getLajeado
√ deve retornar registro quando existir (2 ms)
√ deve retornar undefined se não houver registro (1 ms)
saveLajeado
√ deve executar UPSERT de dados JSONB
updateLajeadoMural
√ deve executar UPSERT de texto no mural (1 ms)

PASS **tests**/middlewares/logger.test.js
requestLogger middleware
√ deve logar requisição com método, URL, status e duração (103 ms)
√ deve logar requisição POST com corpo JSON (43 ms)
√ deve logar erro 4xx com ícone de alerta ⚠️ (11 ms)
√ deve logar erro 400 Bad Request (8 ms)
√ deve logar erro 5xx com ícone de erro ❌ (16 ms)
√ deve logar erro 503 Service Unavailable (7 ms)
√ deve ignorar arquivos .css (32 ms)
√ deve ignorar arquivos .js (7 ms)
√ deve ignorar outros arquivos estáticos (.ico, .png, .woff, .woff2) (24 ms)
√ deve logar requisições com query params na URL original (8 ms)
√ deve usar req.originalUrl para capturar a URL completa (6 ms)
√ deve incluir duração em milissegundos no log (17 ms)

PASS **tests**/repositories/BackupRepository.test.js
getAllDataForBackup
√ deve retornar objeto estruturado com lançamentos e anotações do usuário (3 ms)
√ deve retornar arrays vazios se usuário não possuir dados (1 ms)

PASS **tests**/routes/authRoutes.test.js
Rotas de Autenticação Persistente
POST /api/auth/token
√ deve criar token e retornar dados ao usuário autenticado (57 ms)
√ deve retornar erro 400 se userId não for fornecido (14 ms)
√ deve retornar erro 500 se falhar ao criar token (28 ms)
DELETE /api/auth/token
√ deve revogar token e retornar sucesso (8 ms)
√ deve retornar erro 400 se token não for fornecido (12 ms)
√ deve retornar erro 500 se falhar ao revogar (11 ms)
POST /api/auth/validate
√ deve validar token e retornar usuário quando válido (8 ms)
√ deve retornar 401 quando token é inválido (6 ms)
√ deve retornar erro 400 se token não for fornecido (31 ms)
GET /api/auth/me
√ deve retornar 401 quando não há sessão ativa (18 ms)
√ deve retornar usuário da sessão ativa (7 ms)

console.log

    [DRY RUN] O versionador identificou atualizações nestes arquivos originais:

      at Object.log (__tests__/versioning.test.js:107:13)

console.log
-> D:\Onedrive - Douglas\OneDrive\Pessoal\Dodo\Programacao\Git\contas-a-pagar\src\modules\calcularLuz\public\index.html

      at log (__tests__/versioning.test.js:111:36)
          at Array.forEach (<anonymous>)

console.log
-> D:\Onedrive - Douglas\OneDrive\Pessoal\Dodo\Programacao\Git\contas-a-pagar\src\views\index.ejs

      at log (__tests__/versioning.test.js:111:36)
          at Array.forEach (<anonymous>)

console.log
-> D:\Onedrive - Douglas\OneDrive\Pessoal\Dodo\Programacao\Git\contas-a-pagar\src\views\login.ejs

      at log (__tests__/versioning.test.js:111:36)
          at Array.forEach (<anonymous>)

console.log
-> D:\Onedrive - Douglas\OneDrive\Pessoal\Dodo\Programacao\Git\contas-a-pagar\src\views\partials\head.ejs

      at log (__tests__/versioning.test.js:111:36)
          at Array.forEach (<anonymous>)

console.log
-> D:\Onedrive - Douglas\OneDrive\Pessoal\Dodo\Programacao\Git\contas-a-pagar\src\views\signup.ejs

      at log (__tests__/versioning.test.js:111:36)
          at Array.forEach (<anonymous>)

console.log
-> D:\Onedrive - Douglas\OneDrive\Pessoal\Dodo\Programacao\Git\contas-a-pagar\src\views\terceiro.ejs

      at log (__tests__/versioning.test.js:111:36)
          at Array.forEach (<anonymous>)

console.log
-> D:\Onedrive - Douglas\OneDrive\Pessoal\Dodo\Programacao\Git\contas-a-pagar\src\views\terceiros-dashboard.ejs

      at log (__tests__/versioning.test.js:111:36)
          at Array.forEach (<anonymous>)

console.log
-> D:\Onedrive - Douglas\OneDrive\Pessoal\Dodo\Programacao\Git\contas-a-pagar\public\manifest.json

      at log (__tests__/versioning.test.js:111:36)
          at Array.forEach (<anonymous>)

console.log
-------------------------------------------------------------------

      at Object.log (__tests__/versioning.test.js:113:13)

FAIL **tests**/versioning.test.js

● Test suite failed to run

    EBUSY: resource busy or locked, unlink 'D:\Onedrive - Douglas\OneDrive\Pessoal\Dodo\Programacao\Git\contas-a-pagar\__tests__\temp_public\test-versioning-page.html'

      47 |   // Depois de todos os testes, remove os arquivos dummy
      48 |   afterAll(() => {
    > 49 |     Object.values(testFiles).forEach((filePath) => fs.unlinkSync(filePath));
         |                                                       ^
      50 |     if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
      51 |   });
      52 |

      at unlinkSync (__tests__/versioning.test.js:49:55)
          at Array.forEach (<anonymous>)
      at Object.forEach (__tests__/versioning.test.js:49:30)

PASS **tests**/repositories/ConfiguracaoRepository.test.js
ConfiguracaoRepository
√ getConfiguracoes — deve retornar configurações do usuário (2 ms)
√ saveConfiguracao — deve salvar chave permitida usando UPSERT (1 ms)
√ saveConfiguracao — deve permitir salvar onboarding_completed (1 ms)
√ saveConfiguracao — deve rejeitar chaves não permitidas (13 ms)

PASS **tests**/repositories/MesFechadoRepository.test.js
MesFechadoRepository
isMesFechado
√ deve retornar true se o mês estiver trancado (registro existente) (2 ms)
√ deve retornar false se o mês estiver aberto (registro inexistente) (1 ms)
toggleMesFechado
√ deve fechar o mês (inserir) caso ele esteja aberto
√ deve reabrir o mês (deletar) caso ele esteja fechado

console.log
[SIGNUP] ✅ Novo usuário criado: Novo (novo)

      at log (src/routes/publicRoutes.js:57:15)

console.log
[LOGOUT] Usuário: Desconhecido

      at log (src/routes/publicRoutes.js:153:13)

PASS **tests**/routes/publicRoutes.test.js
Rotas Públicas (publicRoutes)
√ GET /login - deve renderizar view de login (49 ms)
√ GET /signup - deve renderizar view de cadastro (12 ms)
√ POST /signup - deve criar usuário e redirecionar para home (90 ms)
√ POST /signup - deve falhar se campos estiverem vazios (9 ms)
√ GET /logout - deve redirecionar para login (14 ms)
√ GET /contas/:tokenPublico - deve renderizar portal de terceiros com UUID (7 ms)

PASS **tests**/helpers/initDatabase.test.js
initDatabase.js
√ deve rodar todos os scripts de criação (20 queries) (2 ms)
√ deve capturar e logar erros se o banco falhar no startup (1 ms)

PASS **tests**/routes/infraRoutes.test.js
GET /ping
√ deve retornar 200 com status ok e serviço (10 ms)
GET /health
√ deve retornar 200 quando banco está online (20 ms)
√ deve retornar 503 quando banco está offline (5 ms)
√ deve incluir métricas de uptime na resposta (5 ms)

PASS **tests**/constants.test.js
Constantes do Sistema (constants.js)
√ STATUS contém PENDENTE e PAGO (1 ms)
√ TIPO contém FIXA, CARTAO e RENDA (1 ms)
√ LIMITES possui valores numéricos válidos (1 ms)
√ SQL_SEM_TERCEIRO retorna a string exata de validação nula

PASS **tests**/config/db.test.js
Configuração de Banco de Dados (db.js)
√ deve exportar query e getClient (1 ms)
√ deve configurar o pool com client_encoding UTF8 (1 ms)

console.log
[API-AUTH] Bloqueado. Token fornecido: Não

      at log (src/middlewares/auth.js:53:15)

console.log
--- [API-AUTO-COPY] Iniciando via Webhook Integrado ---

      at log (src/routes/integrationRoutes.js:89:13)

PASS **tests**/routes/integrationRoutes.test.js
Rotas de Integração M2M (integrationRoutes)
√ deve bloquear requisições sem x-api-key (401) (55 ms)
√ POST /lancamentos - deve chamar repo e retornar 201 (9 ms)
√ POST /copiar-mensal - deve invocar a cópia e retornar sucesso (11 ms)

PASS **tests**/dataHora/dataHora.test.js
Módulo dataHora - Testes de Fuso Horário
√ Deve extrair e formatar a data/hora corretamente ignorando o fuso do servidor (29 ms)
√ Deve lidar com falhas da API externa graciosamente (7 ms)

console.log
[Telegram] Bot configurado. Webhook pronto.

      at log (src/modules/botTelegram/telegramRoutes.js:48:11)

PASS **tests**/botTelegram/telegramBot.test.js
Telegram Bot - Funcionalidades e Travas
Trava de Mês Fechado (Month Lock)
√ deve BLOQUEAR a inserção e avisar o usuário caso o mês esteja fechado (6 ms)
√ deve PERMITIR a inserção e salvar no banco caso o mês esteja aberto (4 ms)

(node:3740) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)
console.log
[LOGIN] Tentativa de login - IP: ::ffff:127.0.0.1

      at log (src/routes/publicRoutes.js:78:13)

console.log
[LOGIN] ✅ Sucesso - Usuário: Dodo (Lembrar: false)

      at log (src/routes/publicRoutes.js:109:17)

console.log
✅ POST /login 302 12ms

      at ServerResponse.log (src/middlewares/logger.js:30:13)

console.log
✅ POST /api/lancamentos/conferido-extrato-lote 200 2ms

      at ServerResponse.log (src/middlewares/logger.js:30:13)

console.log
✅ POST /api/lancamentos/conferido-extrato-lote 200 1ms

      at ServerResponse.log (src/middlewares/logger.js:30:13)

console.log
✅ POST /api/meses-fechados/toggle 200 1ms

      at ServerResponse.log (src/middlewares/logger.js:30:13)

console.log
⚠️ POST /api/lancamentos 403 1ms

      at ServerResponse.log (src/middlewares/logger.js:30:13)

console.log
✅ POST /api/meses-fechados/toggle 200 1ms

      at ServerResponse.log (src/middlewares/logger.js:30:13)

console.log
✅ GET / 200 30ms

      at ServerResponse.log (src/middlewares/logger.js:30:13)

console.log
✅ GET /terceiros 200 6ms

      at ServerResponse.log (src/middlewares/logger.js:30:13)

PASS **tests**/integration/api.test.js
Integração API (Mocked DB)
POST /api/lancamentos/conferido-extrato-lote
√ deve marcar múltiplos lançamentos como conferidos (11 ms)
√ deve desmarcar múltiplos lançamentos (4 ms)
Mes Fechado (Month Lock)
√ POST /api/meses-fechados/toggle - deve trancar o mês com sucesso (6 ms)
√ POST /api/lancamentos - deve retornar erro 403 ao tentar lançar conta em mês fechado (5 ms)
√ POST /api/meses-fechados/toggle - deve reabrir o mês com sucesso (4 ms)
Renderização de Views (GET / e GET /terceiros)
√ GET / - carrega dashboard agrupado (35 ms)
√ GET /terceiros - deve filtrar nomes nulos (contas próprias) para evitar Erro 500 na ordenação (10 ms)

console.error
ReferenceError: getTipoExibicao is not defined
at http://localhost/:304:25
at Array.forEach (<anonymous>)
at abrirModalUltimas (http://localhost/:280:10)
at processTicksAndRejections (node:internal/process/task_queues:104:5)
at Object.<anonymous> (D:\Onedrive - Douglas\OneDrive\Pessoal\Dodo\Programacao\Git\contas-a-pagar\_\_tests\_\_\ui\appTooltips.test.js:66:5)

      at abrirModalUltimas (http:/localhost:356:13)
      at Object.<anonymous> (__tests__/ui/appTooltips.test.js:66:5)

FAIL **tests**/ui/appTooltips.test.js
Tooltips Dinâmicos no app.js (Modais Client-Side)
× Função abrirModalUltimas() injeta os tooltips na string HTML antes de montar (49 ms)

● Tooltips Dinâmicos no app.js (Modais Client-Side) › Função abrirModalUltimas() injeta os tooltips na string HTML antes de montar

    TypeError: Cannot read properties of null (reading 'dataset')

      69 |     const firstRow = document.querySelector('#listaUltimasConteudo tr');
      70 |     const descriptionTd = firstRow.querySelector('.col-desc');
    > 71 |     expect(descriptionTd.dataset.tooltip).toBe('Última parcela ✅');
         |                          ^
      72 |   });
      73 | });
      74 |

      at Object.dataset (__tests__/ui/appTooltips.test.js:71:26)

Summary of all failing tests
FAIL **tests**/versioning.test.js

● Test suite failed to run

    EBUSY: resource busy or locked, unlink 'D:\Onedrive - Douglas\OneDrive\Pessoal\Dodo\Programacao\Git\contas-a-pagar\__tests__\temp_public\test-versioning-page.html'

      47 |   // Depois de todos os testes, remove os arquivos dummy
      48 |   afterAll(() => {
    > 49 |     Object.values(testFiles).forEach((filePath) => fs.unlinkSync(filePath));
         |                                                       ^
      50 |     if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
      51 |   });
      52 |

      at unlinkSync (__tests__/versioning.test.js:49:55)
          at Array.forEach (<anonymous>)
      at Object.forEach (__tests__/versioning.test.js:49:30)

FAIL **tests**/ui/appTooltips.test.js
● Tooltips Dinâmicos no app.js (Modais Client-Side) › Função abrirModalUltimas() injeta os tooltips na string HTML antes de montar

    TypeError: Cannot read properties of null (reading 'dataset')

      69 |     const firstRow = document.querySelector('#listaUltimasConteudo tr');
      70 |     const descriptionTd = firstRow.querySelector('.col-desc');
    > 71 |     expect(descriptionTd.dataset.tooltip).toBe('Última parcela ✅');
         |                          ^
      72 |   });
      73 | });
      74 |

      at Object.dataset (__tests__/ui/appTooltips.test.js:71:26)

Test Suites: 2 failed, 29 passed, 31 total
Tests: 1 failed, 201 passed, 202 total
Snapshots: 0 total
Time: 3.454 s
Ran all test suites.
