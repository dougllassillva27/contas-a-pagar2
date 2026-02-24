# 💸 Gestão Financeira Pessoal (Cloud Edition)

Sistema web robusto e acessível de qualquer lugar para controle de
contas a pagar, gestão de cartão de crédito e organização financeira
familiar.

Migrado para a nuvem utilizando **PostgreSQL**, com deploy em **Render**
e banco hospedado no **Neon**, permitindo acesso via celular ou desktop
de qualquer lugar, mantendo privacidade e performance.

---

## 📖 Sobre o Projeto

Este projeto nasceu para substituir planilhas complexas por uma
interface visual, intuitiva e focada em **Contas a Pagar**.

Permite:

- Controle financeiro pessoal mensal
- Separação de gastos de terceiros (familiares que utilizam o mesmo
  cartão)
- Organização por prioridade (ordem customizável)
- Comparação de fatura real vs sistema

Originalmente desenvolvido em SQL Server local, foi modernizado para
PostgreSQL e arquitetura cloud.

---

## 🚀 Funcionalidades Principais

### 📊 Dashboard & Controle

- **Visão Geral**
  - Total de Rendas (com modo privacidade 👁️)
  - Total de Contas
  - Falta Pagar
  - Saldo Previsto
- **Contas Fixas**
  - Água
  - Luz
  - Internet
  - Outras recorrentes
- **Cartão de Crédito**
  - Controle com parcelamento (`01/10`)
  - Controle por mês
  - Separação por pessoa
- **Bloco de Notas**
  - Persistente por usuário

---

### 👥 Gestão de Terceiros

- Painéis individuais automáticos (ex: Mãe, Vô, Casa)
- Totalizador mensal por pessoa
- Separação clara de responsabilidade financeira
- Organização visual independente

---

### ✨ UX/UI (Experiência do Usuário)

- **Menu de Contexto Híbrido**
  - Desktop: Botão direito
  - Mobile: Double Tap

- **Drag & Drop**
  - Reordenação de prioridade

- **Modais Responsivos**
  - Edição sem reload

- **Toggle de Status via AJAX**
  - Alternar Pago/Pendente sem recarregar a página

- **Dark Mode**

- **Mobile First**
  - Otimizado para smartphones (ex: Galaxy S23)
  - Bloqueio de seleção acidental de texto

- **Impressão A4**
  - CSS print
  - Ideal para gerar PDF de cobrança

---

### 🤖 Bot do Telegram

- **Lançamentos via chat** — registre contas direto pelo Telegram
- **Conversa interativa** — o bot pergunta campo por campo
- **Botões inline** — selecione usuário e tipo com um toque
- **Lógica condicional** — parcelas só aparece se tipo = Parcelada
- **Segurança** — restrito ao seu Chat ID
- **Compatível com Render free** — usa webhook (sem conexão persistente)
- Documentação completa em [`botTelegram/README.md`](botTelegram/README.md)

---

### ⚙️ Ferramentas Avançadas

- **Copiar Mês**
  - Replica contas fixas
  - Replica parcelas pendentes
- **Backup JSON**
  - Exportação manual de segurança
- **Fatura Manual**
  - Campo para comparar valor calculado vs valor do app do banco
- **Health Check** (`/health`)
  - Endpoint para monitoramento de uptime (Render, UptimeRobot)

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia       | Detalhes                        |
| ---------------- | ------------------------------- |
| **Runtime**      | Node.js v18+                    |
| **Framework**    | Express 5.x                     |
| **Database**     | PostgreSQL (Neon.tech)          |
| **Hospedagem**   | Render.com (Plano Gratuito)     |
| **Frontend**     | EJS + CSS3 (Grid + Vars)        |
| **Driver DB**    | pg (node-postgres)              |
| **Autenticação** | bcryptjs + express-session      |
| **Bot Telegram** | node-telegram-bot-api (webhook) |
| **Testes**       | Jest 30 + Supertest 7           |

---

## 🧪 Testes Automatizados

O projeto possui **77 testes** distribuídos em **6 suítes**, abrangendo
testes unitários e de integração:

```
__tests__/
├── helpers/
│   └── parseHelpers.test.js          # Parsing de valores e parcelas
├── middlewares/
│   └── auth.test.js                  # Autenticação web e API (token)
├── repositories/
│   ├── LancamentoRepository.test.js  # CRUD de lançamentos (mock)
│   └── UsuarioRepository.test.js     # Login e gestão de usuários (mock)
├── botTelegram/
│   ├── messageParser.test.js         # Conversation Manager (fluxo + etapas)
│   └── responseFormatter.test.js     # Formatação de respostas do bot
└── integration/
    └── api.test.js                   # Fluxo completo via Supertest
```

**Scripts disponíveis:**

```bash
# Rodar todos os testes
npm test

# Apenas testes unitários (helpers + middlewares)
npm run test:unit

# Apenas testes de integração
npm run test:integration
```

---

## 📝 Pré-requisitos

- Node.js v18+
- Git
- Conta GitHub
- Conta Neon (PostgreSQL)
- Conta Render

---

## 🚀 Instalação e Configuração Local

### 1️⃣ Clonar

```bash
git clone https://github.com/dougllassillva27/contas-a-pagar2.git
cd contas-a-pagar2
```

### 2️⃣ Instalar Dependências

```bash
npm install
```

### 3️⃣ Criar Banco de Dados

Execute o script SQL:

```sql
CREATE TABLE Usuarios (
    Id SERIAL PRIMARY KEY,
    Nome VARCHAR(50),
    Login VARCHAR(50),
    SenhaHash VARCHAR(255)
);

CREATE TABLE Lancamentos (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT,
    Descricao VARCHAR(255),
    Valor DECIMAL(18,2),
    Tipo VARCHAR(20),
    Categoria VARCHAR(50),
    Status VARCHAR(20),
    DataVencimento DATE,
    ParcelaAtual INT,
    TotalParcelas INT,
    NomeTerceiro VARCHAR(100),
    Ordem INT
);

CREATE TABLE Anotacoes (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT,
    Conteudo TEXT
);

CREATE TABLE OrdemCards (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT,
    Nome VARCHAR(255),
    Ordem INT
);

CREATE TABLE FaturaManual (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT,
    Mes INT,
    Ano INT,
    Valor DECIMAL(18,2)
);

INSERT INTO Usuarios (Nome, Login, SenhaHash)
VALUES ('Admin', 'admin', 'HASH_DA_SENHA');
```

---

### 4️⃣ Variáveis de Ambiente

Crie `.env`:

```env
DATABASE_URL=postgres://usuario:senha@endpoint-neon.tech/neondb?sslmode=require
PORT=3000
SESSION_SECRET=seu_segredo_aqui
SENHA_MESTRA=sua_senha_aqui
API_TOKEN=seu_token_api
NODE_VERSION=18

# Bot Telegram (opcional — ver botTelegram/README.md)
TELEGRAM_BOT_TOKEN=token_do_botfather
TELEGRAM_CHAT_ID=seu_chat_id
TELEGRAM_WEBHOOK_SECRET=string_aleatoria
RENDER_EXTERNAL_URL=https://seu-app.onrender.com
```

> ⚠️ **Segurança:** em produção, defina valores fortes para
> `SESSION_SECRET`, `SENHA_MESTRA` e `API_TOKEN`. Os fallbacks
> de desenvolvimento existem apenas para conveniência local.

---

### 5️⃣ Rodar

```bash
npm start
```

Acesse: http://localhost:3000

---

## ☁️ Deploy (Render + Neon)

### GitHub

Suba o repositório.

### Neon

- Criar projeto
- Copiar connection string
- Executar script SQL

### Render

- New Web Service
- Build Command: `npm install`
- Start Command: `node src/app.js`
- Variáveis:
  - `DATABASE_URL`
  - `NODE_VERSION`
  - `SESSION_SECRET`
  - `SENHA_MESTRA`
  - `API_TOKEN`
  - `TELEGRAM_BOT_TOKEN` (opcional)
  - `TELEGRAM_CHAT_ID` (opcional)
  - `TELEGRAM_WEBHOOK_SECRET` (opcional)
  - `RENDER_EXTERNAL_URL` (opcional)

> Após o deploy com Telegram, execute: `npm run telegram:setup`

---

## 🏗️ Arquitetura

O projeto segue uma arquitetura **modular** com separação clara de responsabilidades:

| Camada          | Diretório           | Responsabilidade                                       |
| --------------- | ------------------- | ------------------------------------------------------ |
| **Entrada**     | `src/app.js`        | Configuração do Express, sessão e montagem dos módulos |
| **Rotas**       | `src/routes/`       | Handlers de cada grupo de endpoints                    |
| **Middlewares** | `src/middlewares/`  | Autenticação web (sessão), API (token) e logger        |
| **Helpers**     | `src/helpers/`      | Parsing, async handler e inicialização do banco        |
| **Dados**       | `src/repositories/` | Repositories especializados por domínio + facade       |
| **Constantes**  | `src/constants.js`  | Valores centralizados (status, tipos, limites)         |
| **Conexão**     | `src/config/`       | Pool de conexão PostgreSQL                             |
| **Bot**         | `botTelegram/`      | Bot Telegram com conversa interativa (webhook)         |
| **Views**       | `src/views/`        | Templates EJS com partials reutilizáveis               |
| **Frontend**    | `public/`           | CSS, JavaScript do cliente e assets estáticos          |
| **Testes**      | `__tests__/`        | Unitários, repositórios (mock), bot e integração       |

---

## 📂 Estrutura do Projeto

```
/
├── public/
│   ├── css/style.css                       # Design system (dark mode)
│   ├── js/app.js                           # JavaScript do dashboard
│   └── favicon.ico
├── src/
│   ├── app.js                              # Ponto de entrada (~92 linhas)
│   ├── constants.js                        # STATUS, TIPO, LIMITES centralizados
│   ├── config/
│   │   └── db.js                           # Pool PostgreSQL
│   ├── helpers/
│   │   ├── asyncHandler.js                 # Wrapper try/catch para rotas async
│   │   ├── initDatabase.js                 # Criação automática de tabelas
│   │   └── parseHelpers.js                 # parseValor, parcelas, etc.
│   ├── middlewares/
│   │   ├── auth.js                         # authMiddleware + createApiAuth
│   │   └── logger.js                       # Request logger estruturado
│   ├── repositories/
│   │   ├── FinanceiroRepository.js         # Facade (re-exporta todos abaixo)
│   │   ├── UsuarioRepository.js            # Login, busca de usuários
│   │   ├── LancamentoRepository.js         # CRUD de lançamentos
│   │   ├── AnotacaoRepository.js           # Bloco de notas
│   │   ├── FaturaManualRepository.js       # Fatura manual (UPSERT)
│   │   ├── OrdemCardsRepository.js         # Ordem dos cards do dashboard
│   │   └── BackupRepository.js             # Exportação JSON completa
│   ├── routes/
│   │   ├── publicRoutes.js                 # Login / Logout
│   │   ├── integrationRoutes.js            # API Android
│   │   └── apiRoutes.js                    # Dashboard + CRUD + APIs
│   └── views/
│       ├── index.ejs                       # Dashboard principal
│       ├── login.ejs                       # Tela de login
│       ├── relatorio.ejs                   # Extrato para impressão
│       └── partials/
│           ├── head.ejs                    # Meta tags, CSS, fonts
│           ├── header.ejs                  # Barra superior + navegação
│           └── modals.ejs                  # Todos os modais
├── botTelegram/
│   ├── conversationManager.js              # Máquina de estados da conversa
│   ├── messageParser.js                    # Parser formato linha única (legado)
│   ├── responseFormatter.js                # Formatação de respostas do bot
│   ├── telegramBot.js                      # Lógica principal do bot
│   ├── telegramRoutes.js                   # Rota webhook Express
│   ├── setupWebhook.js                     # Script de configuração
│   └── README.md                           # Documentação do bot
├── __tests__/
│   ├── helpers/parseHelpers.test.js        # Testes de parsing
│   ├── middlewares/auth.test.js            # Testes de autenticação
│   ├── repositories/
│   │   ├── LancamentoRepository.test.js    # Testes CRUD (mock do DB)
│   │   └── UsuarioRepository.test.js       # Testes de usuário (mock do DB)
│   ├── botTelegram/
│   │   ├── messageParser.test.js           # Testes do Conversation Manager
│   │   └── responseFormatter.test.js       # Testes do formatador
│   └── integration/api.test.js             # Testes de API (Supertest)
├── schema_postgreSQL.sql                   # Schema do banco
├── jest.config.js                          # Configuração do Jest
├── .gitignore
├── package.json
└── README.md
```

---

## 🔒 Segurança

- **Senhas** hashadas com `bcryptjs` (nunca armazenadas em texto puro)
- **Proteção contra brute-force** — delay configurável em tentativas de login
- **Autenticação de sessão** para rotas web (`express-session`)
- **Autenticação por token** para API Android (`API_TOKEN`)
- **Bot restrito por Chat ID** — Telegram aceita apenas mensagens do dono
- **Webhook com secret** — URL protegida contra payloads falsos
- **Constantes centralizadas** — sem magic strings espalhadas pelo código
- **Async error handling** — wrapper `asyncHandler` captura exceções em rotas

---

## 💡 Dicas de Uso

- Use o modo privacidade para esconder valores
- Double Tap no mobile para ações rápidas
- Use "Imprimir" para gerar PDF
- Plano free pode hibernar — basta relogar
- Monitore o uptime via endpoint `/health`

---

## 🎯 Objetivos do Projeto

- Simplicidade operacional
- Performance
- Organização visual
- Independência geográfica
- Código limpo e manutenível
- Cobertura de testes automatizados

---

## 📄 Licença

ISC — Veja [LICENSE](LICENSE) para detalhes.

---

Desenvolvido com foco em Clean Code, Performance e Liberdade Geográfica.
💸
