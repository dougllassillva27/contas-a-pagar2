# Frontend Modules

> Documentacao dos modulos JavaScript do frontend.
> Caminho base: `public/js/`
> Atualizado: 2026-07-03

---

## Arquitetura Geral

```
public/js/
├── app.js                          # Entry point — importa e expoe todos os modulos no window
├── modules/
│   ├── shared.js                   # Helpers comuns (escapeHTML, cache)
│   ├── dashboard.js                # Core: soft refresh, backup, totais, JSON update
│   ├── lancamentos.js              # CRUD de lancamentos, mover mes, dividir, excluir lote
│   ├── terceiros.js                # Exclusao em lote de pessoa (dashboard grid)
│   ├── configuracoes.js            # Sync rules, wizard onboarding, salvamento de config
│   └── anotacoes.js                # Anotacoes globais/mensais, checklist, formatacao
├── dragdrop.js                     # Drag & drop de linhas e cards
├── login.js                        # Pagina de login
├── ui.js                           # Helpers de UI (modais, loading, avisos)
└── utils.js                        # Utilitarios gerais
```

---

## Modulo: `shared.js`

**Responsabilidade:** Helpers comuns reutilizados por todos os modulos.

### Funcoes Exportadas

| Funcao | Tipo | Descricao |
|--------|------|-----------|
| `escapeHTML(str)` | `function` | Escapa caracteres HTML (`&`, `<`, `>`, `"`, `'`) para prevencao de XSS |
| `softRefreshCache` | `Map` | Cache em memoria para respostas de soft refresh |
| `SOFT_REFRESH_TTL` | `const` | TTL do cache: 30 segundos (30000ms) |

### Dependencias

Nenhuma. Modulo raiz da arvore de dependencias.

---

## Modulo: `dashboard.js`

**Responsabilidade:** Core do dashboard. Gerencia soft refresh (JSON + fallback HTML), backup, totais de conferido, e atualizacao parcial da UI via API.

### Funcoes Exportadas

| Funcao | Tipo | Descricao |
|--------|------|-----------|
| `softRefresh(delayOverride, useCache)` | `async function` | Refresh parcial do dashboard. Tenta API JSON (`/api/dashboard/resumo`) primeiro; fallback para fetch HTML completo com DOMParser. Usa `AbortController` com timeout de 30s |
| `softRefreshSafe(delay, useCache)` | `async function` | Wrapper seguro autour de `softRefresh` com tratamento de erro |
| `atualizarTotalNaoConferido()` | `function` | Recalcula e exibe o total de lancamentos nao conferidos no header |
| `fazerBackup()` | `async function` | Exporta dados do mes atual como backup (JSON) |
| `refreshOnInsert()` | `async function` | Refresh otimizado apos insercao de lancamento |
| `refreshOnDelete()` | `async function` | Refresh otimizado apos exclusao de lancamento |
| `updateDashboardFromJSON(data)` | `function` | Atualiza cards e grids do dashboard diretamente a partir de objeto JSON (via API) |
| `getCurrentMonth()` | `function` | Retorna mes corrente (da URL ou `new Date()`) |
| `getCurrentYear()` | `function` | Retorna ano corrente (da URL ou `new Date()`) |

### Dependencias

| Modulo | O que usa |
|--------|-----------|
| `shared.js` | `softRefreshCache`, `SOFT_REFRESH_TTL` |

### Notas

- `softRefresh` e a funcao mais critica do sistema. Chamada apos toda mutacao (CRUD lancamentos).
- Re-inicializa drag-and-drop apos refresh HTML (`initDragAndDrop`, `initCardDragAndDrop`, `initTouchDragAndDrop`, etc.).
- Mantem estado de `mesFechado` via `document.body.dataset`.

---

## Modulo: `lancamentos.js`

**Responsabilidade:** Todas as operacoes de CRUD de lancamentos — status, exclusao, mover mes, dividir conta, copiar mes, formulario de novo lancamento, modal de ultimas contas.

### Funcoes Exportadas

| Funcao | Tipo | Descricao |
|--------|------|-----------|
| `alternarStatus(checkbox, id)` | `function` | Toggle PAGO/PENDENTE via `PATCH /api/lancamentos/:id/status` |
| `atualizarBulkCounterNative(input)` | `function` | Atualiza contador visual de lancamento em lote (virgulas no campo nome_terceiro) |
| `executarAcaoEmLotePessoa(status, pessoa, month, year)` | `async function` | Atualiza status de todos lancamentos de uma pessoa no mes via `POST /api/lancamentos/status-pessoa` |
| `confirmarExclusaoPessoa(pessoa, ...deps)` | `function` | Abre modal de confirmacao para excluir todos lancamentos de uma pessoa. Retorna callback de confirmacao |
| `moverMes(e, ids, direcao, ...deps)` | `async function` | Move lancamentos para mes anterior/proximo via `POST /api/lancamentos/mover-mes` |
| `moverLoteUltimas(direcao)` | `async function` | Move linhas selecionadas no modal "Ultimas" para mes anterior/proximo |
| `abrirModalDividirConta(...deps)` | `function` | Abre modal para dividir conta em varios terceiros. Configura autocomplete |
| `fecharModalDividirConta()` | `function` | Fecha modal de divisao e reseta estado interno |
| `confirmarDivisaoConta(...deps)` | `async function` | Executa divisao via `POST /api/lancamentos/dividir` |
| `confirmarExclusaoLoteUltimas()` | `function` | Exclui linhas selecionadas no modal "Ultimas" via `DELETE /api/lancamentos/lote` |
| `alternarConferido(checkbox, id)` | `async function` | Toggle conferido via `PATCH /api/lancamentos/:id/conferido` |
| `confirmarExclusao(id)` | `function` | Abre modal de confirmacao de exclusao individual |
| `enviarLancamento(e, tipoTransacao)` | `async function` | Submete formulario de lancamento (cria ou edita). Suporta lote (virgulas em nome_terceiro). `POST/PUT /api/lancamentos` |
| `abrirModalUltimas()` | `async function` | Carrega e exibe modal de ultimas contas inseridas via `GET /api/lancamentos/recentes` |
| `executarCopia()` | `async function` | Copia lancamentos do mes anterior via `POST /api/lancamentos/copiar` |
| `executarDeleteMes()` | `async function` | Exclui todos lancamentos do mes corrente via `DELETE /api/lancamentos/mes` |

### Dependencias

| Modulo | O que usa |
|--------|-----------|
| `dashboard.js` | `softRefresh`, `softRefreshSafe`, `atualizarTotalNaoConferido`, `getCurrentMonth`, `getCurrentYear` |
| `shared.js` | `escapeHTML`, `softRefreshCache` |

### Notas

- Usa variaveis de estado interno: `_idContaDividir`, `_valorContaDividir` para o modal de divisao.
- Funcao `setupAutocompleteTerceiros` (privada) configura autocomplete no modal de divisao.
- Funcao `getTipoExibicao` (privada) mapeia tipo_transacao para label visual.
- Muitas funcoes aceitam dependencias via parametro (DI) com fallback para `window.*` para compatibilidade com templates EJS.

---

## Modulo: `terceiros.js`

**Responsabilidade:** Exclusao em lote de lancamentos de uma pessoa a partir do grid de terceiros no dashboard.

### Funcoes Exportadas

| Funcao | Tipo | Descricao |
|--------|------|-----------|
| `confirmarExclusaoPessoa(pessoa, ...deps)` | `function` | Abre modal de confirmacao e retorna callback para `DELETE /api/lancamentos/pessoa/:nome?month=&year=` |

### Dependencias

| Modulo | O que usa |
|--------|-----------|
| `dashboard.js` | `softRefresh` |
| `shared.js` | `softRefreshCache` |

### Notas

- Modulo enxuto (46 linhas). Contem apenas a logica de exclusao de pessoa no contexto do grid de terceiros.
- Existe funcao homonima `confirmarExclusaoPessoa` tambem em `lancamentos.js` — a versao de `app.js` importa a de `lancamentos.js`.

---

## Modulo: `configuracoes.js`

**Responsabilidade:** Gerenciamento de configuracoes do usuario, regras de sync, e fluxo de onboarding/wizard.

### Funcoes Exportadas

| Funcao | Tipo | Descricao |
|--------|------|-----------|
| `salvarConfiguracoes()` | `async function` | Salva configuracoes gerais do usuario |
| `getRegrasSync()` | `async function` | Busca regras de sync do usuario via API |
| `renderizarRegrasSync(regras)` | `function` | Renderiza lista de regras de sync no DOM |
| `editarRegraSync(id)` | `function` | Abre formulario para editar regra de sync existente |
| `confirmarDeletarRegraSync(id)` | `function` | Abre modal de confirmacao para deletar regra de sync |
| `salvarRegraSync()` | `async function` | Salva (cria ou atualiza) regra de sync via API |
| `deletarRegraSync(id)` | `async function` | Deleta regra de sync via API |
| `finalizarWizard()` | `async function` | Finaliza wizard de onboarding (com dados) |
| `finalizarWizardSozinho()` | `async function` | Finaliza wizard pulando configuracao inicial |
| `concluirOnboarding()` | `async function` | Marca onboarding como concluido |

### Dependencias

Nao importa de outros modulos do diretorio `modules/`. Usa `window.*` e `fetch` direto.

### Notas

- Regras de sync controlam sincronizacao automatica de lancamentos entre meses.
- Wizard e fluxo guiado para novos usuarios configurarem categorias e preferencias iniciais.

---

## Modulo: `anotacoes.js`

**Responsabilidade:** Sistema de anotacoes do usuario — globais (persistem entre meses) e mensais. Suporta checklist, formatacao rica e preview.

### Funcoes Exportadas

| Funcao | Tipo | Descricao |
|--------|------|-----------|
| `isAnotacaoGlobal()` | `function` | Verifica se aba ativa e "Global" |
| `carregarAnotacoes()` | `async function` | Carrega anotacoes do servidor (global ou mensal) |
| `alternarAbaAnotacao(aba)` | `function` | Alterna entre aba "Global" e "Mensal" |
| `alternarModoAnotacao()` | `function` | Alterna entre modo edicao e preview |
| `renderAnotacoesPreview()` | `function` | Renderiza preview markdown-like da anotacao |
| `toggleChecklist(checkbox)` | `function` | Toggle item de checklist (marca/desmarca no servidor) |
| `inserirFormatacao(tipo)` | `function` | Insere sintaxe de formatacao (negrito, lista, checklist) na posicao do cursor |
| `salvarAnotacao()` | `async function` | Salva anotacao atual no servidor |
| `initAnotacoes()` | `function` | Inicializa sistema de anotacoes (event listeners, estado inicial) |

### Dependencias

Nao importa de outros modulos do diretorio `modules/`.

### Notas

- Anotacoes globais nao estao vinculadas a mes/ano.
- Anotacoes mensais estao vinculadas ao mes/ano corrente.
- Preview suporta sintaxe propria (checklists com checkboxes interativos).

---

## Entry Point: `app.js`

**Responsabilidade:** Importa todos os modulos e expoe funcoes no `window` para compatibilidade com templates EJS (onclick inline).

### Fluxo de Inicializacao

1. Define `window.isBackNavigation = false`
2. Importa funcoes de todos os modulos
3. Expoe via `Object.assign(window, {...})` — 30+ funcoes
4. Registra `refreshOnInsert` e `refreshOnDelete` no window
5. No `DOMContentLoaded`: ativa aba "Global" de anotacoes e carrega
6. Em localhost: desregistra Service Workers

### Dependencias (imports)

| Modulo | Funcoes importadas |
|--------|-------------------|
| `dashboard.js` | `softRefresh`, `softRefreshSafe`, `atualizarTotalNaoConferido`, `fazerBackup`, `refreshOnInsert`, `refreshOnDelete` |
| `lancamentos.js` | 16 funcoes (CRUD completo) |
| `anotacoes.js` | 8 funcoes (sistema de anotacoes) |
| `configuracoes.js` | 10 funcoes (config + sync + wizard) |

---

## Grafico de Dependencias

```
app.js (entry point)
├── dashboard.js
│   └── shared.js
├── lancamentos.js
│   ├── dashboard.js
│   └── shared.js
├── terceiros.js
│   ├── dashboard.js
│   └── shared.js
├── configuracoes.js (independente)
└── anotacoes.js (independente)
```

### Legenda de Direcao

- `shared.js` = modulo raiz, sem dependencias
- `dashboard.js` = core, dependente apenas de `shared.js`
- `lancamentos.js` e `terceiros.js` = dependem de `dashboard.js` + `shared.js`
- `configuracoes.js`, `anotacoes.js` = modulos independentes

---

## APIs Consumidas (Resumo)

| Endpoint | Metodo | Modulo | Finalidade |
|----------|--------|--------|------------|
| `/api/dashboard/resumo` | GET | `dashboard.js` | Soft refresh JSON |
| `/api/lancamentos` | POST/PUT | `lancamentos.js` | Criar/editar lancamento |
| `/api/lancamentos/:id` | PUT | `lancamentos.js` | Editar lancamento |
| `/api/lancamentos/:id/status` | PATCH | `lancamentos.js` | Toggle PAGO/PENDENTE |
| `/api/lancamentos/:id/conferido` | PATCH | `lancamentos.js` | Toggle conferido |
| `/api/lancamentos/mover-mes` | POST | `lancamentos.js` | Mover entre meses |
| `/api/lancamentos/dividir` | POST | `lancamentos.js` | Dividir conta entre terceiros |
| `/api/lancamentos/lote` | DELETE | `lancamentos.js` | Excluir lote |
| `/api/lancamentos/pessoa/:nome` | DELETE | `lancamentos.js`, `terceiros.js` | Excluir todos de uma pessoa |
| `/api/lancamentos/status-pessoa` | POST | `lancamentos.js` | Atualizar status em lote por pessoa |
| `/api/lancamentos/recentes` | GET | `lancamentos.js` | Listar ultimas contas |
| `/api/lancamentos/copiar` | POST | `lancamentos.js` | Copiar mes anterior |
| `/api/lancamentos/mes` | DELETE | `lancamentos.js` | Excluir mes inteiro |
