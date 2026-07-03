# FILE_INDEX.md - Inventario Completo do Projeto

> Gerado automaticamente em 2026-07-03 a partir do codigo-fonte real.
> Exclui: `node_modules/`, `.git/`, `coverage/`, `dist/`, `.venv/`, `.claude/`, `graphify-out/`.

---

## Sumario

1. [Raiz](#raiz)
2. [src/](#src)
3. [src/config/](#srcconfig)
4. [src/helpers/](#srchelpers)
5. [src/middlewares/](#srcmiddlewares)
6. [src/repositories/](#srcrepositories)
7. [src/routes/](#srcroutes)
8. [src/routes/dashboard/](#srcroutesdashboard)
9. [src/routes/lancamentos/](#srcrouteslancamentos)
10. [src/routes/terceiros/](#srcroutesterceiros)
11. [src/routes/configuracoes/](#srcroutesconfiguracoes)
12. [src/routes/outros/](#srcroutesoutros)
13. [src/services/](#srcservices)
14. [src/modules/botTelegram/](#srcmodulesbottelegram)
15. [src/modules/calcularLuz/](#srcmodulescalcularluz)
16. [src/modules/dataHora/](#srcmodulesdatahora)
17. [src/modules/widgetLancamentos/](#srcmoduleswidgetlancamentos)
18. [src/scripts/](#srcscripts)
19. [public/ (Frontend)](#public)
20. [views/ (EJS Templates)](#views)
21. [\_\_tests\_\_/](#__tests__)
22. [docs/](#docs)

---

## Raiz

### `.env`
- **Responsabilidade:** Variaveis de ambiente locais (DATABASE_URL, SESSION_SECRET, API_TOKEN, TELEGRAM_BOT_TOKEN, etc.). Nao versionado.
- **Dependencias:** Nenhuma.
- **Consumido por:** `src/app.js`, `src/config/db.js`, todos os modulos que usam `process.env`.

### `.env.example`
- **Responsabilidade:** Template de variaveis de ambiente para documentacao.
- **Consumido por:** Desenvolvedores (referencia).

### `.gitignore`
- **Responsabilidade:** Define arquivos/dirs ignorados pelo Git.

### `.eslintrc.json`
- **Responsabilidade:** Configuracao do ESLint para linting de JavaScript.

### `.ruff.toml`
- **Responsabilidade:** Configuracao do Ruff (linter Python) -- legado de scripts auxiliares.

### `package.json`
- **Responsabilidade:** Manifesto do projeto Node.js. Define scripts (`start`, `dev`, `test`, `build`, `telegram:setup`, `build:widget`), dependencias e configuracao do Jest.
- **Dependencias principais:** express, pg, bcrypt, ejs, express-session, helmet, compression, node-telegram-bot-api, express-rate-limit, dotenv, cookie-parser.
- **Consumido por:** npm, CI/CD, desenvolvedores.

### `README.md`
- **Responsabilidade:** Documentacao principal do projeto (features, setup, arquitetura).

### `CLAUDE.md`
- **Responsabilidade:** Instrucoes especificas do projeto para o Claude Code (stack, regras, comandos).

### `AGENT.md`
- **Responsabilidade:** Instrucoes para agentes de IA.

---

## src/

### `src/app.js`
- **Responsabilidade:** Ponto de entrada da aplicacao. Configura Express (session, helmet, compression, cookie-parser, JSON body), monta middleware de autenticacao, registra todas as rotas e error handler global.
- **Dependencias:** `dotenv`, `express`, `express-session`, `cookie-parser`, `compression`, `helmet`, `path`, `crypto`, `./config/db`, `./repositories/FinanceiroRepository`, `./middlewares/auth`, `./middlewares/logger`, `./middlewares/rateLimiter`, `./helpers/initDatabase`, `./routes/infraRoutes`, `./routes/publicRoutes`, `./routes/integrationRoutes`, `./routes/apiRoutes`, `./modules/botTelegram/telegramRoutes`, `./modules/dataHora/dataHoraRoutes`, `./modules/calcularLuz/calcularLuzRoutes`.
- **Exporta:** `app` (instancia Express, para testes com supertest).
- **Consumido por:** `node src/app.js` (producao/dev), `__tests__/integration/api.test.js`.

### `src/constants.js`
- **Responsabilidade:** Centraliza magic strings/numeros: STATUS (PENDENTE, PAGO), TIPO (FIXA, CARTAO, RENDA), LIMITES, SQL_SEM_TERCEIRO.
- **Exporta:** `{ STATUS, TIPO, LIMITES, SQL_SEM_TERCEIRO }`.
- **Consumido por:** `LancamentoRepository`, `integrationRoutes`, `classificacaoHelpers`, `messageParser`, `responseFormatter`, `publicRoutes`, `dashboardRoutes`, `lancamentosRoutes`, `terceirosRoutes`.

---

## src/config/

### `src/config/db.js`
- **Responsabilidade:** Pool de conexoes PostgreSQL (pg). Configura SSL, health check com retry para conexoes stale (Neon), wrapper de performance com logs de duracao. Forca DECIMAL -> Number.
- **Dependencias:** `pg`, `process.env.DATABASE_URL`.
- **Exporta:** `{ query(text, params), getClient(), end() }`.
- **Consumido por:** TODOS os repositories, `initDatabase`, `infraRoutes`, `publicRoutes`, `dashboardRoutes`, `terceirosRoutes`, `configuracoesRoutes`, `calcularLuzRoutes`.

### `src/config/db_dump.js`
- **Responsabilidade:** Versao simplificada/legada do pool de conexoes (sem health check/retry). Possivelmente para dump/migracao.
- **Dependencias:** `pg`, `process.env.DATABASE_URL`.
- **Exporta:** `{ query(), getClient(), end() }`.
- **Consumido por:** Nao referenciado no codigo principal (arquivo legado/utilitario).

---

## src/helpers/

### `src/helpers/asyncHandler.js`
- **Responsabilidade:** Wrapper para rotas async/await -- captura erros e encaminha para middleware de erro do Express sem try/catch manual.
- **Exporta:** `asyncHandler(fn)` (funcao).
- **Consumido por:** `authRoutes`, `dashboardRoutes`, `terceirosRoutes`, `configuracoesRoutes`, `lancamentosRoutes`, `outrosRoutes`, `calcularLuzRoutes`.

### `src/helpers/cacheHelpers.js`
- **Responsabilidade:** Cache em memoria (Map) com TTL configuravel. Operacoes: set, get, invalidate (por prefixo), clear.
- **Exporta:** `{ set, get, invalidate, clear }`.
- **Consumido por:** `LancamentoRepository`, `ConfiguracaoRepository`, `lancamentosRoutes`.

### `src/helpers/ConfiguracaoRepository.js`
- **Responsabilidade:** Arquivo vazio (1 linha). Possivelmente legado ou placeholder.
- **Exporta:** Nada.
- **Consumido por:** Ninguem.

### `src/helpers/initDatabase.js`
- **Responsabilidade:** Executa DDL/DML de inicializacao no startup: cria indices de performance, normaliza dados legados, cria tabelas auxiliares (OrdemCards, TokensPersistentes, MesesFechados, registros_luz, terceiros, configuracoes).
- **Dependencias:** `../config/db`.
- **Exporta:** `initDatabase()` (funcao async).
- **Consumido por:** `src/app.js` (chamado uma vez no startup).

### `src/helpers/LajeadoRepository.js`
- **Responsabilidade:** Arquivo vazio (1 linha). Possivelmente legado ou placeholder.
- **Exporta:** Nada.
- **Consumido por:** Ninguem.

### `src/helpers/parseHelpers.js`
- **Responsabilidade:** Funcoes de parsing e normalizacao: `parseValor` (string monetaria -> float), `normalizarTexto`, `normalizarTipoIntegracao`, `parseParcelasFlex`, `normalizarParcelasPorTipo`.
- **Exporta:** `{ parseValor, normalizarTexto, normalizarTipoIntegracao, parseParcelasFlex, normalizarParcelasPorTipo }`.
- **Consumido por:** `integrationRoutes`, `lancamentosRoutes`, `outrosRoutes`, `messageParser`, `telegramBot`.

### `src/helpers/resumoCache.js`
- **Responsabilidade:** Cache singleton (via `global.__RESUMO_CACHE__`) com TTL de 5s para o resumo do dashboard. Evita queries redundantes em soft-refresh rapido.
- **Exporta:** `{ get(userId, month, year), set(data, userId, month, year) }`.
- **Consumido por:** `dashboardRoutes` (endpoint `/api/dashboard/resumo`).

---

## src/middlewares/

### `src/middlewares/auth.js`
- **Responsabilidade:** Middlewares de autenticacao: `authMiddleware` (sessao web + cookie persistente "Lembrar de mim"), `createApiAuth` (API token para integracao Android), `createAuthHybrid` (API token OU sessao web).
- **Dependencias:** `../repositories/FinanceiroRepository`.
- **Exporta:** `{ authMiddleware, createApiAuth, createAuthHybrid }`.
- **Consumido por:** `src/app.js`.

### `src/middlewares/logger.js`
- **Responsabilidade:** Logger de requisicoes HTTP. Loga metodo, URL, status e duracao. Ignora arquivos estaticos e nao loga corpo da requisicao (seguranca).
- **Exporta:** `requestLogger` (middleware).
- **Consumido por:** `src/app.js`.

### `src/middlewares/rateLimiter.js`
- **Responsabilidade:** Rate limiting: `loginLimiter` (5 tentativas/15min por IP) e `apiLimiter` (200 req/15min).
- **Dependencias:** `express-rate-limit`.
- **Exporta:** `{ loginLimiter, apiLimiter }`.
- **Consumido por:** `publicRoutes` (loginLimiter), `src/app.js` (apiLimiter).

---

## src/repositories/

### `src/repositories/AnotacaoRepository.js`
- **Responsabilidade:** CRUD de anotacoes mensais (UPSERT por usuario/mes/ano).
- **Dependencias:** `../config/db`.
- **Exporta:** `{ getAnotacoes, updateAnotacoes }`.
- **Consumido por:** `FinanceiroRepository` (facade).

### `src/repositories/ConfiguracaoRepository.js`
- **Responsabilidade:** CRUD de configuracoes do usuario (whatsapp_template, privacidade_global, divisao_casa_minimo, regras_sync, onboarding_completed). Cache em memoria (TTL 5min). Validacao de colunas permitidas (anti-SQL-injection).
- **Dependencias:** `../config/db`, `../helpers/cacheHelpers`.
- **Exporta:** `{ getConfiguracoes, saveConfiguracao, invalidateCache }`.
- **Consumido por:** `FinanceiroRepository` (facade).

### `src/repositories/FaturaManualRepository.js`
- **Responsabilidade:** CRUD de fatura manual (UPSERT por usuario/mes/ano).
- **Dependencias:** `../config/db`.
- **Exporta:** `{ getFaturaManual, saveFaturaManual }`.
- **Consumido por:** `FinanceiroRepository` (facade).

### `src/repositories/FinanceiroRepository.js`
- **Responsabilidade:** **Facade** que re-exporta todos os metodos dos repositories especializados como um unico objeto. Garante compatibilidade com app.js e rotas existentes.
- **Dependencias:** `UsuarioRepository`, `LancamentoRepository`, `AnotacaoRepository`, `FaturaManualRepository`, `OrdemCardsRepository`, `MesFechadoRepository`, `TokenRepository`, `ConfiguracaoRepository`.
- **Exporta:** Objeto unificado com todos os metodos dos repositories acima.
- **Consumido por:** `src/app.js`, `middlewares/auth`, `publicRoutes`, `dashboardRoutes`, `terceirosRoutes`, `configuracoesRoutes`, `lancamentosRoutes`, `outrosRoutes`, `integrationRoutes`, `telegramBot`, `telegramRoutes`, `syncService`.

### `src/repositories/LancamentoRepository.js`
- **Responsabilidade:** **Maior arquivo do projeto.** CRUD completo de lancamentos + queries de dashboard. Inclui: listagens (ultimos, relatorio mensal, por tipo, terceiros), dashboard (totais, dados modulares com CTE merge, resumo pessoas), CRUD unitario e bulk (add, update, delete, reorder), operacoes em lote (status batch, conferido extrato lote, mover mes, dividir conta), copia de mes (com reset de contas Casa), sync helpers (total terceiro, conta fixa valor, bulk upsert).
- **Dependencias:** `../config/db`, `../constants`, `../helpers/cacheHelpers`.
- **Exporta:** `normalizarTerceiro`, `getUltimosLancamentos`, `getRelatorioMensal`, `getDashboardTotals`, `getLancamentosPorTipo`, `getDadosTerceiros`, `getLancamentosCartaoPorPessoa`, `getResumoPessoas`, `getDetalhesRendas`, `getDistinctTerceiros`, `getLancamentosTerceiro`, `getLancamento`, `getMesesAnosPorIds`, `getDashboardDataModular`, `invalidateDashboardCache`, `addLancamento`, `addLancamentosBulk`, `updateLancamento`, `updateStatus`, `updateConferido`, `updateConferidoExtrato`, `updateConferidoExtratoLote`, `updateStatusBatchPessoa`, `updateConferidoBatchRecent`, `reorderLancamentos`, `deleteLancamentosEmLote`, `moverLancamentosMes`, `dividirConta`, `getResumoTerceirosGrid`, `deleteLancamento`, `deleteLancamentosPorPessoa`, `deleteMonth`, `copyMonth`, `getTotalTerceiroParaDivisaoCasa`, `getTotalTerceiroCartao`, `getContaFixaValor`, `findAndUpdateOrCreateContaFixa`, `findAndUpdateOrCreateContaFixaComTerceiro`, `bulkUpsertContasFixas`.
- **Consumido por:** `FinanceiroRepository` (facade), `integrationRoutes` (normalizarTerceiro).

### `src/repositories/MesFechadoRepository.js`
- **Responsabilidade:** Controle de mes trancado/aberto (toggle).
- **Dependencias:** `../config/db`.
- **Exporta:** `{ isMesFechado, toggleMesFechado }`.
- **Consumido por:** `FinanceiroRepository` (facade).

### `src/repositories/OrdemCardsRepository.js`
- **Responsabilidade:** CRUD de ordenacao de cards de terceiros (drag & drop). Bulk insert via UNNEST.
- **Dependencias:** `../config/db`.
- **Exporta:** `{ getOrdemCards, saveOrdemCards }`.
- **Consumido por:** `FinanceiroRepository` (facade).

### `src/repositories/TokenRepository.js`
- **Responsabilidade:** CRUD de tokens persistentes ("Lembrar de mim"). Hash SHA-256 unidirecional, geracao criptografica, validacao com JOIN em Usuarios, renovacao automatica, limpeza de expirados.
- **Dependencias:** `../config/db`, `crypto`.
- **Exporta:** `{ gerarToken, criarToken, validarToken, revogarToken, limparTokensExpirados, renovarToken }`.
- **Consumido por:** `FinanceiroRepository` (facade), `authRoutes`, `publicRoutes`.

### `src/repositories/UsuarioRepository.js`
- **Responsabilidade:** Consultas e criacao de usuarios.
- **Dependencias:** `../config/db`.
- **Exporta:** `{ obterUsuarioPorLogin, getUsuarioById, getTodosUsuarios, criarUsuario }`.
- **Consumido por:** `FinanceiroRepository` (facade).

---

## src/routes/

### `src/routes/apiRoutes.js`
- **Responsabilidade:** **Facade de rotas protegidas.** Delega para modulos por dominio: dashboard, terceiros, configuracoes, lancamentos, outros.
- **Dependencias:** `./dashboard/dashboardRoutes`, `./terceiros/terceirosRoutes`, `./configuracoes/configuracoesRoutes`, `./lancamentos/lancamentosRoutes`, `./outros/outrosRoutes`.
- **Exporta:** Funcao que recebe `repo` e retorna `express.Router`.
- **Consumido por:** `src/app.js`.

### `src/routes/authRoutes.js`
- **Responsabilidade:** Rotas de autenticacao via API: POST `/api/auth/token` (gerar token persistente), DELETE `/api/auth/token` (revogar), POST `/api/auth/validate` (validar + renovar), GET `/api/auth/me` (usuario da sessao).
- **Dependencias:** `express`, `../repositories/TokenRepository`, `../helpers/asyncHandler`.
- **Exporta:** Funcao que recebe `repo` e retorna `express.Router`.
- **Consumido por:** Nao montado diretamente em app.js (possivelmente legado ou para uso futuro).

### `src/routes/infraRoutes.js`
- **Responsabilidade:** Rotas de infraestrutura sem autenticacao: GET `/health` (health check com latency e uptime) e GET `/ping` (liveness).
- **Dependencias:** `express`, `../config/db`.
- **Exporta:** `express.Router`.
- **Consumido por:** `src/app.js`.

### `src/routes/integrationRoutes.js`
- **Responsabilidade:** Rotas de integracao Android/API: POST `/api/v1/integracao/lancamentos` (criar lancamento via API com token) e POST `/api/v1/integracao/copiar-mensal` (automacao de copia mensal com notificacao Telegram).
- **Dependencias:** `express`, `../helpers/parseHelpers`, `../repositories/LancamentoRepository` (normalizarTerceiro), `../constants`.
- **Exporta:** Funcao que recebe `(repo, apiAuth)` e retorna `express.Router`.
- **Consumido por:** `src/app.js`.

### `src/routes/publicRoutes.js`
- **Responsabilidade:** Rotas publicas: GET `/login`, POST `/login` (com bcrypt, rate limit, "Lembrar de mim"), GET `/signup`, POST `/signup`, GET `/logout`, GET `/contas/:tokenPublico` (portal publico de terceiros com UUID validation).
- **Dependencias:** `express`, `bcrypt`, `../middlewares/rateLimiter`, `../constants`, `../config/db`, `./dashboard/navigationHelpers`.
- **Exporta:** Funcao que recebe `repo` e retorna `express.Router`.
- **Consumido por:** `src/app.js`.

---

## src/routes/dashboard/

### `src/routes/dashboard/dashboardRoutes.js`
- **Responsabilidade:** Rotas do dashboard principal: GET `/` (renderiza index.ejs com dados modulares, sync automatico em background), GET `/relatorio` (relatorio mensal), GET `/api/dashboard/totals` (totais para atualizacao parcial), GET `/api/dashboard/resumo` (soft-refresh com cache).
- **Dependencias:** `express`, `../../config/db`, `./navigationHelpers`, `../terceiros/terceirosHelpers`, `../../helpers/asyncHandler`, `../../helpers/resumoCache`, `../../services/syncService`, `../lancamentos/classificacaoHelpers` (safeJs).
- **Exporta:** Funcao que recebe `repo` e retorna `express.Router`.
- **Consumido por:** `apiRoutes`.

### `src/routes/dashboard/navigationHelpers.js`
- **Responsabilidade:** Calcula contexto de navegacao mensal (mes atual, anterior, proximo) a partir de query params.
- **Exporta:** `{ calcularContextoNavegacao(query) }`.
- **Consumido por:** `dashboardRoutes`, `publicRoutes`, `terceirosRoutes`.

---

## src/routes/lancamentos/

### `src/routes/lancamentos/lancamentosRoutes.js`
- **Responsabilidade:** Rotas de CRUD de lancamentos: GET `/api/lancamentos/recentes`, GET `/api/rendas`, GET `/api/cartao/:pessoa`, POST `/api/lancamentos` (unitario e bulk), PUT `/api/lancamentos/:id`, DELETE `/api/lancamentos/:id`, DELETE `/api/lancamentos/lote` (batch), POST `/api/lancamentos/mover-mes`, POST `/api/lancamentos/dividir`, POST `/api/lancamentos/copiar`, DELETE `/api/lancamentos/mes`, DELETE `/api/lancamentos/pessoa/:nome`, POST `/api/lancamentos/status-pessoa`, POST `/api/lancamentos/conferido-recentes`, POST `/api/lancamentos/reorder`, PATCH `/api/lancamentos/:id/status`, PATCH `/api/lancamentos/:id/conferido`, PATCH `/api/lancamentos/:id/conferido-extrato`, POST `/api/lancamentos/conferido-extrato-lote`. Inclui validacao de mes fechado, invalidacao de cache e sync dinamico em background.
- **Dependencias:** `express`, `../../helpers/parseHelpers`, `../../services/syncService`, `../../helpers/asyncHandler`, `../../helpers/cacheHelpers`, `./classificacaoHelpers`.
- **Exporta:** Funcao que recebe `repo` e retorna `express.Router`.
- **Consumido por:** `apiRoutes`.

### `src/routes/lancamentos/classificacaoHelpers.js`
- **Responsabilidade:** Classifica tipo de lancamento a partir de dados do formulario (tipo_transacao, sub_tipo, parcelas). Helper `safeJs` para escapar strings em contextos JavaScript (previne XSS em onclick).
- **Dependencias:** `../../constants`, `../../helpers/parseHelpers`.
- **Exporta:** `{ classificarLancamento, safeJs }`.
- **Consumido por:** `lancamentosRoutes`, `dashboardRoutes`.

---

## src/routes/terceiros/

### `src/routes/terceiros/terceirosRoutes.js`
- **Responsabilidade:** Rotas de gestao de terceiros: GET `/terceiros` (dashboard de terceiros com bulk UPSERT, template WhatsApp), GET `/api/terceiros/resumo` (resumo leve da grid), POST `/api/terceiros/telefone` (salvar telefone), GET `/api/terceiros/:nome/token` (gerar/obter token publico para compartilhamento).
- **Dependencias:** `express`, `../../config/db`, `../dashboard/navigationHelpers`, `./terceirosHelpers`, `../../helpers/asyncHandler`.
- **Exporta:** Funcao que recebe `repo` e retorna `express.Router`.
- **Consumido por:** `apiRoutes`.

### `src/routes/terceiros/terceirosHelpers.js`
- **Responsabilidade:** Helpers para terceiros: `montarMapaTerceiros` (agrupa lancamentos por nome de terceiro), `ordenarTerceiros` (ordena pela ordem salva pelo usuario via drag & drop).
- **Exporta:** `{ montarMapaTerceiros, ordenarTerceiros }`.
- **Consumido por:** `dashboardRoutes`, `terceirosRoutes`.

---

## src/routes/configuracoes/

### `src/routes/configuracoes/configuracoesRoutes.js`
- **Responsabilidade:** Rotas de configuracoes: POST `/api/meses-fechados/toggle` (trancar/destrancar mes), POST `/api/configuracoes/whatsapp` (salvar template WhatsApp), POST `/api/configuracoes` (salvar configuracao generica por chave/valor).
- **Dependencias:** `express`, `../../config/db`, `../../helpers/asyncHandler`.
- **Exporta:** Funcao que recebe `repo` e retorna `express.Router`.
- **Consumido por:** `apiRoutes`.

---

## src/routes/outros/

### `src/routes/outros/outrosRoutes.js`
- **Responsabilidade:** Rotas auxiliares: POST `/api/anotacoes` (salvar anotacao), GET `/api/anotacoes` (ler anotacao), POST `/api/fatura-manual` (salvar fatura manual), POST `/api/cards/reorder` (reordenar cards de terceiros via drag & drop).
- **Dependencias:** `express`, `../../helpers/parseHelpers`, `../../helpers/asyncHandler`.
- **Exporta:** Funcao que recebe `repo` e retorna `express.Router`.
- **Consumido por:** `apiRoutes`.

---

## src/services/

### `src/services/syncService.js`
- **Responsabilidade:** Motor de sincronizacao dinamico (SaaS Ready). Processa regras declarativas armazenadas no JSONB do usuario. Regras suportadas: `COPIAR_CONTAS` (copia total de terceiro para conta fixa de outro usuario), `COPIAR_CONTA_FIXA` (copia valor de conta fixa especifica), `DIVISAO_CASA` (divide contas do terceiro CASA com base fixa + metade do excedente). Inclui mutex global para evitar execucoes concorrentes.
- **Dependencias:** Nenhuma externa (usa `repo` injetado).
- **Exporta:** `{ executarSincronizacaoDinamica }`.
- **Consumido por:** `dashboardRoutes`, `lancamentosRoutes` (fire-and-forget via setImmediate).

---

## src/modules/botTelegram/

### `src/modules/botTelegram/telegramBot.js`
- **Responsabilidade:** Bot do Telegram interativo (modo conversa). Maquina de estados que pergunta campo por campo (usuario, descricao, valor, tipo, parcelas, terceiro) usando inline keyboards e texto livre. Suporta comandos (/iniciar, /cancelar, /help), lancamento em lote (terceiros separados por virgula), validacao de mes fechado.
- **Dependencias:** `node-telegram-bot-api`, `./conversationManager`, `../../helpers/parseHelpers`, `./responseFormatter`, `../../constants`.
- **Exporta:** `{ criarBot }`.
- **Consumido por:** `telegramRoutes`.

### `src/modules/botTelegram/telegramRoutes.js`
- **Responsabilidade:** Rotas do webhook do Telegram. Cria instancia do bot e expoe endpoint POST `/telegram/webhook/:secret` para receber updates.
- **Dependencias:** `express`, `./telegramBot`.
- **Exporta:** Funcao que recebe `repo` e retorna `express.Router`.
- **Consumido por:** `src/app.js`.

### `src/modules/botTelegram/conversationManager.js`
- **Responsabilidade:** Gerenciador de conversas do bot. Maquina de estados em memoria (Map) que controla o fluxo passo a passo. Etapas: USUARIO -> DESCRICAO -> VALOR -> TIPO -> (PARCELAS condicional) -> TERCEIRO -> fim.
- **Exporta:** `{ ETAPAS, iniciarConversa, obterConversa, avancarConversa, finalizarConversa, cancelarConversa, calcularProximaEtapa }`.
- **Consumido por:** `telegramBot`.

### `src/modules/botTelegram/messageParser.js`
- **Responsabilidade:** Parser de mensagem do Telegram (formato legado separado por ponto e virgula). Converte texto cru em objeto estruturado para insercao no sistema.
- **Dependencias:** `../../helpers/parseHelpers`, `../../constants`.
- **Exporta:** `{ parseMensagem, formatoEsperado }`.
- **Consumido por:** Nao referenciado no codigo principal (formato legado, substituido pelo modo conversa interativa).

### `src/modules/botTelegram/responseFormatter.js`
- **Responsabilidade:** Formatador de respostas do Telegram. Monta mensagens de sucesso (unitario e bulk) e erro no estilo visual do app, com escape de MarkdownV2.
- **Dependencias:** `../../constants`.
- **Exporta:** `{ formatarSucesso, formatarSucessoBulk, formatarErro, escaparMarkdown }`.
- **Consumido por:** `telegramBot`.

### `src/modules/botTelegram/setupWebhook.js`
- **Responsabilidade:** Script de setup do webhook do Telegram. Executado uma vez apos o deploy para registrar a URL do webhook na API do Telegram.
- **Dependencias:** `dotenv`, `node-telegram-bot-api`, `process.env`.
- **Exporta:** Nada (script executavel).
- **Consumido por:** `npm run telegram:setup`.

### `src/modules/botTelegram/README.md`
- **Responsabilidade:** Documentacao do modulo do bot Telegram.

---

## src/modules/calcularLuz/

### `src/modules/calcularLuz/calcularLuzRoutes.js`
- **Responsabilidade:** Rotas da API do modulo Calcular Luz: GET `/historico` (listar medicoes), POST `/salvar` (criar medicao), DELETE `/deletar/:id` (excluir medicao).
- **Dependencias:** `express`, `../../config/db`, `../../helpers/asyncHandler`.
- **Exporta:** `express.Router`.
- **Consumido por:** `src/app.js` (montado em `/calcularLuz-v2/api`).

### `src/modules/calcularLuz/public/index.html`
- **Responsabilidade:** Interface HTML do modulo Calcular Luz (formulario de nova medicao + tabela de historico).
- **Dependencias:** `css/style.css`, `js/app.js`.
- **Consumido por:** Servido estaticamente via `src/app.js` em `/calcularLuz-v2`.

### `src/modules/calcularLuz/public/css/style.css`
- **Responsabilidade:** Estilos do modulo Calcular Luz. Suporte a dark mode via `prefers-color-scheme`. Variaveis CSS para tema.
- **Consumido por:** `index.html`.

### `src/modules/calcularLuz/public/js/app.js`
- **Responsabilidade:** Logica frontend do modulo Calcular Luz. Calcula consumo (leitura atual - anterior) e valor estimado (tarifa + iluminacao publica). Envia para API e renderiza historico. Funcoes: `reuseRecord` (reutilizar leitura anterior), `deleteRecord` (excluir medicao).
- **Dependencias:** Nenhuma (vanilla JS).
- **Consumido por:** `index.html`.

---

## src/modules/dataHora/

### `src/modules/dataHora/dataHoraRoutes.js`
- **Responsabilidade:** Rotas do modulo Data/Hora. GET `/` (retorna data/hora de Brasilia em HTML ou JSON), GET `/json` (retorna apenas JSON). Usa API externa (RapidAPI) para obter horario confiavel.
- **Dependencias:** `express`, `fetch` (nativo).
- **Exporta:** `express.Router`.
- **Consumido por:** `src/app.js` (montado em `/dataHora` com autenticacao hibrida).

### `src/modules/dataHora/dataHoraNetlify/functions/dataHora.js`
- **Responsabilidade:** Netlify Function alternativa para obter data/hora de Brasilia. Usa `Intl.DateTimeFormat` com timezone `America/Sao_Paulo` (sem dependencia de API externa). Autenticacao via API Key no header ou query param.
- **Dependencias:** Nenhuma (serverless function).
- **Exporta:** `{ handler }` (Netlify Function).
- **Consumido por:** Netlify Functions (deploy separado).

### `src/modules/dataHora/dataHoraNetlify/package.json`
- **Responsabilidade:** Manifesto do modulo Netlify Functions (independente do projeto principal).

---

## src/modules/widgetLancamentos/

### `src/modules/widgetLancamentos/main.js`
- **Responsabilidade:** Processo principal do app Electron (Widget de Lancamentos Rapidos). Gerencia janelas (main + config), atalho global, tray icon, IPC handlers (submit lancamento, get/save config, resize/hide window), single instance lock, captura de exceções fatais.
- **Dependencias:** `electron`, `path`, `fs`, `./api/client`, `./config/loader`, `./config/logger`.
- **Exporta:** Nada (entry point do Electron).
- **Consumido por:** Electron (package.json do widget).

### `src/modules/widgetLancamentos/preload.js`
- **Responsabilidade:** Script de preload do Electron. Bridge segura entre renderer e main process via `contextBridge`. Expoe API `window.widgetAPI` com metodos: submitLancamento, resizeWindow, hideWindow, getConfig, saveConfig, etc.
- **Dependencias:** `electron` (contextBridge, ipcRenderer).
- **Exporta:** `window.widgetAPI` (global no renderer).
- **Consumido por:** Renderer (index.html, config.html).

### `src/modules/widgetLancamentos/api/client.js`
- **Responsabilidade:** Cliente HTTP para enviar lancamentos via API de integracao. Suporta terceiros multiplos (separados por virgula) fazendo N chamadas individuais. Tratamento de erros (ECONNREFUSED, 401, 400, 500).
- **Dependencias:** `axios`, `../config/loader`.
- **Exporta:** `{ enviarLancamento, testarConexao, apiClient }`.
- **Consumido por:** `main.js`.

### `src/modules/widgetLancamentos/config/loader.js`
- **Responsabilidade:** Carregamento e persistencia de configuracoes do widget. Merge de defaults com config do usuario (armazenado em `userData/default.json`). Valida apiUrl e apiToken.
- **Dependencias:** `path`, `fs`, `os`, `./logger`, `electron` (opcional).
- **Exporta:** `{ loadConfig, saveConfig, getConfigPath, getShippedConfigPath, DEFAULTS }`.
- **Consumido por:** `main.js`, `api/client`.

### `src/modules/widgetLancamentos/config/logger.js`
- **Responsabilidade:** Logger de erros do widget. Grava em `Log_erros.txt` com timestamp local. Tenta diretorio do executavel primeiro, depois fallback para userData.
- **Dependencias:** `fs`, `path`, `os`, `electron` (opcional).
- **Exporta:** `{ logErrorToFile }`.
- **Consumido por:** `main.js`, `config/loader`.

### `src/modules/widgetLancamentos/config/default.json`
- **Responsabilidade:** Configuracao padrao do widget (apiUrl, apiToken, hotkey, defaultUserId, autoStart, autoCloseOnSuccess, timeout).

### `src/modules/widgetLancamentos/config/default.example.json`
- **Responsabilidade:** Template de configuracao para documentacao.

### `src/modules/widgetLancamentos/renderer/index.html`
- **Responsabilidade:** Interface do widget (formulario de lancamento rapido).

### `src/modules/widgetLancamentos/renderer/config.html`
- **Responsabilidade:** Interface de configuracoes do widget (hotkey, apiUrl, apiToken, etc.).

### `src/modules/widgetLancamentos/renderer/config.js`
- **Responsabilidade:** Logica frontend da tela de configuracoes do widget.

### `src/modules/widgetLancamentos/renderer/form.js`
- **Responsabilidade:** Logica frontend do formulario de lancamento do widget.

### `src/modules/widgetLancamentos/renderer/styles.css`
- **Responsabilidade:** Estilos do widget.

### `src/modules/widgetLancamentos/package.json`
- **Responsabilidade:** Manifesto do widget (dependencias Electron, scripts de build).

---

## src/scripts/

### `src/scripts/google-apps-script-example.js`
- **Responsabilidade:** Exemplo de script Google Apps Script para integracao com a API do sistema (lançamento via HTTP).
- **Consumido por:** Documentacao/referencia.

---

## public/

> Nota: Arquivos frontend servidos estaticamente. Nao listados individualmente neste inventario (HTML, CSS, JS do dashboard principal). Ver estrutura em `public/`.

---

## views/

> Nota: Templates EJS renderizados pelo servidor. Nao listados individualmente neste inventario. Ver estrutura em `src/views/`.

---

## __tests__/

### `__tests__/botTelegram/messageParser.test.js`
- **Responsabilidade:** Testes do parser de mensagem do Telegram.

### `__tests__/botTelegram/responseFormatter.test.js`
- **Responsabilidade:** Testes do formatador de respostas do Telegram.

### `__tests__/botTelegram/telegramBot.test.js`
- **Responsabilidade:** Testes do bot do Telegram.

### `__tests__/config/db.test.js`
- **Responsabilidade:** Testes do modulo de conexao com o banco.

### `__tests__/constants.test.js`
- **Responsabilidade:** Testes das constantes do sistema.

### `__tests__/dataHora/dataHora.test.js`
- **Responsabilidade:** Testes do modulo data/hora.

### `__tests__/helpers/asyncHandler.test.js`
- **Responsabilidade:** Testes do wrapper asyncHandler.

### `__tests__/helpers/cacheHelpers.test.js`
- **Responsabilidade:** Testes do cache em memoria.

### `__tests__/helpers/initDatabase.test.js`
- **Responsabilidade:** Testes da inicializacao do banco.

### `__tests__/helpers/parseHelpers.test.js`
- **Responsabilidade:** Testes dos helpers de parsing.

### `__tests__/integration/api.test.js`
- **Responsabilidade:** Testes de integracao da API (supertest).

### `__tests__/middlewares/auth.test.js`
- **Responsabilidade:** Testes dos middlewares de autenticacao.

### `__tests__/middlewares/logger.test.js`
- **Responsabilidade:** Testes do middleware de logging.

### `__tests__/middlewares/rateLimiter.test.js`
- **Responsabilidade:** Testes do rate limiter.

### `__tests__/modules/calcularLuz/calcularLuzRoutes.test.js`
- **Responsabilidade:** Testes das rotas do modulo Calcular Luz.

### `__tests__/repositories/AnotacaoRepository.test.js`
- **Responsabilidade:** Testes do AnotacaoRepository.

### `__tests__/repositories/ConfiguracaoRepository.test.js`
- **Responsabilidade:** Testes do ConfiguracaoRepository.

### `__tests__/repositories/dashboardModular.test.js`
- **Responsabilidade:** Testes das queries modulares do dashboard.

### `__tests__/repositories/FaturaManualRepository.test.js`
- **Responsabilidade:** Testes do FaturaManualRepository.

### `__tests__/repositories/LancamentoRepository.test.js`
- **Responsabilidade:** Testes do LancamentoRepository.

### `__tests__/repositories/MesFechadoRepository.test.js`
- **Responsabilidade:** Testes do MesFechadoRepository.

### `__tests__/repositories/OrdemCardsRepository.test.js`
- **Responsabilidade:** Testes do OrdemCardsRepository.

### `__tests__/repositories/TokenRepository.test.js`
- **Responsabilidade:** Testes do TokenRepository.

### `__tests__/repositories/UsuarioRepository.test.js`
- **Responsabilidade:** Testes do UsuarioRepository.

### `__tests__/routes/authRoutes.test.js`
- **Responsabilidade:** Testes das rotas de autenticacao.

### `__tests__/routes/infraRoutes.test.js`
- **Responsabilidade:** Testes das rotas de infraestrutura.

### `__tests__/routes/integrationRoutes.test.js`
- **Responsabilidade:** Testes das rotas de integracao.

### `__tests__/routes/publicRoutes.test.js`
- **Responsabilidade:** Testes das rotas publicas.

### `__tests__/services/syncService.test.js`
- **Responsabilidade:** Testes do servico de sincronizacao.

### `__tests__/ui/appTooltips.test.js`
- **Responsabilidade:** Testes de tooltips da UI.

### `__tests__/ui/viewsTooltips.test.js`
- **Responsabilidade:** Testes de tooltips das views.

### `__tests__/versioning.test.js`
- **Responsabilidade:** Testes do sistema de versionamento.

### `__tests__/README.md`
- **Responsabilidade:** Documentacao da suite de testes.

---

## docs/

### `docs/API.md`
- **Responsabilidade:** Documentacao da API.

### `docs/DATABASE.md`
- **Responsabilidade:** Documentacao do banco de dados (schema, indices, constraints).

### `docs/DEPENDENCY_GRAPH.md`
- **Responsabilidade:** Grafo de dependencias do projeto.

### `docs/GSD_FLOW.md`
- **Responsabilidade:** Documentacao do fluxo GSD (Get Shit Done) 4-D.

### `docs/FILE_INDEX.md`
- **Responsabilidade:** Este arquivo (inventario completo).

### `docs/contexto/contexto_contas-a-pagar.yaml`
- **Responsabilidade:** Contexto do projeto em formato YAML (para agentes de IA).

### `docs/contexto/contexto_contas-a-pagar_sumario.yaml`
- **Responsabilidade:** Sumario do contexto do projeto.

### `docs/history/`
- **Responsabilidade:** Arquivo historico de migracoes, schemas e resumos de trabalho arquivados.

---

## Legenda

- **Responsabilidade:** O que o arquivo faz.
- **Dependencias:** Modulos externos ou internos que este arquivo importa.
- **Exporta:** O que o arquivo exporta (funcoes, objetos, classes).
- **Consumido por:** Quem importa/usa este arquivo.

---

## Estatisticas

- **Total de arquivos de codigo-fonte (src/):** ~60 arquivos JS
- **Total de testes:** ~30 arquivos de teste
- **Modulos independentes:** 4 (botTelegram, calcularLuz, dataHora, widgetLancamentos)
- **Repositories:** 8 (Anotacao, Configuracao, FaturaManual, Financeiro [facade], Lancamento, MesFechado, OrdemCards, Token, Usuario)
- **Rotas:** 6 modulos (dashboard, terceiros, configuracoes, lancamentos, outros, auth)
