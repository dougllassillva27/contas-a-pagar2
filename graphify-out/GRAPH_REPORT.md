# Graph Report - contas-a-pagar  (2026-06-08)

## Corpus Check
- 114 files · ~222,591 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 828 nodes · 1115 edges · 69 communities (60 shown, 9 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 93 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `74c72253`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]

## God Nodes (most connected - your core abstractions)
1. `💸 Gestão Financeira Pessoal (Micro SaaS Edition)` - 20 edges
2. `mostrarAviso()` - 19 edges
3. `⚡ Widget Lançamentos` - 19 edges
4. `getMesRange()` - 18 edges
5. `softRefresh()` - 16 edges
6. `registerModalOpen()` - 16 edges
7. `ocultarLoading()` - 13 edges
8. `mostrarLoading()` - 12 edges
9. `handleModalClose()` - 10 edges
10. `normalizarParcelasPorTipo()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `salvarFaturaManual()` --calls--> `mostrarAviso()`  [INFERRED]
  public/js/app.js → public/js/ui.js
- `setupApp()` --calls--> `createApiAuth()`  [INFERRED]
  __tests__/routes/integrationRoutes.test.js → src/middlewares/auth.js
- `softRefresh()` --calls--> `initDoubleTapMobile()`  [INFERRED]
  public/js/app.js → public/js/ui.js
- `executarAcaoEmLotePessoa()` --calls--> `mostrarAviso()`  [INFERRED]
  public/js/app.js → public/js/ui.js
- `moverMes()` --calls--> `checkBloqueioMesFechado()`  [INFERRED]
  public/js/app.js → public/js/ui.js

## Communities (69 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (23): abrirLinkCompartilhado(), abrirModalWizard(), atualizarBulkCounter(), copiarAoClipboard(), copiarLinkCompartilhado(), editarConta(), fallbackCopiarAoClipboard(), fecharConfirmacao() (+15 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (25): abrirFormNovaRegra(), abrirModalUltimas(), alternarAbaAnotacao(), alternarConferido(), alternarModoAnotacao(), alternarStatus(), atualizarTotais(), atualizarTotalNaoConferido() (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (26): addLancamento(), addLancamentosBulk(), copyMonth(), db, deleteLancamentosPorPessoa(), deleteMonth(), dividirConta(), findAndUpdateOrCreateContaFixa() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (36): avancarConversa(), calcularProximaEtapa(), cancelarConversa(), conversas, ETAPAS, finalizarConversa(), FLUXO_PADRAO, iniciarConversa() (+28 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (26): formatoEsperado(), parseMensagem(), { parseValor, normalizarTipoIntegracao, normalizarParcelasPorTipo }, { STATUS, TIPO }, normalizarParcelasPorTipo(), normalizarTexto(), normalizarTipoIntegracao(), parseParcelasFlex() (+18 more)

### Community 5 - "Community 5"
Cohesion: 0.21
Nodes (10): abrirModalCartaoPessoa(), softRefresh(), softRefreshSafe(), initCardDragAndDrop(), initDragAndDrop(), initTouchCardDragAndDrop(), initTouchDragAndDrop(), salvarOrdemCardsDebounced (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.36
Nodes (7): adjustWindowHeight(), closeModal(), parseValorParaApi(), selecionarTipo(), selecionarUsuario(), validarObrigatorio(), validarValor()

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (31): apiClient, axios, enviarLancamento(), { loadConfig }, testarConexao(), DEFAULTS, fs, loadConfig() (+23 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (21): asyncHandler, criarToken(), crypto, db, gerarToken(), hashToken(), renovarToken(), revogarToken() (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (41): author, dependencies, bcrypt, compression, cookie-parser, dotenv, ejs, express (+33 more)

### Community 10 - "Community 10"
Cohesion: 0.32
Nodes (4): executarSincronizacaoDinamica(), processarCopiaTotal(), processarDivisaoCasa(), syncService

### Community 11 - "Community 11"
Cohesion: 0.36
Nodes (7): createApiAuth(), { createApiAuth }, express, integrationRoutes, repo, request, setupApp()

### Community 12 - "Community 12"
Cohesion: 0.05
Nodes (39): 1️⃣ Clonar, 2️⃣ Instalar Dependências, 3️⃣ Criar Banco de Dados, 4️⃣ Variáveis de Ambiente, 5️⃣ Rodar, 🏗️ Arquitetura, ⚡ Arquitetura e Alta Performance, ⌨️ Atalhos de Teclado (Power Users) (+31 more)

### Community 13 - "Community 13"
Cohesion: 0.60
Nodes (3): adjustWindowHeight(), loadCurrentConfig(), showStatus()

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (7): criarUsuario(), db, getTodosUsuarios(), getUsuarioById(), obterUsuarioPorLogin(), db, { obterUsuarioPorLogin, getUsuarioById, criarUsuario, getTodosUsuarios }

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (7): crypto, diretoriosIgnorados, extensoesAlvo, fs, gerarHash(), path, processarUrl()

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (3): db, db, repo

### Community 18 - "Community 18"
Cohesion: 0.28
Nodes (4): authMiddleware(), createAuthHybrid(), repo, { authMiddleware, createApiAuth }

### Community 20 - "Community 20"
Cohesion: 0.29
Nodes (3): db, db, repo

### Community 21 - "Community 21"
Cohesion: 0.29
Nodes (3): db, db, repo

### Community 22 - "Community 22"
Cohesion: 0.29
Nodes (3): db, db, repo

### Community 23 - "Community 23"
Cohesion: 0.43
Nodes (5): db, isMesFechado(), db, { isMesFechado, toggleMesFechado }, toggleMesFechado()

### Community 24 - "Community 24"
Cohesion: 0.29
Nodes (3): db, db, repo

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (29): `api/`, 🏗️ Arquitetura, 🌐 Backend / API, 🏗️ Build, 🚀 Como rodar localmente, `config/`, 📌 Decisões técnicas, 🌍 Deploy (+21 more)

### Community 27 - "Community 27"
Cohesion: 0.09
Nodes (22): 🏗️ Arquitetura, 🤖 Bot Telegram — Contas a Pagar, 🚀 Comandos do Bot, Como obter o Chat ID, Como obter o Token, ⚙️ Configuração, Conta Fixa, Conta Parcelada (+14 more)

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (17): concluirOnboarding(), confirmarDivisaoConta(), enviarLancamento(), executarAcaoConferidoLote(), executarCopia(), executarDeleteMes(), finalizarWizard(), finalizarWizardSozinho() (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (3): db, db, initDatabase

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (3): express, request, requestLogger

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (4): RENDER_URL, SECRET, TelegramBot, TOKEN

### Community 32 - "Community 32"
Cohesion: 0.22
Nodes (6): app, dataHoraRoutes, express, request, express, router

### Community 34 - "Community 34"
Cohesion: 0.25
Nodes (7): Exemplo de Saída, Fluxo de Trabalho, Formato da Mensagem, Função, GSD Commit Agent, Regras Absolutas, Tipos Válidos

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (15): env, browser, es2021, node, extends, parserOptions, ecmaVersion, sourceType (+7 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (15): 05/Abril, 05/Abril, 05/Agosto, 05/Agosto (acabou o seguro), 05/Julho, 05/Julho, 05/Junho, 05/Junho (+7 more)

### Community 37 - "Community 37"
Cohesion: 0.15
Nodes (11): DEFAULT_LAJEADO_DADOS, apiLimiter, loginLimiter, rateLimit, bcrypt, db, DEFAULT_LAJEADO_DADOS, express (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (15): ❌ Algo quebrou, Como Criar um Novo Teste, Como Ler o Resultado, Como Rodar, Dicas, Estrutura dos Testes, Pré-requisitos, Quando Rodar? (+7 more)

### Community 40 - "Community 40"
Cohesion: 0.18
Nodes (10): appJsCode, appJsPath, dragdropJsCode, dragdropJsPath, fs, path, uiJsCode, uiJsPath (+2 more)

### Community 41 - "Community 41"
Cohesion: 0.09
Nodes (21): { apiLimiter }, apiRoutes, app, { authMiddleware, createApiAuth, createAuthHybrid }, calcularLuzRoutes, compression, cookieParser, crypto (+13 more)

### Community 42 - "Community 42"
Cohesion: 0.14
Nodes (17): abrirModalDividirConta(), abrirModalRendasDetalhes(), confirmarExclusao(), confirmarExclusaoLoteUltimas(), confirmarExclusaoPessoa(), executarAcaoEmLotePessoa(), moverLoteUltimas(), renderizarRegrasSync() (+9 more)

### Community 44 - "Community 44"
Cohesion: 0.13
Nodes (14): author, dependencies, axios, description, devDependencies, electron, electron-builder, license (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.20
Nodes (9): author, description, keywords, license, main, name, scripts, test (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.20
Nodes (9): 🧠 A Lei da Memória Virtual (ID-Based), Fase 1: Discuss & Diagnose (A Regra do Mago Acadêmico), Fase 2: Plan & Develop (O Planejamento Checklist), Fase 3: Execute & Deliver (Execução Atômica e Testabilidade), Fase 4: Verify & Commit (UAT e Auditoria de Mutação), 🚀 Fluxo GSD (Get Shit Done) 4-D & Protocolo de Memória, O Arquivo `resumo-de-trabalho.md`, 🏛️ O Fluxo GSD 4-D em Quatro Etapas (+1 more)

### Community 49 - "Community 49"
Cohesion: 0.22
Nodes (8): background_color, display, icons, name, orientation, short_name, start_url, theme_color

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (7): 1. Camada de Filtro (Precision Search), 2. Camada de Scan (Linhas Imediatas), 3. Camada de Deep Dive (Leitura Seletiva), 🏎️ O Protocolo de Busca Cirúrgica em 3 Camadas, 🛡️ Prefixo RTK Obrigatório no Terminal, ⚡ RTK (Rust Token Killer) Mindset — Eficiência de Tokens, 🔇 Supressão de Ruído no Terminal

### Community 52 - "Community 52"
Cohesion: 0.18
Nodes (10): AnotacaoRepository, BackupRepository, ConfiguracaoRepository, FaturaManualRepository, LajeadoRepository, LancamentoRepository, MesFechadoRepository, OrdemCardsRepository (+2 more)

### Community 53 - "Community 53"
Cohesion: 0.18
Nodes (12): Comandos Essenciais, Dodo Starter Pack - Manifesto Anti-Vibe Coding, Estrutura de Dominio Recomendada, 📁 Estrutura de Domínio Recomendada, Modularização Obrigatória (Anti-Monolito), Referencia Cruzada, Regras Globais, Regras Inegociaveis (Anti-Vibe Coding) (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.20
Nodes (8): db, express, router, app, db, express, infraRoutes, request

### Community 55 - "Community 55"
Cohesion: 0.33
Nodes (5): apiToken, apiUrl, autoStart, defaultUserId, hotkey

### Community 56 - "Community 56"
Cohesion: 0.40
Nodes (4): Meta Commands, RTK - Rust Token Killer (Google Antigravity), Rule, Why

### Community 58 - "Community 58"
Cohesion: 0.50
Nodes (3): { execSync }, fs, path

### Community 65 - "Community 65"
Cohesion: 0.18
Nodes (10): Debug / Metodologia, Frontend / UX, [LESSON-20260601-01] Lock Contention em DB Serverless (Neon), [LESSON-20260601-02] Pool Connection Contamination pós-Transação, [LESSON-20260601-03] Race Condition entre history.back() e Modais, [LESSON-20260601-04] window.location.reload() em SPAs com Sessão, [LESSON-20260601-05] Logs de Ping com Timestamp Relativo para Identificar Gargalos, [LESSON-20260601-06] Servidor Precisa Ser Reiniciado Após Edições Backend (+2 more)

### Community 66 - "Community 66"
Cohesion: 0.31
Nodes (8): bcrypt, db, express, publicRoutes, repo, request, session, setupApp()

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (4): app, bcrypt, repo, request

### Community 82 - "Community 82"
Cohesion: 0.50
Nodes (3): ejs, fs, path

## Knowledge Gaps
- **418 isolated node(s):** `browser`, `es2021`, `node`, `extends`, `ecmaVersion` (+413 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TIPO` connect `Community 4` to `Community 2`, `Community 3`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `STATUS` connect `Community 4` to `Community 2`, `Community 3`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `normalizarParcelasPorTipo()` connect `Community 4` to `Community 3`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `mostrarAviso()` (e.g. with `confirmarDivisaoConta()` and `enviarLancamento()`) actually correct?**
  _`mostrarAviso()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `softRefresh()` (e.g. with `initCardDragAndDrop()` and `initDragAndDrop()`) actually correct?**
  _`softRefresh()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `browser`, `es2021`, `node` to the rest of the system?**
  _418 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0946969696969697 - nodes in this community are weakly interconnected._