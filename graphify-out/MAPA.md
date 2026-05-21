# 🗺️ Mapa Arquitetural - contas-a-pagar

**Gerado em:** 2026-05-21  
**Commit base:** `48fdfbf1`  
**ID de Observação:** `[OBS-20260521-01]`

---

## 📦 Stack Tecnológica

| Camada | Tecnologia | Versão/Nota |
|--------|-----------|-------------|
| **Runtime** | Node.js | >=18.0.0 |
| **Backend** | Express | 5.x |
| **Banco** | PostgreSQL | Neon.tech (pool pg) |
| **Frontend** | EJS + Vanilla JS | SSR + módulos ES6 |
| **Testes** | Jest + Supertest | Unit/Integration |
| **Deploy** | Render | Free Tier |
| **Segurança** | bcrypt, helmet, rate-limit | Hash + headers + throttling |

---

## 🏗️ Estrutura de Diretórios

```
contas-a-pagar/
├── src/
│   ├── app.js              # Entry point Express
│   ├── db.js               # Conexão PostgreSQL + pool
│   ├── routes/
│   │   ├── apiRoutes.js    # Rotas API + fallback configs
│   │   └── authRoutes.js   # Auth: login/signup
│   ├── repositories/
│   │   └── LancamentoRepository.js  # Queries otimizadas
│   ├── services/
│   │   └── syncService.js  # Motor de regras dinâmicas
│   └── middlewares/
│       └── auth.js         # Middleware de autenticação
├── public/
│   ├── js/
│   │   ├── app.js          # Entry point frontend
│   │   ├── ui.js           # Utilitários de UI
│   │   ├── dragdrop.js     # Drag-and-drop cards
│   │   └── utils.js        # Helpers: debounce, getTipoExibicao
│   └── css/
├── __tests__/
│   ├── helpers/            # Mocks e utilitários de teste
│   ├── middlewares/        # Testes de auth
│   └── routes/             # Testes de integração
├── versionamento/
│   └── versionador.js      # Script de build/versionamento
├── graphify-out/
│   ├── TREE.md             # Árvore de arquivos (filtrada)
│   ├── GRAPH_REPORT.md     # Relatório de dependências
│   └── MAPA.md             # Este arquivo
├── docs/
├── _contexto-ia/
├── package.json
└── resumo-de-trabalho.md   # Log de progresso (hot storage)
```

---

## 🔗 Pontos de Entrada e Fluxo Principal

### Backend
1. `src/app.js` → Inicializa Express, middlewares, rotas
2. `src/db.js` → Gerencia pool PostgreSQL, transações, logs de performance
3. `src/routes/apiRoutes.js` → Roteamento de APIs + fallback de configs
4. `src/services/syncService.js` → Executa regras de sincronização dinâmicas

### Frontend
1. `public/js/app.js` → Bootstrapping da UI, event listeners, `softRefresh()`
2. `public/js/utils.js` → Funções utilitárias: `getMesRange()`, `getTipoExibicao()`
3. `public/js/dragdrop.js` → Lógica de drag-and-drop para cards de lançamentos

---

## 🎯 God Nodes (Alta Conectividade)

| Função | Arquivo | Dependências | Responsabilidade |
|--------|---------|-------------|-----------------|
| `mostrarAviso()` | `public/js/app.js` | 18 | Centralizador de notificações UI |
| `getMesRange()` | `public/js/utils.js` | 16 | Cálculo de período para filtros financeiros |
| `softRefresh()` | `public/js/app.js` | 15 | Re-renderização parcial + re-inicialização de componentes |
| `registerModalOpen()` | `public/js/ui.js` | 15 | Gerenciamento de estado de modais |
| `executarSincronizacaoDinamica()` | `src/services/syncService.js` | 9 | Motor de regras multi-tenant |

---

## 🔍 Padrões Arquiteturais Identificados

- **Repository Pattern**: `LancamentoRepository.js` encapsula acesso ao banco
- **Service Layer**: `syncService.js` contém lógica de negócio de sincronização
- **Modularização Frontend**: JS dividido por responsabilidade (app, ui, dragdrop, utils)
- **SSR com EJS**: Renderização server-side com injeção de dados via `res.render()`
- **Configuração Dinâmica**: Regras de sincronização armazenadas como JSONB no banco
- **Performance Observability**: Logs condicionais via `DEBUG_PERF` para métricas em produção

---

## ⚠️ Pontos de Atenção

1. **Relações Inferidas**: 33 conexões no `GRAPH_REPORT.md` marcadas como `[INFERRED]` — validar acurácia
2. **Comunidades Finas**: 4 comunidades com <3 nós omitidas — investigar módulos isolados
3. **Subquery `distintos_terceiros`**: Otimizada para 12 meses, mas ainda candidata a cache
4. **Fallback de Configs**: `apiRoutes.js` possui fallback para usuários sem linha em `configuracoes` — garantir consistência

---

## 📋 Próximos Passos Sugeridos

1. Validar relações inferidas entre `mostrarAviso()`, `softRefresh()` e `registerModalOpen()`
2. Auditoria de queries restantes para eliminar scans além dos 12 meses já otimizados
3. Documentar contrato de regras dinâmicas em `docs/regras-sync.md`
4. Adicionar testes de integração para `syncService.js` com cenários de falha parcial

---

*Este mapa segue o protocolo de Progressive Disclosure: informações essenciais primeiro, detalhes sob demanda via `graphify query` ou leitura direta de arquivos.*
