# Architecture Document - Contas a Pagar

**Data de geração:** 2026-07-03  
**Fonte:** Análise estática do código-fonte (src/)

---

## 1. Visão Geral da Arquitetura

Sistema de gestão financeira pessoal construído como **Modular Monolith** em Node.js/Express, seguindo padrões **MVC** e **Layer-Based Architecture** com separação clara de responsabilidades.

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Views)                        │
│              EJS Templates + JavaScript Vanilla              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    ROUTES (Controllers)                      │
│    apiRoutes.js, dashboardRoutes.js, lancamentosRoutes.js   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    MIDDLEWARES (Cross-cutting)               │
│         auth.js, rateLimiter.js, logger.js                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    SERVICES (Business Logic)                 │
│              syncService.js, calculoService.js              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 REPOSITORIES (Data Access)                   │
│  FinanceiroRepository (Facade) → Especializados (CRUD SQL)  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                     │
│                    pg (node-postgres)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Camadas da Arquitetura

### 2.1 Frontend (Views)

**Localização:** `src/views/`, `public/`, `src/modules/*/public/`

**Tecnologias:**
- EJS (Embedded JavaScript) para renderização server-side
- CSS3 Vanilla com variáveis CSS e Grid/Flexbox
- JavaScript ES6+ modular (app.js, dashboard.js)

**Evidências no código:**
```
src/views/index.ejs          → Dashboard principal
src/views/relatorio.ejs      → Relatório mensal
src/modules/calcularLuz/public/ → Módulo estático (HTML/CSS/JS)
public/css/style.css         → Estilos globais
public/js/app.js             → Lógica frontend do dashboard
```

**Padrão:** Server-Side Rendering (SSR) com EJS + endpoints JSON para atualizações parciais (softRefresh).

---

### 2.2 Routes (Controllers)

**Localização:** `src/routes/`

**Responsabilidade:** Mapear requisições HTTP para lógica de negócio, orquestrar dados e renderizar views.

**Estrutura modular por domínio:**
```
src/routes/
├── apiRoutes.js              → Facade que monta todos os sub-módulos
├── authRoutes.js             → Login/logout (público)
├── infraRoutes.js            → Health check, version (público)
├── publicRoutes.js           → Rotas públicas (login, logout)
├── integrationRoutes.js      → API externa (Android, token-based)
├── dashboard/
│   ├── dashboardRoutes.js    → GET /, GET /relatorio, API totals
│   └── navigationHelpers.js  → Lógica de navegação por mês/ano
├── lancamentos/
│   ├── lancamentosRoutes.js  → CRUD de lançamentos (FIXA, CARTAO)
│   └── classificacaoHelpers.js
├── terceiros/
│   ├── terceirosRoutes.js    → Gestão de terceiros
│   └── terceirosHelpers.js
├── configuracoes/
│   └── configuracoesRoutes.js → Preferências do usuário
└── outros/
    └── outrosRoutes.js       → Rotas auxiliares
```

**Evidência de padrão Controller:**
```javascript
// src/routes/dashboard/dashboardRoutes.js
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.session.user.id;
  const { month, year, nav } = calcularContextoNavegacao(req.query);
  
  // 1. Busca configurações
  configuracoes = await repo.getConfiguracoes(userId);
  
  // 2. Busca dados do dashboard
  const { totais, fixas, cartao, ... } = await repo.getDashboardDataModular(...);
  
  // 3. Renderiza view com dados
  res.render('index', { totais, fixas, cartao, ... });
}));
```

---

### 2.3 Middlewares (Cross-cutting Concerns)

**Localização:** `src/middlewares/`

**Responsabilidade:** Interceptação de requisições para autenticação, logging, rate limiting.

**Middlewares identificados:**
```
src/middlewares/
├── auth.js          → Autenticação híbrida (sessão web + API token)
├── logger.js        → Log de requisições (requestLogger)
└── rateLimiter.js   → Limitação de taxa (apiLimiter)
```

**Evidência de padrão Middleware Chain:**
```javascript
// src/app.js - Pipeline de middlewares
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(requestLogger);              // Logger
app.use(session({...}));             // Sessão

// Rotas públicas (sem auth)
app.use(infraRoutes);
app.use(integrationRoutes(repo, createApiAuth(safeApiToken)));
app.use(telegramRoutes(repo));
app.use(publicRoutes(repo));

// Rotas protegidas
app.use(authMiddleware);             // Auth
app.use('/api', apiLimiter);         // Rate limiter
app.use(apiRoutes(repo));            // Rotas protegidas

// Error handler global
app.use((err, req, res, next) => {...});
```

**Autenticação Híbrida:**
```javascript
// src/middlewares/auth.js
exports.createAuthHybrid = (apiToken) => (req, res, next) => {
  // Tenta API token primeiro (M2M)
  const headerToken = req.headers['x-api-token'];
  if (headerToken === apiToken) return next();
  
  // Fallback para sessão web
  if (req.session?.user) return next();
  
  return res.status(401).json({ error: 'Não autenticado' });
};
```

---

### 2.4 Services (Business Logic)

**Localização:** `src/services/`

**Responsabilidade:** Lógica de negócio complexa, orquestração entre repositories, cálculos.

**Services identificados:**
```
src/services/
├── syncService.js           → Sincronização automática de lançamentos
├── calculoService.js        → Cálculos financeiros (juros, parcelas)
└── notificacaoService.js    → Notificações (Telegram, email)
```

**Evidência de padrão Service:**
```javascript
// src/routes/dashboard/dashboardRoutes.js
// Service chamado em background após render
setImmediate(async () => {
  const { executarSincronizacaoDinamica } = require('../../services/syncService');
  await executarSincronizacaoDinamica(repo, userId, month, year, regras_sync);
});
```

---

### 2.5 Repositories (Data Access)

**Localização:** `src/repositories/`

**Responsabilidade:** Abstrair acesso ao banco de dados, encapsular queries SQL.

**Padrão Facade + Repository Pattern:**
```
src/repositories/
├── FinanceiroRepository.js   → Facade (agrega todos os repositories)
├── UsuarioRepository.js      → CRUD de usuários
├── LancamentoRepository.js   → CRUD de lançamentos (FIXA, CARTAO)
├── AnotacaoRepository.js     → Anotações do dashboard
├── FaturaManualRepository.js → Faturas manuais de cartão
├── OrdemCardsRepository.js   → Ordem de exibição dos cards
├── MesFechadoRepository.js   → Controle de fechamento mensal
├── TokenRepository.js        → Tokens de autenticação persistente
└── ConfiguracaoRepository.js → Configurações do usuário
```

**Evidência de padrão Facade:**
```javascript
// src/repositories/FinanceiroRepository.js
const UsuarioRepository = require('./UsuarioRepository');
const LancamentoRepository = require('./LancamentoRepository');
// ... outros repositories

module.exports = {
  ...UsuarioRepository,        // getUsers, createUser, etc.
  ...LancamentoRepository,     // addLancamento, getLancamentos, etc.
  ...AnotacaoRepository,
  ...FaturaManualRepository,
  ...OrdemCardsRepository,
  ...MesFechadoRepository,
  ...TokenRepository,
  ...ConfiguracaoRepository,
};
```

**Evidência de padrão Repository:**
```javascript
// src/repositories/LancamentoRepository.js (exemplo)
exports.getLancamentosPorTipo = async (userId, tipo, month, year) => {
  const query = `
    SELECT * FROM lancamentos 
    WHERE user_id = $1 AND tipo = $2 
    AND EXTRACT(MONTH FROM data) = $3 
    AND EXTRACT(YEAR FROM data) = $4
    ORDER BY data DESC
  `;
  const result = await db.query(query, [userId, tipo, month, year]);
  return result.rows;
};
```

---

### 2.6 Database (PostgreSQL)

**Localização:** `src/config/db.js`

**Tecnologia:** PostgreSQL com driver `pg` (node-postgres)

**Evidência:**
```javascript
// src/config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
```

**Schema (inferido do código):**
```sql
-- Tabelas principais (evidências de queries nos repositories)
usuarios (id, nome, email, senha_hash)
lancamentos (id, user_id, tipo, valor, data, description, status, terceito_id)
terceiros (id, user_id, nome)
anotacoes (id, user_id, texto, data)
fatura_manual (id, user_id, valor, mes, ano)
ordem_cards (user_id, ordem_json)
mes_fechado (user_id, mes, ano, fechado)
tokens (user_id, token, expires_at)
configuracoes (user_id, config_json)
```

---

## 3. Módulos de Feature (Modular Monolith)

**Localização:** `src/modules/`

**Padrão:** Cada módulo é auto-contido com rotas, lógica e assets próprios.

```
src/modules/
├── botTelegram/              → Bot do Telegram para lançamentos rápidos
│   ├── telegramBot.js        → Instância e configuração do bot
│   ├── telegramRoutes.js     → Webhook endpoint
│   ├── conversationManager.js → Estado da conversa (máquina de estados)
│   ├── messageParser.js      → Parsing de mensagens
│   └── responseFormatter.js  → Formatação de respostas
│
├── calcularLuz/              → Calculadora de consumo de energia
│   ├── calcularLuzRoutes.js  → API do módulo
│   └── public/               → Frontend estático (HTML/CSS/JS)
│
├── dataHora/                 → Serviço de data/hora (M2M)
│   ├── dataHoraRoutes.js     → API protegida (híbrida: sessão ou token)
│   └── dataHoraNetlify/      → Deploy alternativo (Netlify Functions)
│
└── widgetLancamentos/        → Widget Electron para lançamentos rápidos
    ├── main.js               → Entry point Electron
    ├── renderer.js           → Lógica do renderer
    └── config/               → Configurações do widget
```

**Evidência de modularidade:**
```javascript
// src/app.js - Módulos montados como rotas independentes
app.use(telegramRoutes(repo));                    // Bot Telegram
app.use('/calcularLuz-v2', authMiddleware, 
  express.static(path.join(__dirname, 'modules/calcularLuz/public')));
app.use('/calcularLuz-v2/api', authMiddleware, calcularLuzRoutes);
```

---

## 4. Padrões de Design Identificados

### 4.1 MVC (Model-View-Controller)

**Evidências:**
- **Model:** Repositories (`src/repositories/`) encapsulam dados e acesso ao banco
- **View:** Templates EJS (`src/views/`) + assets estáticos (`public/`)
- **Controller:** Routes (`src/routes/`) orquestram requisição → dados → resposta

**Exemplo:**
```javascript
// Controller (dashboardRoutes.js)
router.get('/', asyncHandler(async (req, res) => {
  const dados = await repo.getDashboardDataModular(...);  // Model
  res.render('index', dados);                              // View
}));
```

---

### 4.2 Layer-Based Architecture (Camadas)

**Evidências:**
- Separação clara em diretórios: `routes/`, `services/`, `repositories/`, `config/`
- Dependências fluem unidirecionalmente: Routes → Services → Repositories → Database
- Middlewares isolam cross-cutting concerns (auth, logging)

**Fluxo típico:**
```
HTTP Request
  ↓
Middleware Chain (auth, rateLimiter, logger)
  ↓
Route Handler (Controller)
  ↓
Service (lógica de negócio, opcional)
  ↓
Repository (data access)
  ↓
Database (PostgreSQL via pg.Pool)
```

---

### 4.3 Modular Monolith

**Evidências:**
- Módulos de feature auto-contidos em `src/modules/`
- Cada módulo tem rotas, lógica e assets próprios
- Módulos montados como rotas independentes no `app.js`
- Baixo acoplamento entre módulos (comunicação via `repo` compartilhado)

**Exemplo:**
```javascript
// src/app.js - Módulos independentes
app.use(telegramRoutes(repo));           // Módulo botTelegram
app.use('/calcularLuz-v2', ...);         // Módulo calcularLuz
app.use('/dataHora', ...);               // Módulo dataHora
```

---

### 4.4 Facade Pattern

**Evidências:**
- `FinanceiroRepository` atua como Facade, agregando todos os repositories especializados
- Permite que `app.js` e routes usem um único objeto `repo` sem conhecer implementação interna

**Exemplo:**
```javascript
// src/repositories/FinanceiroRepository.js
module.exports = {
  ...UsuarioRepository,        // Métodos de usuário
  ...LancamentoRepository,     // Métodos de lançamentos
  ...AnotacaoRepository,       // Métodos de anotações
  // ... outros repositories
};

// Uso em routes (não precisa saber qual repository específico)
const repo = require('./repositories/FinanceiroRepository');
await repo.addLancamento(...);  // Funciona
await repo.getTodosUsuarios();  // Funciona
```

---

### 4.5 Repository Pattern

**Evidências:**
- Cada entidade/domínio tem seu próprio repository
- Queries SQL encapsuladas em métodos do repository
- Repositories testáveis isoladamente (injeção de dependência via `db`)

**Exemplo:**
```javascript
// src/repositories/LancamentoRepository.js
exports.addLancamento = async (userId, tipo, valor, data, descricao, terceiroId) => {
  const query = `INSERT INTO lancamentos (...) VALUES (...) RETURNING *`;
  const result = await db.query(query, [userId, tipo, valor, data, descricao, terceiroId]);
  return result.rows[0];
};
```

---

### 4.6 Dependency Injection (Parcial)

**Evidências:**
- Routes recebem `repo` como parâmetro (injeção via factory function)
- Facilita testes (pode mockar `repo`)

**Exemplo:**
```javascript
// src/app.js
const apiRoutes = require('./routes/apiRoutes');
app.use(apiRoutes(repo));  // Injeta dependência

// src/routes/apiRoutes.js
module.exports = function (repo) {  // Recebe dependência
  const dashboardRoutes = require('./dashboard/dashboardRoutes')(repo);
  // ...
};
```

---

### 4.7 Middleware Chain (Pipeline)

**Evidências:**
- Express middleware pipeline para processamento de requisições
- Middlewares reutilizáveis (auth, rateLimiter, logger)
- Error handler global no final da cadeia

**Exemplo:**
```javascript
// src/app.js
app.use(requestLogger);        // 1. Log
app.use(session({...}));       // 2. Sessão
app.use(infraRoutes);          // 3. Rotas públicas
app.use(authMiddleware);       // 4. Auth
app.use('/api', apiLimiter);   // 5. Rate limiter
app.use(apiRoutes(repo));      // 6. Rotas protegidas
app.use((err, req, res, next) => {...});  // 7. Error handler
```

---

### 4.8 Server-Side Rendering (SSR) + API Endpoints

**Evidências:**
- Views EJS renderizadas server-side para SEO e performance inicial
- Endpoints JSON (`/api/dashboard/totals`, `/api/dashboard/resumo`) para atualizações parciais sem reload
- Padrão "Progressive Enhancement" (funciona sem JS, melhora com JS)

**Exemplo:**
```javascript
// Renderização SSR
router.get('/', asyncHandler(async (req, res) => {
  const dados = await repo.getDashboardDataModular(...);
  res.render('index', dados);  // HTML renderizado no servidor
}));

// API endpoint para softRefresh
router.get('/api/dashboard/resumo', asyncHandler(async (req, res) => {
  const data = await repo.getDashboardDataModular(...);
  res.json({ success: true, data });  // JSON para atualização parcial
}));
```

---

### 4.9 Cache Pattern (In-Memory)

**Evidências:**
- `src/helpers/resumoCache.js` implementa cache em memória para dashboard
- Reduz carga no banco para consultas frequentes

**Exemplo:**
```javascript
// src/routes/dashboard/dashboardRoutes.js
const cached = resumoCache.get(userId, month, year);
if (cached) {
  return res.json(cached);  // Cache HIT
}

const data = await getDashboardDataModular(...);
resumoCache.set(response, userId, month, year);  // Cache MISS → popula cache
```

---

### 4.10 State Machine (Conversation Manager)

**Evidências:**
- `src/modules/botTelegram/conversationManager.js` implementa máquina de estados para conversas
- Gerencia transições entre etapas da conversa (iniciar → perguntar campos → finalizar)

**Exemplo (inferido):**
```
ETAPAS = {
  INICIAR: 0,
  PERGUNTAR_TIPO: 1,
  PERGUNTAR_VALOR: 2,
  PERGUNTAR_DATA: 3,
  FINALIZAR: 4,
};
```

---

## 5. Fluxo de Dados Típico

### 5.1 Dashboard (GET /)

```
1. Usuário acessa /
   ↓
2. Middleware chain: logger → session → authMiddleware
   ↓
3. dashboardRoutes.js: GET /
   ↓
4. repo.getConfiguracoes(userId) → PostgreSQL
   ↓
5. repo.getDashboardDataModular(userId, month, year) → PostgreSQL
   ↓
6. Monta contexto: totais, fixas, cartao, terceiros, etc.
   ↓
7. Sincronização em background (setImmediate → syncService)
   ↓
8. res.render('index', contexto) → EJS → HTML
   ↓
9. Frontend (app.js) faz softRefresh via /api/dashboard/resumo
   ↓
10. resumoCache verifica cache → HIT/MISS → JSON response
```

### 5.2 Lançamento via Telegram

```
1. Mensagem no Telegram → Webhook (POST /telegram/webhook)
   ↓
2. telegramRoutes.js → telegramBot.js
   ↓
3. conversationManager: obtém estado da conversa
   ↓
4. messageParser: extrai dados da mensagem
   ↓
5. repo.addLancamento(...) → PostgreSQL
   ↓
6. responseFormatter: formata resposta
   ↓
7. TelegramBot.sendMessage() → Usuário recebe confirmação
```

---

## 6. Tecnologias e Dependências Principais

| Categoria | Tecnologia | Versão | Localização |
|-----------|-----------|--------|-------------|
| Runtime | Node.js | 18+ | `package.json` |
| Framework Web | Express | 4.18+ | `src/app.js` |
| Template Engine | EJS | 3.1+ | `src/views/` |
| Database | PostgreSQL | 14+ | `src/config/db.js` |
| DB Driver | pg (node-postgres) | 8.11+ | `src/config/db.js` |
| Autenticação | express-session | 1.17+ | `src/app.js` |
| Bot | node-telegram-bot-api | 0.61+ | `src/modules/botTelegram/` |
| Desktop | Electron | 25+ | `src/modules/widgetLancamentos/` |
| Segurança | helmet | 7.0+ | `src/app.js` |
| Compression | compression | 1.7+ | `src/app.js` |

---

## 7. Estrutura de Diretórios

```
contas-a-pagar/
├── src/
│   ├── app.js                    → Entry point (Express config)
│   ├── constants.js              → Constantes globais (STATUS, TIPO)
│   ├── config/
│   │   └── db.js                 → PostgreSQL connection pool
│   ├── routes/                   → Controllers (por domínio)
│   │   ├── apiRoutes.js          → Facade de rotas protegidas
│   │   ├── authRoutes.js         → Login/logout
│   │   ├── infraRoutes.js        → Health check, version
│   │   ├── publicRoutes.js       → Rotas públicas
│   │   ├── integrationRoutes.js  → API externa (Android)
│   │   ├── dashboard/            → Dashboard routes + helpers
│   │   ├── lancamentos/          → CRUD lançamentos
│   │   ├── terceiros/            → Gestão de terceiros
│   │   ├── configuracoes/        → Preferências
│   │   └── outros/               → Rotas auxiliares
│   ├── repositories/             → Data access layer
│   │   ├── FinanceiroRepository.js → Facade
│   │   ├── UsuarioRepository.js
│   │   ├── LancamentoRepository.js
│   │   └── ... (outros repositories)
│   ├── services/                 → Business logic
│   │   ├── syncService.js
│   │   ├── calculoService.js
│   │   └── notificacaoService.js
│   ├── middlewares/              → Cross-cutting concerns
│   │   ├── auth.js               → Autenticação híbrida
│   │   ├── logger.js             → Request logging
│   │   └── rateLimiter.js        → Rate limiting
│   ├── helpers/                  → Utility functions
│   │   ├── parseHelpers.js       → Parsing de valores
│   │   ├── asyncHandler.js       → Error handling para async
│   │   ├── resumoCache.js        → Cache em memória
│   │   └── initDatabase.js       → Database initialization
│   ├── modules/                  → Feature modules (modular monolith)
│   │   ├── botTelegram/          → Bot do Telegram
│   │   ├── calcularLuz/          → Calculadora de energia
│   │   ├── dataHora/             → Serviço de data/hora
│   │   └── widgetLancamentos/    → Widget Electron
│   ├── views/                    → EJS templates
│   │   ├── index.ejs             → Dashboard
│   │   ├── relatorio.ejs         → Relatório
│   │   └── partials/             → Componentes reutilizáveis
│   └── scripts/                  → Scripts auxiliares
│       └── google-apps-script-example.js
├── public/                       → Static assets
│   ├── css/
│   │   └── style.css             → Estilos globais
│   └── js/
│       ├── app.js                → Lógica do dashboard
│       └── dashboard.js          → Atualizações parciais
├── tests/                        → Testes automatizados
│   ├── integration/
│   └── unit/
├── docs/                         → Documentação
│   └── ARCHITECTURE.md           → Este arquivo
└── package.json                  → Dependências e scripts
```

---

## 8. Decisões Arquiteturais

### 8.1 Por que Modular Monolith (e não Microservices)?

**Evidências:**
- Sistema de gestão financeira pessoal (escala pequena/média)
- Módulos independentes mas compartilham banco de dados
- Deploy único (Render, Netlify Functions)
- Baixa complexidade operacional

**Vantagens para este contexto:**
- Simplicidade de deploy e operação
- Transações ACID no banco (importante para financeiro)
- Performance (sem overhead de rede entre serviços)
- Facilita manutenção por desenvolvedor solo

---

### 8.2 Por que Facade Pattern no FinanceiroRepository?

**Evidências:**
- `app.js` e routes usam `repo` sem conhecer implementação interna
- Permite refatorar repositories especializados sem quebrar callers
- Facilita testes (pode mockar facade inteira)

**Trade-off:**
- Pode esconder complexidade (facade muito grande)
- Solução: Documentar quais métodos vêm de qual repository

---

### 8.3 Por que SSR + API Endpoints (e não SPA)?

**Evidências:**
- SEO importante para relatórios (compartilhamento)
- Performance inicial (HTML renderizado no servidor)
- Funciona sem JavaScript (progressive enhancement)
- API endpoints permitem atualizações parciais (softRefresh)

**Trade-off:**
- Menos interatividade que SPA
- Solução: JavaScript vanilla para interações críticas

---

### 8.4 Por que Cache em Memória (resumoCache)?

**Evidências:**
- Dashboard acessado frequentemente (mesmos dados)
- Reduz carga no PostgreSQL
- Latência menor que query ao banco

**Trade-off:**
- Cache pode ficar stale
- Solução: Invalidação manual ao criar/editar lançamentos

---

## 9. Padrões de Segurança

### 9.1 Autenticação Híbrida

**Evidências:**
```javascript
// src/middlewares/auth.js
exports.createAuthHybrid = (apiToken) => (req, res, next) => {
  // 1. Tenta API token (M2M - machine-to-machine)
  const headerToken = req.headers['x-api-token'];
  if (headerToken === apiToken) return next();
  
  // 2. Fallback para sessão web (usuário logado)
  if (req.session?.user) return next();
  
  return res.status(401).json({ error: 'Não autenticado' });
};
```

**Casos de uso:**
- API token: Integração com Android, Netlify Functions (M2M)
- Sessão web: Dashboard acessado por usuário

---

### 9.2 Rate Limiting

**Evidências:**
```javascript
// src/middlewares/rateLimiter.js
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 100,                   // 100 requisições por IP
  message: 'Muitas requisições, tente novamente mais tarde',
});

app.use('/api', limiter);
```

---

### 9.3 Helmet (Security Headers)

**Evidências:**
```javascript
// src/app.js
app.use(helmet({ contentSecurityPolicy: false }));
// Adiciona headers: X-Content-Type-Options, X-Frame-Options, etc.
```

---

### 9.4 Validação de Input

**Evidências:**
```javascript
// src/app.js
app.use(express.json({ limit: '100kb' }));  // Previne DoS por payload massivo
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
```

---

## 10. Conclusão

O projeto **Contas a Pagar** segue uma arquitetura **Modular Monolith** bem estruturada, combinando padrões consagrados:

- **MVC** para separação de responsabilidades
- **Layer-Based Architecture** para fluxo unidirecional de dependências
- **Repository Pattern** para abstrair acesso ao banco
- **Facade Pattern** para simplificar interface do repositório
- **Middleware Chain** para cross-cutting concerns
- **Dependency Injection** parcial para testabilidade

A arquitetura é apropriada para o contexto (sistema pessoal, desenvolvedor solo, escala pequena/média), priorizando simplicidade operacional e manutenibilidade sem sacrificar escalabilidade futura.

---

**Fim do documento.**
