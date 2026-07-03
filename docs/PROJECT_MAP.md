# PROJECT_MAP - Contas a Pagar (Dodo Finance)

> Gerado em 2026-07-03. Baseado exclusivamente em imports/exports/referencias reais do codigo.

---

## 1. Resumo Executivo

| Campo | Valor |
|-------|-------|
| **Nome** | `gestao-financeira-cloud` (npm) / Dodo Finance (UI) |
| **Objetivo** | Sistema de controle financeiro pessoal com multi-usuario, suporte a terceiros, automacao via Telegram e integracao Android |
| **Backend** | Node.js >= 18, Express 5, EJS (server-side rendering) |
| **Frontend** | HTML5 + CSS3 Vanilla + JavaScript ES6+ (modular) |
| **Banco de Dados** | PostgreSQL (driver `pg`) |
| **Autenticacao** | `express-session` + tokens persistentes (`bcrypt` + cookies httpOnly) |
| **Integracoes** | Telegram Bot API, API Android (REST), Widget Electron desktop |
| **Testes** | Jest (unit + integration), Pytest (hooks Python) |
| **Autor** | Douglas Silva |

---

## 2. Estrutura de Diretorios Completa

```
contas-a-pagar/
|
|-- src/                              # Backend (Node.js/Express)
|   |-- app.js                        # Entry point - config Express, sessao, montagem de rotas
|   |-- constants.js                  # Constantes globais (STATUS, TIPO, LIMITES, SQL_SEM_TERCEIRO)
|   |
|   |-- config/
|   |   |-- db.js                     # Pool PostgreSQL (pg) com health check + retry
|   |   +-- db_dump.js               # Utilitario de dump do banco
|   |
|   |-- helpers/
|   |   |-- asyncHandler.js           # Wrapper async/await para rotas Express
|   |   |-- cacheHelpers.js           # Cache de respostas HTTP (ETag/Last-Modified)
|   |   |-- ConfiguracaoRepository.js # (helper) Logica de configuracoes
|   |   |-- initDatabase.js           # Inicializacao/migracao automatica do schema
|   |   |-- LajeadoRepository.js      # (helper) Logica especifica Lajeado
|   |   |-- parseHelpers.js           # Parse de valores monetarios, tipos, parcelas
|   |   +-- resumoCache.js           # Cache em memoria do resumo financeiro
|   |
|   |-- middlewares/
|   |   |-- auth.js                   # authMiddleware (web), createApiAuth (API), createAuthHybrid
|   |   |-- logger.js                 # Request logger middleware
|   |   +-- rateLimiter.js           # Rate limiting (loginLimiter, apiLimiter)
|   |
|   |-- repositories/
|   |   |-- FinanceiroRepository.js   # Facade - re-exporta todos os repositories
|   |   |-- UsuarioRepository.js      # CRUD usuarios
|   |   |-- LancamentoRepository.js   # CRUD lancamentos financeiros
|   |   |-- AnotacaoRepository.js     # CRUD anotacoes
|   |   |-- FaturaManualRepository.js # CRUD faturas manuais
|   |   |-- OrdemCardsRepository.js   # Ordem dos cards no dashboard
|   |   |-- MesFechadoRepository.js   # Controle de meses fechados
|   |   |-- TokenRepository.js        # Tokens persistentes ("Lembrar de mim")
|   |   +-- ConfiguracaoRepository.js # Configuracoes por usuario
|   |
|   |-- routes/
|   |   |-- apiRoutes.js              # Facade de rotas protegidas (delega por dominio)
|   |   |-- authRoutes.js             # /api/auth/* (token, validate, me)
|   |   |-- infraRoutes.js            # /health, /ping (sem auth)
|   |   |-- integrationRoutes.js      # /api/v1/integracao/* (Android + automacao)
|   |   |-- publicRoutes.js           # /login, /signup, /logout, /contas/:tokenPublico
|   |   |
|   |   |-- dashboard/
|   |   |   |-- dashboardRoutes.js    # Rotas do dashboard principal + /relatorio
|   |   |   +-- navigationHelpers.js  # Helper de navegacao mensal (month/year)
|   |   |
|   |   |-- lancamentos/
|   |   |   |-- lancamentosRoutes.js  # CRUD /api/lancamentos/*, /api/rendas
|   |   |   +-- classificacaoHelpers.js # Logica de classificacao de lancamentos
|   |   |
|   |   |-- terceiros/
|   |   |   |-- terceirosRoutes.js    # Dashboard de terceiros /terceiros
|   |   |   +-- terceirosHelpers.js   # Montagem e ordenacao de terceiros
|   |   |
|   |   +-- configuracoes/
|   |       +-- configuracoesRoutes.js # Configuracoes do usuario
|   |
|   |-- services/
|   |   +-- syncService.js            # Servico de sincronizacao
|   |
|   |-- views/                        # Templates EJS (server-side rendering)
|   |   |-- index.ejs                 # Dashboard principal
|   |   |-- login.ejs                 # Pagina de login
|   |   |-- signup.ejs                # Pagina de cadastro
|   |   |-- relatorio.ejs             # Relatorio mensal
|   |   |-- terceiro.ejs              # Portal publico de terceiro
|   |   |-- terceiros-dashboard.ejs   # Dashboard interno de terceiros
|   |   +-- partials/
|   |       |-- head.ejs              # <head> compartilhado
|   |       |-- header.ejs            # Header compartilhado
|   |       |-- sidebar.ejs           # Sidebar de navegacao
|   |       +-- modals.ejs            # Modais compartilhados
|   |
|   +-- scripts/
|       +-- google-apps-script-example.js # Exemplo de integracao Google Apps Script
|
|-- public/                           # Frontend estatico (servido pelo Express)
|   |-- css/
|   |   |-- index.css                 # Estilos do dashboard
|   |   |-- style.css                 # Estilos globais
|   |   |-- relatorio.css             # Estilos do relatorio
|   |   |-- terceiro.css              # Estilos do portal de terceiro
|   |   +-- terceiros-dashboard.css   # Estilos do dashboard de terceiros
|   |
|   |-- js/
|   |   |-- app.js                    # Entry point frontend (orquestra modulos)
|   |   |-- ui.js                     # Manipulacoes de UI/DOM
|   |   |-- utils.js                  # Funcoes utilitarias frontend
|   |   |-- dragdrop.js               # Drag & drop (ordenacao de cards)
|   |   |-- login.js                  # Logica da pagina de login
|   |   +-- modules/
|   |       |-- dashboard.js          # Modulo do dashboard
|   |       |-- lancamentos.js        # Modulo de lancamentos
|   |       |-- terceiros.js          # Modulo de terceiros
|   |       |-- anotacoes.js          # Modulo de anotacoes
|   |       |-- configuracoes.js      # Modulo de configuracoes
|   |       |-- tooltips.js           # Modulo de tooltips
|   |       +-- shared.js             # Funcoes compartilhadas entre modulos
|   |
|   |-- icons/
|   |   |-- favicons/                 # Favicons (ico, png, webp)
|   |   +-- social-media/            # Icones para compartilhamento (PWA)
|   |
|   |-- favicon.ico
|   |-- manifest.json                 # PWA manifest
|   +-- sw.js                         # Service Worker
|
|-- src/modules/                      # Modulos independentes (feature modules)
|   |
|   |-- botTelegram/                  # Bot do Telegram
|   |   |-- telegramBot.js            # Instancia do bot (node-telegram-bot-api)
|   |   |-- telegramRoutes.js         # Webhook endpoint POST /telegram/webhook/:secret
|   |   |-- conversationManager.js    # Gerenciamento de estado de conversa
|   |   |-- messageParser.js          # Parser de mensagens do usuario
|   |   |-- responseFormatter.js      # Formatacao de respostas
|   |   +-- setupWebhook.js          # Script de configuracao do webhook
|   |
|   |-- calcularLuz/                  # Modulo de calculo de consumo de energia
|   |   |-- calcularLuzRoutes.js      # Rotas /historico (GET registros_luz)
|   |   +-- public/                   # Frontend proprio (HTML/CSS/JS)
|   |       |-- index.html
|   |       |-- css/style.css
|   |       |-- js/app.js
|   |       +-- img/favicon.ico
|   |
|   |-- dataHora/                     # Modulo de sincronizacao de horario
|   |   |-- dataHoraRoutes.js         # Rota que consulta API externa de horario
|   |   +-- dataHoraNetlify/          # Deploy alternativo (Netlify Functions)
|   |       |-- functions/dataHora.js
|   |       |-- netlify.toml
|   |       +-- package.json
|   |
|   +-- widgetLancamentos/            # Widget desktop Electron para lancamentos rapidos
|       |-- main.js                   # Processo principal Electron
|       |-- preload.js                # Script de preload (IPC bridge)
|       |-- package.json              # Dependencias proprias (Electron)
|       |-- electron-builder.yml      # Config de build Electron
|       |-- api/
|       |   +-- client.js             # Cliente HTTP para API do servidor
|       |-- config/
|       |   |-- loader.js             # Carregamento de configuracao
|       |   |-- logger.js             # Logger do widget
|       |   +-- default.json          # Configuracao padrao
|       +-- renderer/                 # Interface do widget
|           |-- index.html
|           |-- config.html
|           |-- config.js
|           |-- form.js
|           +-- styles.css
|
|-- tests/                            # Testes Python (git hooks)
|   +-- test_git_hooks.py
|
|-- scripts/                          # Scripts de manutencao
|   |-- apply-migration.js            # Aplicacao de migrations
|   +-- check-index.js               # Verificacao de indices
|
|-- versionamento/
|   +-- versionador.js               # Script de versionamento (npm run build)
|
|-- docs/                             # Documentacao
|   |-- API.md
|   |-- DATABASE.md
|   |-- DEPENDENCY_GRAPH.md
|   |-- GSD_FLOW.md
|   |-- INTEGRATIONS.md
|   |-- Lajeado.md
|   |-- RTK_GUIDE.md
|   |-- contexto/                     # Contexto para IAs
|   |-- history/                      # Arquivo historico + migrations antigas
|   |-- skills/                       # JSON de skills/resumo
|   |-- SaaS/                         # Plano de generalizacao SaaS multi-tenant
|   +-- versionamento/               # Docs do versionador
|
|-- tasks/
|   +-- lessons.md                    # Licoes aprendidas (auto-aperfeicoamento)
|
|-- .env.example                      # Template de variaveis de ambiente
|-- package.json                      # Manifesto npm
|-- requirements.txt                  # Dependencias Python (ruff, pytest)
|-- CLAUDE.md                         # Instrucoes para Claude Code
|-- setup.ps1 / setup.sh             # Scripts de setup (hooks de git)
+-- resumo-de-trabalho.md            # Historico de auditoria tecnica
```

---

## 3. Responsabilidade de Cada Diretorio

### `src/` - Backend Principal
Entry point `src/app.js` configura Express, sessao, helmet, compression, cookie-parser e monta todas as rotas. Fluxo de request: infraRoutes (health) -> integrationRoutes (API Android) -> telegramRoutes (webhook) -> publicRoutes (login/signup) -> authMiddleware -> apiRoutes (dashboard protegido).

### `src/config/` - Infraestrutura de Dados
`db.js` - Pool PostgreSQL com health check (SELECT 1), retry automatico para conexoes stale (Neon serverless), performance logging opcional. `db_dump.js` - utilitario de dump.

### `src/helpers/` - Funcoes Auxiliares do Backend
`asyncHandler.js` - wrapper try/catch para rotas async. `parseHelpers.js` - parse de valores monetarios ("R$ 100,00"), normalizacao de tipos (fixa/parcelada/cartao), parcelas. `cacheHelpers.js` - ETag/Last-Modified. `resumoCache.js` - cache em memoria do resumo. `initDatabase.js` - migracao automatica do schema na inicializacao.

### `src/middlewares/` - Middlewares Express
`auth.js` - tres estrategias: `authMiddleware` (web, sessao + cookie persistente), `createApiAuth` (API, x-api-key header), `createAuthHybrid`. `rateLimiter.js` - `loginLimiter` (brute force) e `apiLimiter`. `logger.js` - log de requests.

### `src/repositories/` - Camada de Dados (Repository Pattern)
`FinanceiroRepository.js` e facade que re-exporta todos os repositories especializados via spread operator. Cada repository cuida de um dominio: `UsuarioRepository` (usuarios), `LancamentoRepository` (lancamentos financeiros CRUD), `AnotacaoRepository` (notas), `FaturaManualRepository` (faturas), `OrdemCardsRepository` (ordem de cards), `MesFechadoRepository` (fechamento mensal), `TokenRepository` (tokens persistentes), `ConfiguracaoRepository` (config por usuario).

### `src/routes/` - Camada de Rotas
`apiRoutes.js` e facade que delega para modulos por dominio: `dashboard/`, `lancamentos/`, `terceiros/`, `configuracoes/`, `outros/`. `publicRoutes.js` serve login/signup/logout e o portal publico de terceiros (`/contas/:tokenPublico` com validacao UUID). `integrationRoutes.js` expoe API para app Android (`/api/v1/integracao/lancamentos`) e automacao de copia mensal (`/api/v1/integracao/copiar-mensal`). `authRoutes.js` gerencia tokens persistentes (criar, revogar, validar, renovar).

### `src/services/` - Servicos de Dominio
`syncService.js` - logica de sincronizacao (cross-device/cross-platform).

### `src/views/` - Templates EJS
Server-side rendering. `index.ejs` (dashboard), `login.ejs`, `signup.ejs`, `relatorio.ejs`, `terceiro.ejs` (portal publico), `terceiros-dashboard.ejs`. `partials/` contem componentes reutilizaveis (head, header, sidebar, modals).

### `public/` - Frontend Estatico
Servido como static pelo Express. `js/app.js` e entry point que importa modulos ES6: `dashboard.js`, `lancamentos.js`, `terceiros.js`, `anotacoes.js`, `configuracoes.js`, `tooltips.js`, `shared.js`. Arquivos de suporte: `ui.js` (DOM), `utils.js` (utilitarios), `dragdrop.js` (ordenacao), `login.js` (auth UI). CSS separado por pagina. `manifest.json` + `sw.js` para PWA.

### `src/modules/botTelegram/` - Bot Telegram
Integracao com Telegram via `node-telegram-bot-api`. `telegramRoutes.js` expoe webhook endpoint com secret no path. `telegramBot.js` cria instancia do bot. `conversationManager.js` gerencia estado de conversa. `messageParser.js` interpreta comandos. `responseFormatter.js` formata respostas. `setupWebhook.js` e script de setup (`npm run telegram:setup`).

### `src/modules/calcularLuz/` - Calculo de Energia
Modulo independente com frontend proprio (`public/`). `calcularLuzRoutes.js` expoe `/historico` que consulta tabela `registros_luz`.

### `src/modules/dataHora/` - Sincronizacao de Horario
`dataHoraRoutes.js` consulta API externa (RapidAPI world-time) para horario de Brasilia. `dataHoraNetlify/` contem deploy alternativo como Netlify Function.

### `src/modules/widgetLancamentos/` - Widget Desktop Electron
App Electron independente (`package.json` proprio). `main.js` (processo principal) com single instance lock, tray icon, atalho global. `api/client.js` faz HTTP para API do servidor. `renderer/` contem UI do widget (form de lancamento rapido + configuracao). Build via `electron-builder`.

### `tests/` - Testes
`test_git_hooks.py` - testes Python dos hooks de git (validado via Pytest).

### `scripts/` - Scripts de Manutencao
`apply-migration.js` - aplicacao de migrations no banco. `check-index.js` - verificacao de indices.

### `versionamento/` - Versionamento
`versionador.js` - script executado via `npm run build` para geracao de versao/cache busting.

### `docs/` - Documentacao
API.md, DATABASE.md, DEPENDENCY_GRAPH.md, INTEGRATIONS.md, GSD_FLOW.md, RTK_GUIDE.md. Subpastas: `contexto/` (YAML de contexto para IAs), `history/` (arquivo historico + migrations legadas), `skills/` (JSON de skills), `SaaS/` (plano de generalizacao multi-tenant), `versionamento/`.

### `tasks/` - Gestao de Tarefas
`lessons.md` - licoes aprendidas e regras preventivas (auto-aperfeicoamento).
