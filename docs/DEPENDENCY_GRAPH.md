# Dependency Graph - Contas a Pagar

**Gerado em:** 2026-07-03  
**Fonte:** Análise estática do código-fonte real

---

## 1. Dependências de Alto Nível (ASCII)

### Backend (Node.js/Express)

```
┌─────────────────────────────────────────────────────────────────┐
│                         app.js (Entry Point)                     │
│  - Configuração Express, sessão, middlewares globais            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ├─► config/db.js (PostgreSQL connection)
                 ├─► repositories/FinanceiroRepository.js
                 ├─► middlewares/auth.js (authMiddleware, createApiAuth, createAuthHybrid)
                 ├─► middlewares/logger.js (requestLogger)
                 ├─► middlewares/rateLimiter.js (apiLimiter, loginLimiter)
                 ├─► helpers/initDatabase.js
                 │
                 ├─► routes/
                 │   ├─► infraRoutes.js (health, ping) ──► db.js
                 │   ├─► publicRoutes.js (login, signup, logout, portal terceiro)
                 │   │   ├─► bcrypt
                 │   │   ├─► rateLimiter.js
                 │   │   ├─► constants.js
                 │   │   ├─► db.js
                 │   │   └─► dashboard/navigationHelpers.js
                 │   │
                 │   ├─► integrationRoutes.js (API Android)
                 │   ├─► apiRoutes.js (facade) ──► [dashboard, terceiros, configuracoes, lancamentos, outros]Routes.js
                 │   └─► authRoutes.js ──► TokenRepository.js, asyncHandler.js
                 │
                 └─► modules/
                     ├─► botTelegram/telegramRoutes.js ──► FinanceiroRepository
                     ├─► dataHora/dataHoraRoutes.js
                     └─► calcularLuz/calcularLuzRoutes.js
```

### Frontend (Vanilla JS com ES6 Modules)

```
┌─────────────────────────────────────────────────────────────────┐
│                    public/js/app.js (Entry Point)                │
│  - Importa módulos, expõe funções globalmente via window.*      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ├─► modules/dashboard.js
                 │   └─► modules/shared.js (escapeHTML, softRefreshCache)
                 │
                 ├─► modules/lancamentos.js
                 │   ├─► modules/dashboard.js (softRefresh, getCurrentMonth/Year)
                 │   └─► modules/shared.js (escapeHTML, softRefreshCache)
                 │
                 ├─► modules/anotacoes.js
                 │   └─► modules/dashboard.js (getCurrentMonth/Year)
                 │
                 ├─► modules/configuracoes.js
                 │   ├─► modules/dashboard.js (softRefresh, softRefreshSafe)
                 │   └─► modules/shared.js (softRefreshCache)
                 │
                 └─► modules/tooltips.js (standalone, sem imports)

┌─────────────────────────────────────────────────────────────────┐
│                    public/js/ui.js (1196 linhas)                 │
│  - Gerenciamento de modais, eventos DOM, atalhos teclado        │
│  - Usa window.* functions em vez de imports ES6                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 └─► Dependências via window.* (runtime):
                     - window.softRefreshCache
                     - window.checkBloqueioMesFechado
                     - window.mostrarLoading, window.ocultarLoading
                     - window.mostrarAviso, window.fecharModais
                     - window.initDragAndDrop, window.initTouchDragAndDrop
                     - window.refreshOnDelete, window.refreshOnInsert

┌─────────────────────────────────────────────────────────────────┐
│                    public/js/dragdrop.js                         │
│  - Lógica de drag & drop para cards e linhas                    │
│  - Sem imports ES6, expõe funções via window.*                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Dependências Críticas

### Backend

| Módulo | Depende De | Criticidade | Impacto se Falhar |
|--------|------------|-------------|-------------------|
| `app.js` | `config/db.js` | **CRÍTICA** | Aplicação inteira indisponível |
| `app.js` | `middlewares/auth.js` | **CRÍTICA** | Segurança comprometida, rotas desprotegidas |
| `publicRoutes.js` | `repositories/FinanceiroRepository.js` | **ALTA** | Login/signup/logout quebrados |
| `apiRoutes.js` | `repositories/FinanceiroRepository.js` | **CRÍTICA** | Todas as rotas protegidas quebradas |
| `authRoutes.js` | `repositories/TokenRepository.js` | **ALTA** | Autenticação persistente quebrada |
| `publicRoutes.js` | `dashboard/navigationHelpers.js` | **MÉDIA** | Portal de terceiros quebrado |

### Frontend

| Módulo | Depende De | Criticidade | Impacto se Falhar |
|--------|------------|-------------|-------------------|
| `app.js` | `modules/dashboard.js` | **CRÍTICA** | Funções de refresh e contexto quebradas |
| `lancamentos.js` | `modules/dashboard.js` | **ALTA** | Soft refresh após ações quebrado |
| `anotacoes.js` | `modules/dashboard.js` | **MÉDIA** | Contexto de mês/ano quebrado |
| `configuracoes.js` | `modules/dashboard.js` | **ALTA** | Refresh após salvar configurações quebrado |
| `ui.js` | `window.*` (runtime) | **CRÍTICA** | Toda interação de UI quebrada |

---

## 3. Módulos Altamente Acoplados

### Backend

#### `app.js` (154 linhas)
**Acoplamento:** 12 imports diretos  
**Problema:** Centraliza configuração de todos os módulos e rotas  
**Sintoma:** Qualquer mudança em middleware ou rota requer tocar em `app.js`

```
Dependências:
- config/db.js
- repositories/FinanceiroRepository.js
- middlewares/auth.js (3 funções)
- middlewares/logger.js
- middlewares/rateLimiter.js
- helpers/initDatabase.js
- routes/infraRoutes.js
- routes/publicRoutes.js
- routes/integrationRoutes.js
- routes/apiRoutes.js
- modules/botTelegram/telegramRoutes.js
- modules/dataHora/dataHoraRoutes.js
- modules/calcularLuz/calcularLuzRoutes.js
```

#### `publicRoutes.js` (257 linhas)
**Acoplamento:** 5 imports + dependência implícita de `repo` via parâmetro  
**Problema:** Mistura lógica de autenticação, cadastro e portal público  
**Sintoma:** Dificuldade em testar isoladamente

### Frontend

#### `ui.js` (1196 linhas) ⚠️ **CRÍTICO**
**Acoplamento:** Altíssimo via `window.*` (runtime)  
**Problema:** Monólito que centraliza toda lógica de UI  
**Sintoma:** Impossível testar sem mockar 20+ funções globais

**Dependências via window.*:**
- `window.softRefreshCache` (de `shared.js`)
- `window.checkBloqueioMesFechado` (definido em `ui.js` mesmo)
- `window.mostrarLoading`, `window.ocultarLoading` (definido em `ui.js` mesmo)
- `window.mostrarAviso` (definido em `ui.js` mesmo)
- `window.fecharModais` (definido em `ui.js` mesmo)
- `window.initDragAndDrop` (de `dragdrop.js`)
- `window.initTouchDragAndDrop` (de `dragdrop.js`)
- `window.refreshOnDelete` (de `dashboard.js`)
- `window.refreshOnInsert` (de `dashboard.js`)
- `window.atualizarTotalNaoConferido` (de `dashboard.js`)
- `window.fecharMenuContexto` (definido em `ui.js` mesmo)
- `window.resetSubmitting` (de `app.js`)

#### `app.js` (107 linhas)
**Acoplamento:** 5 imports ES6 + 30+ funções expostas via `window.*`  
**Problema:** Atua como "glue" entre módulos, expondo tudo globalmente  
**Sintoma:** Poluição do escopo global, dependências implícitas

**Funções expostas via window.*:**
- 10 funções de `dashboard.js`
- 15 funções de `lancamentos.js`
- 8 funções de `anotacoes.js`
- 8 funções de `configuracoes.js`
- 2 funções de `tooltips.js`

#### `lancamentos.js` (723 linhas)
**Acoplamento:** 2 imports ES6 + 10+ dependências via `window.*`  
**Problema:** Mistura lógica de negócio com manipulação DOM  
**Sintoma:** Funções recebem 5-6 parâmetros de callback

**Dependências via window.* (dentro de funções):**
- `window.checkBloqueioMesFechado`
- `window.mostrarLoading`, `window.ocultarLoading`
- `window.mostrarAviso`
- `window.fecharModais`
- `window.fecharMenuContexto`
- `window.refreshOnInsert`, `window.refreshOnDelete`
- `window.initDragAndDrop`, `window.initTouchDragAndDrop`

---

## 4. Dependências Circulares

### ⚠️ **Nenhuma dependência circular direta detectada**

Porém, há **acoplamento cíclico indireto** via `window.*`:

```
app.js
  ├─► dashboard.js (importa)
  │   └─► expõe softRefresh via window.*
  │
  ├─► lancamentos.js (importa)
  │   ├─► importa de dashboard.js
  │   └─► usa window.softRefresh (de dashboard.js via app.js)
  │
  └─► expõe tudo via window.*
      └─► ui.js usa window.* (depende de app.js ter sido carregado)
```

**Problema:** `ui.js` depende de `app.js` ter carregado e exposto funções via `window.*`, mas não há garantia de ordem de execução.

---

## 5. Imports Excessivos

### Backend

#### `app.js` - 12 imports diretos
**Limite recomendado:** 7-10 imports  
**Sugestão:** Extrair configuração de rotas para `config/routes.js`

#### `publicRoutes.js` - 5 imports + 1 require dinâmico
**Problema:** `require('./dashboard/navigationHelpers')` dentro de handler  
**Sugestão:** Mover para topo do arquivo

### Frontend

#### `app.js` - 5 imports ES6 + 30+ window.* exports
**Problema:** Atua como "barril" (barrel) que re-exporta tudo  
**Sintoma:** Poluição global, difícil rastrear origem de funções

**Funções expostas globalmente:**
```javascript
Object.assign(window, {
  softRefresh, softRefreshSafe, atualizarTotalNaoConferido, fazerBackup,
  executarAcaoEmLotePessoa, confirmarExclusaoPessoa, moverMes, moverLoteUltimas,
  abrirModalDividirConta, fecharModalDividirConta, confirmarDivisaoConta,
  confirmarExclusaoLoteUltimas, alternarConferido, confirmarExclusao,
  enviarLancamento, abrirModalUltimas, alternarStatus, atualizarBulkCounterNative,
  executarCopia, executarDeleteMes, carregarAnotacoes, alternarAbaAnotacao,
  alternarModoAnotacao, renderAnotacoesPreview, toggleChecklist, inserirFormatacao,
  salvarAnotacao, salvarConfiguracoes, getRegrasSync, renderizarRegrasSync,
  editarRegraSync, salvarRegraSync, deletarRegraSync, finalizarWizard,
  finalizarWizardSozinho, concluirOnboarding, showCustomTooltip, hideCustomTooltip,
});
```

#### `ui.js` - 0 imports ES6, 20+ window.* dependencies
**Problema:** Não usa sistema de módulos, depende inteiramente de escopo global  
**Sintoma:** Impossível fazer tree-shaking ou análise estática

#### `lancamentos.js` - 2 imports ES6 + 10+ window.* dependencies
**Problema:** Funções recebem muitos parâmetros de callback (5-6)  
**Exemplo:**
```javascript
export function confirmarExclusaoPessoa(
  pessoaSelecionadaContexto,
  checkBloqueioMesFechado,
  fecharMenuContexto,
  registerModalOpen,
  mostrarLoading,
  ocultarLoading,
  mostrarAviso,
  fecharModais
) // 8 parâmetros!
```

---

## 6. Gargalos Arquiteturais

### 🔴 **CRÍTICO: `ui.js` (1196 linhas)**

**Problema:** Monólito que centraliza toda lógica de UI  
**Sintomas:**
- 40+ funções em um único arquivo
- Dependência excessiva de `window.*`
- Impossível testar isoladamente
- Dificuldade em manter

**Funções centralizadas:**
- Gerenciamento de modais (15+ funções)
- Atalhos de teclado (10+ handlers)
- Menu de contexto
- Drag & drop (parcialmente em `dragdrop.js`)
- Compartilhamento de links
- Atualização de totais
- Formulários (parcelas, bulk mode)

**Sugestão:** Dividir em:
- `modals.js` (gerenciamento de modais)
- `keyboard.js` (atalhos de teclado)
- `contextMenu.js` (menu de contexto)
- `sharing.js` (compartilhamento)
- `forms.js` (formulários)

---

### 🟡 **ALTO: Acoplamento via `window.*`**

**Problema:** Frontend usa escopo global como "barril" de funções  
**Sintomas:**
- Dependências implícitas (difícil rastrear)
- Ordem de carregamento crítica
- Impossível fazer tree-shaking
- Testabilidade comprometida

**Ocorrências:**
- `app.js` expõe 30+ funções via `window.*`
- `ui.js` depende de 20+ funções via `window.*`
- `lancamentos.js` depende de 10+ funções via `window.*`
- `dragdrop.js` expõe 4 funções via `window.*`

**Sugestão:** Migrar para sistema de módulos ES6 puro:
- Criar `services/ui-service.js` para funções compartilhadas
- Usar `import/export` em vez de `window.*`
- Implementar dependency injection para callbacks

---

### 🟡 **ALTO: `lancamentos.js` - Callback Hell**

**Problema:** Funções recebem 5-8 parâmetros de callback  
**Sintomas:**
- Dificuldade de leitura
- Erros por esquecer parâmetros
- Testabilidade comprometida

**Exemplo:**
```javascript
export function moverMes(e, ids, direcao, checkBloqueioMesFechado, mostrarLoading, ocultarLoading, mostrarAviso)
```

**Sugestão:** Implementar service layer:
```javascript
// services/ui-service.js
export const uiService = {
  checkBloqueioMesFechado: () => {...},
  mostrarLoading: () => {...},
  ocultarLoading: () => {...},
  mostrarAviso: (titulo, msg) => {...}
};

// lancamentos.js
import { uiService } from './services/ui-service.js';
export function moverMes(e, ids, direcao) {
  if (uiService.checkBloqueioMesFechado()) return;
  uiService.mostrarLoading();
  // ...
}
```

---

### 🟠 **MÉDIO: `dashboard.js` - Centralização Excessiva**

**Problema:** 3 módulos dependem de `dashboard.js`  
**Dependentes:**
- `lancamentos.js` (softRefresh, getCurrentMonth/Year)
- `anotacoes.js` (getCurrentMonth/Year)
- `configuracoes.js` (softRefresh, softRefreshSafe)

**Sintoma:** Mudanças em `dashboard.js` impactam 3 módulos

**Sugestão:** Extrair funções compartilhadas para `context.js`:
```javascript
// modules/context.js
export function getCurrentMonth() {...}
export function getCurrentYear() {...}
export async function softRefresh() {...}
```

---

### 🟠 **MÉDIO: `shared.js` - Subutilizado**

**Problema:** Apenas 17 linhas, mas poderia conter mais helpers  
**Conteúdo atual:**
- `escapeHTML()`
- `softRefreshCache` (Map)
- `SOFT_REFRESH_TTL`

**Sintoma:** `ui.js` redefine `escapeHTML()` (linha 1186) em vez de importar

**Sugestão:** Mover para `shared.js`:
- `escapeHTML()` (já existe)
- `formatarMoeda()` (de `ui.js`)
- `getTipoExibicao()` (de `lancamentos.js`)

---

### 🟢 **BAIXO: `publicRoutes.js` - Require Dinâmico**

**Problema:** `require('./dashboard/navigationHelpers')` dentro de handler  
**Linha:** 198

**Sintoma:** Require dinâmico dificulta análise estática

**Sugestão:** Mover para topo do arquivo:
```javascript
const { calcularContextoNavegacao } = require('./dashboard/navigationHelpers');
```

---

## 7. Resumo Executivo

### Métricas

| Categoria | Quantidade | Severidade |
|-----------|------------|------------|
| Módulos >500 linhas | 2 (`ui.js`, `lancamentos.js`) | 🔴 CRÍTICO |
| Dependências via `window.*` | 60+ | 🔴 CRÍTICO |
| Funções com 5+ parâmetros | 8 | 🟡 ALTO |
| Imports em `app.js` (backend) | 12 | 🟠 MÉDIO |
| Imports em `app.js` (frontend) | 5 | 🟢 BAIXO |
| Dependências circulares | 0 | ✅ OK |

### Prioridades de Refatoração

1. **🔴 CRÍTICO:** Dividir `ui.js` em módulos menores (modals, keyboard, contextMenu, sharing, forms)
2. **🔴 CRÍTICO:** Migrar de `window.*` para ES6 modules + dependency injection
3. **🟡 ALTO:** Reduzir callback hell em `lancamentos.js` com service layer
4. **🟡 ALTO:** Extrair funções de contexto de `dashboard.js` para `context.js`
5. **🟠 MÉDIO:** Consolidar `shared.js` com mais helpers comuns
6. **🟢 BAIXO:** Mover require dinâmico em `publicRoutes.js` para topo

### Saúde Arquitetural

**Backend:** 🟡 **MODERADA**  
- Boa separação de rotas por domínio
- `app.js` com muitos imports (12)
- Middlewares bem organizados

**Frontend:** 🔴 **CRÍTICA**  
- Monólito `ui.js` (1196 linhas)
- Dependência excessiva de `window.*`
- Callback hell em `lancamentos.js`
- Ordem de carregamento crítica

---

**Próximos passos recomendados:**
1. Refatorar `ui.js` em 5 módulos menores
2. Implementar `services/ui-service.js` para funções compartilhadas
3. Migrar `window.*` para ES6 modules
4. Adicionar testes unitários para módulos críticos
