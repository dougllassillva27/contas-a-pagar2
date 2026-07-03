# DATABASE.md - Schema Completo PostgreSQL

> Gerado automaticamente a partir do código-fonte (SQL + repositories + initDatabase.js)
> Última atualização: 2026-07-03

---

## Sumário

1. [Visão Geral](#visao-geral)
2. [Tabelas](#tabelas)
3. [Índices](#indices)
4. [Constraints](#constraints)
5. [Relacionamentos (FK)](#relacionamentos)
6. [Migrations (initDatabase.js)](#migrations)

---

<a id="visao-geral"></a>
## 1. Visão Geral

| # | Tabela | Responsabilidade |
|---|--------|-----------------|
| 1 | `Usuarios` | Credenciais de acesso |
| 2 | `Lancamentos` | Contas (Fixas, Cartão, Rendas), parcelas, status, terceiros |
| 3 | `Anotacoes` | Bloco de Notas (mensal e global) |
| 4 | `OrdemCards` | Ordem de exibição dos painéis de terceiros (Drag & Drop) |
| 5 | `FaturaManual` | Valor digitado manualmente no input "Fatura App" |
| 6 | `TokensPersistentes` | Sessões longas ("Lembrar de mim") com hash SHA-256 |
| 7 | `MesesFechados` | Controle de mês trancado (Month Lock) |
| 8 | `Lajeado` | Configuração visual do Portal Público (JSONB + mural) |
| 9 | `registros_luz` | Histórico de leituras do relógio de energia |
| 10 | `terceiros` | Agenda de contatos (nome + telefone + token público) |
| 11 | `configuracoes` | Preferências do usuário (WhatsApp, privacidade, divisão casa) |

---

<a id="tabelas"></a>
## 2. Tabelas

### 2.1 Usuarios

```sql
CREATE TABLE IF NOT EXISTS Usuarios (
    Id         SERIAL PRIMARY KEY,
    Nome       VARCHAR(50) NOT NULL,
    Login      VARCHAR(50) NOT NULL UNIQUE,
    SenhaHash  VARCHAR(255) NOT NULL
);
```

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| Id | SERIAL | NO | auto | PK |
| Nome | VARCHAR(50) | NO | - | Nome exibição |
| Login | VARCHAR(50) | NO | - | Username único |
| SenhaHash | VARCHAR(255) | NO | - | Hash bcrypt da senha |

---

### 2.2 Lancamentos

```sql
CREATE TABLE IF NOT EXISTS Lancamentos (
    Id               SERIAL PRIMARY KEY,
    UsuarioId        INT REFERENCES Usuarios(Id),
    Descricao        VARCHAR(255) NOT NULL,
    Valor            DECIMAL(18, 2) NOT NULL,
    Tipo             VARCHAR(20) NOT NULL,       -- 'RENDA', 'FIXA', 'CARTAO', 'PARCELADO', 'TERCEIRO'
    Categoria        VARCHAR(50),                -- 'Salário', 'Extra', 'Casa', etc
    Status           VARCHAR(20) DEFAULT 'PENDENTE',  -- 'PENDENTE', 'PAGO'
    DataVencimento   DATE NOT NULL,
    ParcelaAtual     INT,
    TotalParcelas    INT,
    NomeTerceiro     VARCHAR(100),               -- NULL = conta própria
    Ordem            INT DEFAULT 9999,
    Conferido        BOOLEAN DEFAULT FALSE,
    DataCriacao      TIMESTAMP DEFAULT NOW(),
    ConferidoExtrato BOOLEAN DEFAULT FALSE,
    MesVencimento    INT,                        -- Coluna computada (EXTRACT MONTH)
    AnoVencimento    INT                         -- Coluna computada (EXTRACT YEAR)
);
```

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| Id | SERIAL | NO | auto | PK |
| UsuarioId | INT | YES | - | FK -> Usuarios |
| Descricao | VARCHAR(255) | NO | - | Nome da conta |
| Valor | DECIMAL(18,2) | NO | - | Valor monetário |
| Tipo | VARCHAR(20) | NO | - | RENDA / FIXA / CARTAO / PARCELADO / TERCEIRO |
| Categoria | VARCHAR(50) | YES | - | Categoria livre |
| Status | VARCHAR(20) | YES | 'PENDENTE' | PENDENTE / PAGO |
| DataVencimento | DATE | NO | - | Data de vencimento |
| ParcelaAtual | INT | YES | - | Nº parcela atual |
| TotalParcelas | INT | YES | - | Total de parcelas |
| NomeTerceiro | VARCHAR(100) | YES | - | NULL = conta própria |
| Ordem | INT | YES | 9999 | Ordem de exibição |
| Conferido | BOOLEAN | YES | FALSE | Flag de conferência |
| DataCriacao | TIMESTAMP | YES | NOW() | Timestamp de criação |
| ConferidoExtrato | BOOLEAN | YES | FALSE | Flag conferência extrato |
| MesVencimento | INT | YES | - | Mês extraído de DataVencimento |
| AnoVencimento | INT | YES | - | Ano extraído de DataVencimento |

---

### 2.3 Anotacoes

```sql
CREATE TABLE IF NOT EXISTS Anotacoes (
    Id        SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id),
    Mes       INT,
    Ano       INT,
    Conteudo  TEXT,
    UNIQUE(UsuarioId, Mes, Ano)
);
```

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| Id | SERIAL | NO | auto | PK |
| UsuarioId | INT | YES | - | FK -> Usuarios |
| Mes | INT | YES | - | Mês (0 = global) |
| Ano | INT | YES | - | Ano (0 = global) |
| Conteudo | TEXT | YES | - | Texto da anotação |

---

### 2.4 OrdemCards

```sql
CREATE TABLE IF NOT EXISTS OrdemCards (
    Id        SERIAL PRIMARY KEY,
    UsuarioId INT DEFAULT 1,
    Nome      VARCHAR(255) NOT NULL,
    Ordem     INT NOT NULL
);
```

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| Id | SERIAL | NO | auto | PK |
| UsuarioId | INT | YES | 1 | FK implícita -> Usuarios |
| Nome | VARCHAR(255) | NO | - | Nome do terceiro |
| Ordem | INT | NO | - | Posição de exibição |

---

### 2.5 FaturaManual

```sql
CREATE TABLE IF NOT EXISTS FaturaManual (
    Id        SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id),
    Mes       INT NOT NULL,
    Ano       INT NOT NULL,
    Valor     DECIMAL(18, 2) DEFAULT 0,
    UNIQUE(UsuarioId, Mes, Ano)
);
```

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| Id | SERIAL | NO | auto | PK |
| UsuarioId | INT | YES | - | FK -> Usuarios |
| Mes | INT | NO | - | Mês referência |
| Ano | INT | NO | - | Ano referência |
| Valor | DECIMAL(18,2) | YES | 0 | Valor da fatura manual |

---

### 2.6 TokensPersistentes

```sql
CREATE TABLE IF NOT EXISTS TokensPersistentes (
    Id             SERIAL PRIMARY KEY,
    UsuarioId      INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
    Token          VARCHAR(255) NOT NULL UNIQUE,
    DataExpiracao  TIMESTAMP NOT NULL,
    CriadoEm       TIMESTAMP DEFAULT NOW()
);
```

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| Id | SERIAL | NO | auto | PK |
| UsuarioId | INT | YES | - | FK -> Usuarios (CASCADE) |
| Token | VARCHAR(255) | NO | - | Hash SHA-256 do token |
| DataExpiracao | TIMESTAMP | NO | - | Data de expiração |
| CriadoEm | TIMESTAMP | YES | NOW() | Timestamp de criação |

---

### 2.7 MesesFechados

```sql
CREATE TABLE IF NOT EXISTS MesesFechados (
    Id              SERIAL PRIMARY KEY,
    UsuarioId       INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
    Mes             INT NOT NULL,
    Ano             INT NOT NULL,
    DataFechamento  TIMESTAMP DEFAULT NOW(),
    UNIQUE(UsuarioId, Mes, Ano)
);
```

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| Id | SERIAL | NO | auto | PK |
| UsuarioId | INT | YES | - | FK -> Usuarios (CASCADE) |
| Mes | INT | NO | - | Mês trancado |
| Ano | INT | NO | - | Ano trancado |
| DataFechamento | TIMESTAMP | YES | NOW() | Quando foi trancado |

---

### 2.8 Lajeado

```sql
CREATE TABLE IF NOT EXISTS Lajeado (
    Id            SERIAL PRIMARY KEY,
    UsuarioId     INT UNIQUE REFERENCES Usuarios(Id) ON DELETE CASCADE,
    Dados         JSONB,
    Mural         TEXT,
    AtualizadoEm  TIMESTAMP DEFAULT NOW()
);
```

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| Id | SERIAL | NO | auto | PK |
| UsuarioId | INT | YES | - | FK -> Usuarios (UNIQUE, CASCADE) |
| Dados | JSONB | YES | - | Configuração visual do portal |
| Mural | TEXT | YES | - | Texto do mural público |
| AtualizadoEm | TIMESTAMP | YES | NOW() | Última atualização |

---

### 2.9 registros_luz

```sql
CREATE TABLE IF NOT EXISTS registros_luz (
    id               SERIAL PRIMARY KEY,
    usuario_id       INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
    mes_referencia   VARCHAR(50) NOT NULL,
    leitura_anterior NUMERIC(10, 2) NOT NULL,
    leitura_atual    NUMERIC(10, 2) NOT NULL,
    consumo_kwh      NUMERIC(10, 2) NOT NULL,
    valor_estimado   NUMERIC(10, 2) NOT NULL,
    data_registro    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | SERIAL | NO | auto | PK |
| usuario_id | INT | YES | - | FK -> Usuarios (CASCADE) |
| mes_referencia | VARCHAR(50) | NO | - | Mês de referência (ex: "2026-07") |
| leitura_anterior | NUMERIC(10,2) | NO | - | Leitura anterior (kWh) |
| leitura_atual | NUMERIC(10,2) | NO | - | Leitura atual (kWh) |
| consumo_kwh | NUMERIC(10,2) | NO | - | Consumo calculado |
| valor_estimado | NUMERIC(10,2) | NO | - | Valor estimado (R$) |
| data_registro | TIMESTAMP | YES | CURRENT_TIMESTAMP | Quando registrou |

---

### 2.10 terceiros

```sql
CREATE TABLE IF NOT EXISTS terceiros (
    id           SERIAL PRIMARY KEY,
    usuario_id   INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
    nome         VARCHAR(100) NOT NULL,
    telefone     VARCHAR(20),
    token_publico UUID DEFAULT gen_random_uuid() UNIQUE,
    UNIQUE(usuario_id, nome)
);
```

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | SERIAL | NO | auto | PK |
| usuario_id | INT | YES | - | FK -> Usuarios (CASCADE) |
| nome | VARCHAR(100) | NO | - | Nome do terceiro |
| telefone | VARCHAR(20) | YES | - | Telefone para WhatsApp |
| token_publico | UUID | YES | gen_random_uuid() | Token público para portal |

---

### 2.11 configuracoes

```sql
CREATE TABLE IF NOT EXISTS configuracoes (
    usuario_id          INT PRIMARY KEY REFERENCES Usuarios(Id) ON DELETE CASCADE,
    whatsapp_template   TEXT,
    privacidade_global  BOOLEAN DEFAULT FALSE,
    divisao_casa_minimo NUMERIC(10, 2) DEFAULT 750.00,
    regras_sync         JSONB DEFAULT '[]'::jsonb,
    onboarding_completed BOOLEAN DEFAULT FALSE
);
```

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| usuario_id | INT | NO | - | PK + FK -> Usuarios (CASCADE) |
| whatsapp_template | TEXT | YES | - | Template de mensagem WhatsApp |
| privacidade_global | BOOLEAN | YES | FALSE | Privacidade global (PC/Mobile) |
| divisao_casa_minimo | NUMERIC(10,2) | YES | 750.00 | Valor mínimo divisão casa |
| regras_sync | JSONB | YES | '[]'::jsonb | Regras de sincronização |
| onboarding_completed | BOOLEAN | YES | FALSE | Flag onboarding concluído |

---

<a id="indices"></a>
## 3. Índices

### Lancamentos

| Nome | Tipo | Colunas | Condição | Propósito |
|------|------|---------|----------|-----------|
| `idx_lancamentos_usuarioid` | B-Tree | UsuarioId | - | FK lookup |
| `idx_lancamentos_datavencimento` | B-Tree | DataVencimento | - | Range queries |
| `idx_lancamentos_tipo` | B-Tree | Tipo | - | Filtro por tipo |
| `idx_lancamentos_status` | B-Tree | Status | - | Filtro por status |
| `idx_lancamentos_datacriacao` | B-Tree | DataCriacao | - | Ordenação por criação |
| `idx_lancamentos_usuario_data` | Composite | UsuarioId, DataVencimento | - | Dashboard range |
| `idx_lancamentos_usuario_ordem` | Composite | UsuarioId, Ordem | - | Ordenação por usuário |
| `idx_lancamentos_usuario_datacriacao` | Composite | UsuarioId, DataCriacao DESC | - | Últimos lançamentos |
| `idx_lancamentos_tipo_usuario_data` | Composite | Tipo, UsuarioId, DataVencimento | - | Query por tipo+mês |
| `idx_lancamentos_trunc_data` | Functional | UsuarioId, date_trunc('second', DataCriacao) DESC | - | Dedup últimos lançamentos |
| `idx_lancamentos_usuario_data_sem_terceiro` | Partial | UsuarioId, DataVencimento | WHERE NomeTerceiro IS NULL | Contas próprias |
| `idx_lancamentos_usuario_terceiro_data` | Partial | UsuarioId, NomeTerceiro, DataVencimento | WHERE NomeTerceiro IS NOT NULL AND NomeTerceiro != '' | Contas de terceiros |

### TokensPersistentes

| Nome | Tipo | Colunas | Condição | Propósito |
|------|------|---------|----------|-----------|
| `idx_tokens_token` | UNIQUE | Token | - | Busca rápida por token |
| `idx_tokens_expires` | B-Tree | DataExpiracao | - | Limpeza de expirados |

### MesesFechados

| Nome | Tipo | Colunas | Condição | Propósito |
|------|------|---------|----------|-----------|
| `idx_mesesfechados_usuario_mes_ano` | Composite | UsuarioId, Mes, Ano | - | Lookup mês trancado |

### OrdemCards

| Nome | Tipo | Colunas | Condição | Propósito |
|------|------|---------|----------|-----------|
| `idx_ordemcards_usuario` | B-Tree | UsuarioId | - | Cards por usuário |

### FaturaManual

| Nome | Tipo | Colunas | Condição | Propósito |
|------|------|---------|----------|-----------|
| `uq_faturamanual_usuario_mes_ano` | UNIQUE | UsuarioId, Mes, Ano | - | 1 registro por mês/ano |

### Anotacoes

| Nome | Tipo | Colunas | Condição | Propósito |
|------|------|---------|----------|-----------|
| `uq_anotacoes_usuario_mes_ano` | UNIQUE | UsuarioId, Mes, Ano | - | 1 anotação por mês/ano |

### terceiros

| Nome | Tipo | Colunas | Condição | Propósito |
|------|------|---------|----------|-----------|
| (table constraint) | UNIQUE | usuario_id, nome | - | 1 registro por nome/usuário |
| (column constraint) | UNIQUE | token_publico | - | Token público único |

---

<a id="constraints"></a>
## 4. Constraints

### UNIQUE Constraints

| Tabela | Colunas | Propósito |
|--------|---------|-----------|
| Usuarios | Login | 1 conta por login |
| Anotacoes | UsuarioId, Mes, Ano | 1 anotação por período |
| FaturaManual | UsuarioId, Mes, Ano | 1 fatura manual por período |
| MesesFechados | UsuarioId, Mes, Ano | 1 lock por período |
| TokensPersistentes | Token | Token hash único |
| Lajeado | UsuarioId | 1 config portal por usuário |
| terceiros | usuario_id, nome | 1 contato por nome/usuário |
| terceiros | token_publico | UUID público único |
| configuracoes | usuario_id | 1 config por usuário (PK) |

### CHECK Constraints

Nenhuma constraint CHECK explícita definida no schema atual.

---

<a id="relacionamentos"></a>
## 5. Relacionamentos (Foreign Keys)

```
Usuarios (1) ──< Lancamentos (N)           ON DELETE (default: NO ACTION)
Usuarios (1) ──< Anotacoes (N)             ON DELETE (default: NO ACTION)
Usuarios (1) ──< OrdemCards (N)            ON DELETE (default: NO ACTION)
Usuarios (1) ──< FaturaManual (N)          ON DELETE (default: NO ACTION)
Usuarios (1) ──< TokensPersistentes (N)    ON DELETE CASCADE
Usuarios (1) ──< MesesFechados (N)         ON DELETE CASCADE
Usuarios (1) ─── Lajeado (1)               ON DELETE CASCADE
Usuarios (1) ──< registros_luz (N)         ON DELETE CASCADE
Usuarios (1) ──< terceiros (N)             ON DELETE CASCADE
Usuarios (1) ─── configuracoes (1)         ON DELETE CASCADE
```

**Legenda:**
- `──<` = relacionamento 1:N (um-para-muitos)
- `───` = relacionamento 1:1 (um-para-um)

---

<a id="migrations"></a>
## 6. Migrations (initDatabase.js)

O arquivo `src/helpers/initDatabase.js` executa as migrations no startup do servidor. Todas as operações usam `IF NOT EXISTS` / `IF NOT EXISTS` para serem idempotentes.

### Ordem de Execução

1. **Índices de performance** em Lancamentos (B-Tree simples)
2. **Índices compostos** em Lancamentos (usuario_data, usuario_ordem, usuario_datacriacao)
3. **Índice composto** para query por tipo (tipo_usuario_data)
4. **Índice funcional** para date_trunc em DataCriacao
5. **Normalização de dados legados**: `UPDATE Lancamentos SET NomeTerceiro = NULL WHERE NomeTerceiro = ''`
6. **Partial index** para contas próprias (NomeTerceiro IS NULL)
7. **Partial index** para contas de terceiros (NomeTerceiro IS NOT NULL)
8. **Índices auxiliares**: MesesFechados, OrdemCards
9. **CREATE TABLE** OrdemCards (se não existir)
10. **UNIQUE INDEX** FaturaManual (UsuarioId, Mes, Ano)
11. **UNIQUE INDEX** Anotacoes (UsuarioId, Mes, Ano)
12. **CREATE TABLE** TokensPersistentes + índices
13. **CREATE TABLE** MesesFechados
14. **CREATE TABLE** registros_luz
15. **CREATE TABLE** terceiros + coluna token_publico
16. **CREATE TABLE** configuracoes
17. **ALTER TABLE** configuracoes ADD COLUMN privacidade_global
18. **ALTER TABLE** configuracoes ADD COLUMN regras_sync
19. **ALTER TABLE** configuracoes ADD COLUMN divisao_casa_minimo
20. **ALTER TABLE** configuracoes ADD COLUMN onboarding_completed

---

## 7. Diagrama ER (Simplificado)

```
┌─────────────────┐
│    Usuarios     │
├─────────────────┤
│ Id (PK)         │
│ Nome            │
│ Login (UNIQUE)  │
│ SenhaHash       │
└────────┬────────┘
         │
         ├──────────────────────────────────────────────────────────┐
         │                    │                  │                  │
         ▼                    ▼                  ▼                  ▼
┌─────────────────┐  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐
│  Lancamentos    │  │  Anotacoes    │  │ OrdemCards   │  │FaturaManual  │
├─────────────────┤  ├───────────────┤  ├──────────────┤  ├──────────────┤
│ Id (PK)         │  │ Id (PK)       │  │ Id (PK)      │  │ Id (PK)      │
│ UsuarioId (FK)  │  │ UsuarioId(FK) │  │ UsuarioId    │  │ UsuarioId(FK)│
│ Descricao       │  │ Mes           │  │ Nome         │  │ Mes          │
│ Valor           │  │ Ano           │  │ Ordem        │  │ Ano          │
│ Tipo            │  │ Conteudo      │  └──────────────┘  │ Valor        │
│ Categoria       │  └───────────────┘                    └──────────────┘
│ Status          │
│ DataVencimento  │  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐
│ ParcelaAtual    │  │MesesFechados  │  │TokensPersist │  │   Lajeado    │
│ TotalParcelas   │  ├───────────────┤  ├──────────────┤  ├──────────────┤
│ NomeTerceiro    │  │ Id (PK)       │  │ Id (PK)      │  │ Id (PK)      │
│ Ordem           │  │ UsuarioId(FK) │  │ UsuarioId(FK)│  │ UsuarioId(FK)│
│ Conferido       │  │ Mes           │  │ Token (UNIQ) │  │ Dados (JSONB)│
│ DataCriacao     │  │ Ano           │  │ DataExpirac. │  │ Mural        │
│ ConferidoExtrato│  │ DataFecham.   │  │ CriadoEm     │  │ AtualizadoEm │
│ MesVencimento   │  └───────────────┘  └──────────────┘  └──────────────┘
│ AnoVencimento   │
└─────────────────┘  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐
                     │registros_luz  │  │  terceiros   │  │configuracoes │
                     ├───────────────┤  ├──────────────┤  ├──────────────┤
                     │ id (PK)       │  │ id (PK)      │  │ usuario_id   │
                     │ usuario_id(FK)│  │ usuario_id   │  │  (PK + FK)   │
                     │ mes_referencia│  │ nome         │  │whatsapp_tmpl │
                     │ leitura_ant.  │  │ telefone     │  │privacidade   │
                     │ leitura_atual │  │ token_publico│  │divisao_casa  │
                     │ consumo_kwh   │  │  (UUID,UNIQ) │  │regras_sync   │
                     │ valor_estimado│  └──────────────┘  │onboarding    │
                     │ data_registro │                    └──────────────┘
                     └───────────────┘
```

---

## 8. Tipos de Dados Utilizados

| Tipo PostgreSQL | Uso no Sistema |
|-----------------|----------------|
| SERIAL | PKs auto-incremento |
| INT | IDs, meses, anos, parcelas |
| VARCHAR(n) | Textos curtos (nomes, tipos, tokens) |
| TEXT | Textos longos (anotações, templates, mural) |
| DECIMAL(18,2) | Valores monetários (Lancamentos, FaturaManual) |
| NUMERIC(10,2) | Valores de energia (registros_luz), divisão casa |
| BOOLEAN | Flags (Conferido, Privacidade, Onboarding) |
| DATE | Data de vencimento |
| TIMESTAMP | Datas/horas (criação, expiração, fechamento) |
| JSONB | Dados estruturados (Lajeado, regras_sync) |
| UUID | Token público (terceiros) |

---

## 9. Fontes

Este documento foi gerado a partir de:

- `docs/history/database/schema_postgreSQL.sql` - Schema original
- `src/helpers/initDatabase.js` - Migrations executadas no startup
- `src/repositories/LancamentoRepository.js` - Queries e operações CRUD
- `src/repositories/MesFechadoRepository.js` - Controle de mês trancado
- `src/repositories/OrdemCardsRepository.js` - Ordenação de cards
- `src/repositories/ConfiguracaoRepository.js` - Configurações do usuário
- `src/repositories/UsuarioRepository.js` - Gestão de usuários
- `src/repositories/TokenRepository.js` - Tokens persistentes
- `src/repositories/AnotacaoRepository.js` - Anotações mensais/globais
- `src/routes/terceiros/terceirosRoutes.js` - Rotas e queries de terceiros
