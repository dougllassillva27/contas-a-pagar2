# Deployment Guide

> Guia completo de instalacao, configuracao e deploy do sistema de gestao financeira.

---

## 1. Requisitos do Sistema

### Dependencias obrigatorias

| Dependencia | Versao minima | Funcao |
|-------------|---------------|--------|
| Node.js | >= 18.0.0 | Runtime da aplicacao |
| PostgreSQL | 14+ | Banco de dados (Neon recomendado) |
| npm | >= 8.x | Gerenciador de pacotes |
| Git | Qualquer | Controle de versao |

### Dependencias opcionais

| Dependencia | Funcao |
|-------------|--------|
| Python | >= 3.10 — Linting (Ruff) e testes Python |
| Telegram Bot | Notificacoes via bot (configuravel) |

---

## 2. Variaveis de Ambiente

Copie `.env.example` para `.env` e preencha os valores reais:

```bash
cp .env.example .env
```

### Variaveis obrigatorias

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | String de conexao PostgreSQL (Neon) | `postgresql://user:pass@host.aws.neon.tech/neondb?sslmode=require` |
| `SENHA_MESTRA` | Senha principal de acesso ao sistema | `sua_senha_forte_aqui` |
| `SENHA_VITORIA` | Senha secundaria de acesso | `senha_secundaria` |
| `API_TOKEN` | Token para integracoes externas (API) | `token_diferente_da_senha_mestra` |
| `SESSION_SECRET` | Segredo da sessao Express (min. 32 caracteres) | `string_aleatoria_32+_chars` |

### Variaveis opcionais

| Variavel | Descricao | Padrao |
|----------|-----------|--------|
| `PORT` | Porta do servidor HTTP | `3000` |
| `NODE_ENV` | Ambiente (`production`, `development`, `test`) | `development` |
| `NODE_VERSION` | Versao do Node para deploy (Render) | `18` |
| `TELEGRAM_BOT_TOKEN` | Token do bot Telegram (obtido via @BotFather) | — |
| `TELEGRAM_CHAT_ID` | Chat ID para notificacoes | — |
| `TELEGRAM_WEBHOOK_SECRET` | Segredo para proteger URL do webhook | — |
| `RENDER_EXTERNAL_URL` | URL publica da aplicacao (ex: Render) | — |
| `DEBUG_PERF` | Ativa logs de performance do banco (`true`/`1`) | desativado em prod |

### Regras de seguranca

- `SESSION_SECRET` e `API_TOKEN` sao **obrigatorios** em producao. A aplicacao encerra se ausentes com `NODE_ENV=production`.
- `API_TOKEN` **nunca** deve ser igual a `SESSION_SECRET`. O sistema emite aviso se forem identicos.
- **Nunca** commite o arquivo `.env` real no repositorio.

---

## 3. Setup de Desenvolvimento

### 3.1 Clone e instalacao

```bash
git clone <repo-url>
cd contas-a-pagar

# Instalar dependencias Node
npm install

# (Opcional) Setup Python para linting
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
```

### 3.2 Ativar hooks do Git

```bash
# Windows
.\setup.ps1

# Linux/macOS
bash setup.sh
```

Isso configura `.githooks` como diretorio de hooks do Git.

### 3.3 Configurar banco de dados

1. Crie um banco PostgreSQL (Neon recomendado para cloud).
2. Copie a string de conexao para `DATABASE_URL` no `.env`.
3. O banco e inicializado automaticamente na primeira execucao via `initDatabase`.

### 3.4 Rodar em desenvolvimento

```bash
npm run dev
```

Inicia com `nodemon` e timezone `America/Sao_Paulo`. Servidor disponivel em `http://localhost:3000`.

### 3.5 Rodar testes

```bash
# Suite completa
npm test

# Com coverage
npm run test:coverage

# Apenas testes unitarios (helpers + middlewares)
npm run test:unit

# Apenas testes de integracao
npm run test:integration
```

Thresholds de cobertura (Jest):

| Metrica | Minimo |
|---------|--------|
| Branches | 70% |
| Functions | 75% |
| Lines | 80% |
| Statements | 80% |

### 3.6 Linting e formatacao

```bash
# JavaScript
npx prettier --write .
npx eslint .

# Python
ruff check .
ruff format .
```

---

## 4. Setup de Producao

### 4.1 Build (cache busting)

```bash
npm run build
```

Executa `versionamento/versionador.js` que calcula Content Hash (MD5) e injeta versionamento em arquivos estaticos (`.ejs`, `.html`, `.css`, `.js`, `.py`, `.json`). Requer `NODE_ENV=production`.

### 4.2 Iniciar servidor

```bash
npm start
```

Equivalente a `node src/app.js`. Usa a porta definida em `PORT` ou `3000`.

### 4.3 Deploy com Docker / VPS (Recomendado)

O projeto conta com suporte oficial a Docker com multi-stage build e Docker Compose:

1. Clone o repositório na VPS:
   ```bash
   git clone <repo-url>
   cd contas-a-pagar
   ```
2. Crie e configure o arquivo `.env` com suas variáveis de produção:
   ```bash
   cp .env.example .env
   nano .env
   ```
3. Inicie os containers com Docker Compose:
   ```bash
   docker compose up -d --build
   ```
4. Configure o webhook do Telegram (se habilitado):
   ```bash
   docker compose exec app npm run telegram:setup
   ```

### 4.4 Deploy no Render (Legado)

1. Conecte o repositorio Git ao Render.
2. Defina as variaveis de ambiente no painel do Render (todas listadas na secao 2).
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. `NODE_VERSION=18` ou superior deve estar definido nas variaveis de ambiente.

### 4.5 Configuracao do pool de conexoes

O pool PostgreSQL e configurado para cenarios de producao com limitacoes de conexao (Neon):

| Parametro | Valor |
|-----------|-------|
| `max` | 10 conexoes |
| `min` | 2 conexoes |
| `idleTimeoutMillis` | 5000ms |
| `connectionTimeoutMillis` | 10000ms |
| `keepAlive` | true (10s initial delay) |
| `ssl` | `{ rejectUnauthorized: false }` em producao |

Health check automatico detecta conexoes stale e faz retry (max 1 tentativa, 500ms delay).

### 4.5 Setup do Telegram Bot (producao)

```bash
npm run telegram:setup
```

Executa `src/modules/botTelegram/setupWebhook.js` que registra o webhook no Telegram apontando para `RENDER_EXTERNAL_URL`.

---

## 5. Scripts Disponiveis

| Script | Comando | Descricao |
|--------|---------|-----------|
| `npm start` | `node src/app.js` | Inicia servidor em producao |
| `npm run dev` | `nodemon src/app.js` (TZ=America/Sao_Paulo) | Servidor de desenvolvimento com hot reload |
| `npm run build` | `node versionamento/versionador.js` | Cache busting em arquivos estaticos |
| `npm test` | `jest --verbose` | Suite completa de testes |
| `npm run test:coverage` | `jest --coverage` | Testes com relatorio de cobertura |
| `npm run test:unit` | `jest __tests__/helpers __tests__/middlewares` | Testes unitarios |
| `npm run test:integration` | `jest __tests__/integration` | Testes de integracao |
| `npm run telegram:setup` | `node src/modules/botTelegram/setupWebhook.js` | Configura webhook do Telegram |
| `npm run build:widget` | `cd src/modules/widgetLancamentos && npm install && npm run build` | Build do widget de lancamentos |

### Scripts auxiliares (diretorio `scripts/`)

| Script | Descricao |
|--------|-----------|
| `scripts/apply-migration.js` | Aplica migracoes de banco de dados |
| `scripts/check-index.js` | Verifica indices do banco de dados |

---

## 6. Dependencias

### Producao (dependencies)

| Pacote | Versao | Funcao |
|--------|--------|--------|
| `express` | ^5.2.1 | Framework HTTP |
| `pg` | ^8.18.0 | Driver PostgreSQL |
| `ejs` | ^4.0.1 | Template engine |
| `bcrypt` | ^5.1.1 | Hash de senhas |
| `helmet` | ^7.1.0 | Seguranca HTTP headers |
| `compression` | ^1.8.1 | Compressao gzip |
| `express-session` | ^1.19.0 | Gerenciamento de sessao |
| `cookie-parser` | ^1.4.7 | Parser de cookies |
| `express-rate-limit` | ^7.5.0 | Rate limiting |
| `dotenv` | ^17.2.4 | Carregamento de variaveis de ambiente |
| `node-telegram-bot-api` | ^0.66.0 | Integracao Telegram Bot |

### Desenvolvimento (devDependencies)

| Pacote | Versao | Funcao |
|--------|--------|--------|
| `jest` | ^30.2.0 | Framework de testes |
| `jest-environment-jsdom` | ^30.3.0 | Ambiente DOM para testes |
| `nodemon` | ^3.1.0 | Hot reload em desenvolvimento |
| `supertest` | ^7.2.2 | Testes de HTTP |
| `cross-env` | ^10.1.0 | Variaveis de ambiente cross-platform |

### Python (requirements.txt)

| Pacote | Versao | Funcao |
|--------|--------|--------|
| `ruff` | >= 0.3.0 | Linter e formatador Python |
| `mypy` | >= 1.9.0 | Type checker Python |
| `pytest` | >= 8.0.0 | Framework de testes Python |

---

## 7. Estrutura do Projeto

```
contas-a-pagar/
├── src/
│   ├── app.js                  # Entry point
│   ├── config/                 # Configuracoes (db.js, db_dump.js)
│   ├── helpers/                # Funcoes auxiliares (initDatabase, etc.)
│   ├── middlewares/            # Auth, logger, rate limiter
│   ├── modules/                # Modulos de dominio
│   │   ├── botTelegram/        # Integracao Telegram
│   │   ├── calcularLuz/        # Calculo de energia
│   │   ├── dataHora/           # Utilidades de data/hora
│   │   └── widgetLancamentos/  # Widget frontend (Electron)
│   ├── repositories/           # Camada de dados
│   ├── routes/                 # Rotas HTTP
│   ├── scripts/                # Scripts auxiliares
│   ├── services/               # Logica de negocio
│   └── views/                  # Templates EJS
├── public/                     # Arquivos estaticos
├── scripts/                    # Migracoes e utilitarios
├── versionamento/              # Cache busting (versionador.js)
├── __tests__/                  # Testes
├── .env.example                # Template de variaveis
├── package.json                # Dependencias Node
├── requirements.txt            # Dependencias Python
├── setup.ps1 / setup.sh        # Scripts de setup inicial
└── docs/                       # Documentacao
```

---

## 8. Troubleshooting

| Problema | Causa | Solucao |
|----------|-------|---------|
| `SESSION_SECRET e API_TOKEN obrigatorios` | `NODE_ENV=production` sem variaveis | Defina `SESSION_SECRET` e `API_TOKEN` no `.env` |
| `DATABASE_URL nao encontrada` | `.env` nao configurado | Copie `.env.example` para `.env` e preencha |
| Conexao stale com Neon | Pool reutiliza conexao morta | Health check automatico com retry ja implementado em `db.js` |
| Webhook Telegram nao funciona | URL publica invalida | Verifique `RENDER_EXTERNAL_URL` e rode `npm run telegram:setup` |
| Cache busting nao executa | `NODE_ENV` diferente de `production` | Execute `npm run build` com `NODE_ENV=production` |
