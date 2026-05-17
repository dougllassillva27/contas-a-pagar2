# Graph Report - contas-a-pagar  (2026-05-17)

## Corpus Check
- 96 files · ~413,134 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 306 nodes · 426 edges · 78 communities (74 shown, 4 thin omitted)
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `48fdfbf1`
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
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 18|Community 18]]

## God Nodes (most connected - your core abstractions)
1. `mostrarAviso()` - 18 edges
2. `getMesRange()` - 16 edges
3. `softRefresh()` - 15 edges
4. `registerModalOpen()` - 15 edges
5. `ocultarLoading()` - 12 edges
6. `mostrarLoading()` - 11 edges
7. `handleModalClose()` - 10 edges
8. `processarTexto()` - 10 edges
9. `tratarComando()` - 9 edges
10. `finalizarEInserir()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `softRefresh()` --calls--> `initCardDragAndDrop()`  [INFERRED]
  public/js/app.js → public/js/dragdrop.js
- `softRefresh()` --calls--> `initTouchCardDragAndDrop()`  [INFERRED]
  public/js/app.js → public/js/dragdrop.js
- `softRefresh()` --calls--> `initDoubleTapMobile()`  [INFERRED]
  public/js/app.js → public/js/ui.js
- `setupApp()` --calls--> `createApiAuth()`  [INFERRED]
  __tests__/routes/integrationRoutes.test.js → src/middlewares/auth.js
- `softRefresh()` --calls--> `initDragAndDrop()`  [INFERRED]
  public/js/app.js → public/js/dragdrop.js

## Communities (78 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (37): abrirFormNovaRegra(), abrirModalRendasDetalhes(), confirmarExclusao(), abrirConfirmacaoAcao(), abrirLinkCompartilhado(), abrirModalAdicionar(), abrirModalCalcularLuz(), abrirModalConfiguracoes() (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (41): abrirModalUltimas(), alternarAbaAnotacao(), alternarConferido(), alternarModoAnotacao(), alternarStatus(), atualizarTotais(), atualizarTotalNaoConferido(), carregarAnotacoes() (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (19): addLancamentosBulk(), copyMonth(), deleteLancamentosPorPessoa(), deleteMonth(), findAndUpdateOrCreateContaFixa(), findAndUpdateOrCreateContaFixaComTerceiro(), getDadosTerceiros(), getDashboardDataBatched() (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.23
Nodes (18): avancarConversa(), calcularProximaEtapa(), cancelarConversa(), finalizarConversa(), iniciarConversa(), obterConversa(), escaparMarkdown(), formatarErro() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (8): formatoEsperado(), parseMensagem(), normalizarParcelasPorTipo(), normalizarTexto(), normalizarTipoIntegracao(), parseParcelasFlex(), parseValor(), classificarLancamento()

### Community 5 - "Community 5"
Cohesion: 0.25
Nodes (5): abrirModalCartaoPessoa(), initCardDragAndDrop(), initDragAndDrop(), initTouchCardDragAndDrop(), initTouchDragAndDrop()

### Community 6 - "Community 6"
Cohesion: 0.43
Nodes (6): criarToken(), gerarToken(), hashToken(), renovarToken(), revogarToken(), validarToken()

### Community 7 - "Community 7"
Cohesion: 0.47
Nodes (3): executarSincronizacaoDinamica(), processarCopiaTotal(), processarDivisaoCasa()

### Community 8 - "Community 8"
Cohesion: 0.4
Nodes (4): authMiddleware(), createApiAuth(), createAuthHybrid(), setupApp()

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `softRefresh()` connect `Community 1` to `Community 0`, `Community 5`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `registerModalOpen()` connect `Community 0` to `Community 1`, `Community 5`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `mostrarAviso()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `mostrarAviso()` (e.g. with `executarAcaoEmLotePessoa()` and `moverMes()`) actually correct?**
  _`mostrarAviso()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `softRefresh()` (e.g. with `initDragAndDrop()` and `initCardDragAndDrop()`) actually correct?**
  _`softRefresh()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `registerModalOpen()` (e.g. with `confirmarExclusaoPessoa()` and `abrirModalUltimas()`) actually correct?**
  _`registerModalOpen()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `ocultarLoading()` (e.g. with `moverMes()` and `executarAcaoConferidoLote()`) actually correct?**
  _`ocultarLoading()` has 10 INFERRED edges - model-reasoned connections that need verification._