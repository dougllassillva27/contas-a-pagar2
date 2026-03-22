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

### 🌐 Portal de Terceiros (Acesso Público)

- **URL direta por pessoa** — cada terceiro acessa suas contas via
  link próprio (ex: `/contas/Mae`)
- **Sem necessidade de login** — acesso público e read-only
- **Contas Fixas e Cartão** — exibe ambos os tipos com totais
  separados e total geral do mês
- **Navegação entre meses** — botões Anterior / Próximo para
  consultar histórico
- **Compartilhar link** — no dashboard admin, clique direito no
  nome do terceiro → "Compartilhar link" copia a URL para o
  clipboard
- **SEO protegido** — meta tags `noindex, nofollow` impedem
  indexação por buscadores
- **Design consistente** — mesma identidade visual dark mode do
  sistema principal
- **Mobile-first** — totalmente responsivo

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
- **Health Check Profissional** (`/health`)
  - Verifica aplicação + banco
  - Mede latência da checagem
  - Retorna uptime do processo
  - Compatível com monitoramento, keep-alive e diagnóstico rápido
- **Keep Alive Inteligente via GitHub Actions**
  - Mantém o serviço ativo no Render free durante a janela configurada
  - Scheduler com tolerância a atraso do GitHub Actions
  - Logs formatados para leitura rápida

---

## 🩺 Monitoramento e Keep Alive

Como o plano gratuito do **Render** pode colocar a aplicação em sleep
após inatividade, o projeto pode usar um fluxo de keep-alive com
**GitHub Actions** para reduzir cold starts durante o período de uso.

### Estratégia adotada

- O workflow do GitHub Actions roda em intervalo curto
- O script Node decide se deve fazer ping ou ignorar a execução
- A janela padrão considera horário de **Brasília**
- O endpoint chamado é:

```txt
/health
```

### Vantagens dessa abordagem

- Não depende de navegador aberto
- Não depende de extensão do Chrome
- Mais robusta que um cron rígido
- Permite tolerância a pequenos atrasos do scheduler do GitHub
- Gera logs claros para troubleshooting

### Exemplo de comportamento do scheduler inteligente

- Janela de funcionamento: `08:00` até `23:59`
- Minutos base: `1,13,25,37,49`
- Tolerância opcional: `+1 minuto`

Exemplo:

- Minuto `13` → executa
- Minuto `14` → executa também, se tolerância estiver ativa
- Minuto `15` → ignora

---

## 🔍 Endpoint `/health`

O projeto possui um endpoint de health check pensado para:

- Monitoramento de uptime
- Keep-alive no Render
- Diagnóstico rápido da aplicação
- Verificação de conectividade com o banco Neon

### Exemplo de resposta saudável

```json
{
  "service": "contas-a-pagar",
  "status": "ok",
  "app": "online",
  "db": "online",
  "latency_ms": 32,
  "uptime": "0d 3h 15m 12s",
  "timestamp": "2026-03-10T23:05:00.000Z"
}
```

### Exemplo de resposta com falha no banco

```json
{
  "service": "contas-a-pagar",
  "status": "error",
  "app": "online",
  "db": "offline",
  "latency_ms": 1204,
  "uptime": "0d 3h 15m 12s",
  "timestamp": "2026-03-10T23:05:00.000Z"
}
```

### O que esse endpoint informa

- **service** → identifica o sistema
- **status** → resultado geral do health check
- **app** → se a aplicação respondeu
- **db** → se o banco respondeu
- **latency_ms** → tempo da checagem
- **uptime** → tempo de vida do processo Node
- **timestamp** → data/hora da resposta

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
| **Automação**    | GitHub Actions                  |

---

## 🧪 Testes Automatizados

O projeto possui **83 testes** distribuídos em **6 suítes**, abrangendo
testes unitários e de integração:

```txt
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

## 🔁 Keep Alive com GitHub Actions

O projeto pode utilizar um workflow dedicado para reduzir sleep no
Render free durante o período de uso.

### Estrutura esperada

```txt
.github/
└── workflows/
    └── keep-render-awake.yml

scripts/
└── ping-render.mjs
```

### Variável necessária no GitHub

Crie em:

```txt
Settings > Secrets and variables > Actions > Variables
```

Variável:

```txt
KEEP_ALIVE_URL=https://seu-app.onrender.com/health
```

### Funcionamento

- O workflow roda em intervalo curto
- O script avalia o horário local
- Só faz ping dentro da janela configurada
- Fora da janela, encerra sem erro

### Configurações principais do script

- **TZ_APP** → timezone da aplicação
- **JANELA_HORA_INICIO** → hora inicial
- **JANELA_HORA_FIM** → hora final
- **MINUTOS_PERMITIDOS** → grade principal dos minutos
- **TOLERANCIA_MINUTOS_ATRASO** → tolerância a atraso do scheduler
- **MAX_TENTATIVAS** → quantidade de retries
- **TIMEOUT_MS** → timeout por tentativa
- **ESPERA_ENTRE_TENTATIVAS_MS** → intervalo entre retries

### Exemplo de logs

```txt
====================================================
🧠 KEEP ALIVE INTELIGENTE
====================================================
🌎 Timezone: America/Sao_Paulo
🕒 Agora local: 10/03/2026 22:14:03
📅 Janela permitida: 8:00 até 23:59
⏲ Minutos base: 1, 13, 25, 37, 49
🛟 Tolerância de atraso: 1 minuto(s)
✅ Minutos aceitos: 1, 2, 13, 14, 25, 26, 37, 38, 49, 50
✅ Dentro da janela? sim
✅ Minuto aceito? sim
====================================================

====================================================
🚀 RENDER KEEP ALIVE
====================================================
🔁 Tentativa: 1/3
🌐 URL: https://seu-app.onrender.com/health
📡 Status HTTP: 200
⏱ Latência: 143 ms
🕒 Executado em UTC: 2026-03-11T01:13:02.000Z
📦 Resposta:
{"service":"contas-a-pagar","status":"ok","app":"online","db":"online","latency_ms":34,"uptime":"0d 1h 12m 4s","timestamp":"..."}
====================================================

✅ SUCESSO: Keep alive executado com sucesso.
```

### Observação importante

O scheduler do GitHub Actions pode ter pequeno atraso em horários de
maior carga. Por isso o projeto usa um modelo de scheduler inteligente,
com janela horária e tolerância opcional de atraso.

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
| **Automação**   | `.github/`          | Workflows do GitHub Actions                            |
| **Scripts**     | `scripts/`          | Scripts auxiliares, incluindo keep-alive               |

---

## 📂 Estrutura do Projeto

```txt
/
├── .github/
│   └── workflows/
│       └── keep-render-awake.yml          # Keep alive inteligente via GitHub Actions
├── public/
│   ├── css/
│   │   ├── style.css                      # Design system (dark mode)
│   │   └── terceiro.css                   # Estilos do Portal de Terceiros
│   ├── js/app.js                          # JavaScript do dashboard
│   └── favicon.ico
├── scripts/
│   └── ping-render.mjs                    # Ping inteligente do Render /health
├── src/
│   ├── app.js                             # Ponto de entrada
│   ├── constants.js                       # STATUS, TIPO, LIMITES centralizados
│   ├── config/
│   │   └── db.js                          # Pool PostgreSQL
│   ├── helpers/
│   │   ├── asyncHandler.js                # Wrapper try/catch para rotas async
│   │   ├── initDatabase.js                # Criação automática de tabelas
│   │   └── parseHelpers.js                # parseValor, parcelas, etc.
│   ├── middlewares/
│   │   ├── auth.js                        # authMiddleware + createApiAuth
│   │   └── logger.js                      # Request logger estruturado
│   ├── repositories/
│   │   ├── FinanceiroRepository.js        # Facade (re-exporta todos abaixo)
│   │   ├── UsuarioRepository.js           # Login, busca de usuários
│   │   ├── LancamentoRepository.js        # CRUD de lançamentos + portal
│   │   ├── AnotacaoRepository.js          # Bloco de notas
│   │   ├── FaturaManualRepository.js      # Fatura manual (UPSERT)
│   │   ├── OrdemCardsRepository.js        # Ordem dos cards do dashboard
│   │   └── BackupRepository.js            # Exportação JSON completa
│   ├── routes/
│   │   ├── publicRoutes.js                # Login / Logout / Portal de Terceiros
│   │   ├── integrationRoutes.js           # API Android
│   │   └── apiRoutes.js                   # Dashboard + CRUD + APIs
│   └── views/
│       ├── index.ejs                      # Dashboard principal
│       ├── login.ejs                      # Tela de login
│       ├── terceiro.ejs                   # Portal público de terceiros
│       ├── relatorio.ejs                  # Extrato para impressão
│       └── partials/
│           ├── head.ejs                   # Meta tags, CSS, fonts
│           ├── header.ejs                 # Barra superior + navegação
│           └── modals.ejs                 # Modais + menu de contexto
├── botTelegram/
│   ├── conversationManager.js             # Máquina de estados da conversa
│   ├── messageParser.js                   # Parser formato linha única (legado)
│   ├── responseFormatter.js               # Formatação de respostas do bot
│   ├── telegramBot.js                     # Lógica principal do bot
│   ├── telegramRoutes.js                  # Rota webhook Express
│   ├── setupWebhook.js                    # Script de configuração
│   └── README.md                          # Documentação do bot
├── __tests__/
│   ├── helpers/parseHelpers.test.js       # Testes de parsing
│   ├── middlewares/auth.test.js           # Testes de autenticação
│   ├── repositories/
│   │   ├── LancamentoRepository.test.js   # Testes CRUD (mock do DB)
│   │   └── UsuarioRepository.test.js      # Testes de usuário (mock do DB)
│   ├── botTelegram/
│   │   ├── messageParser.test.js          # Testes do Conversation Manager
│   │   └── responseFormatter.test.js      # Testes do formatador
│   └── integration/api.test.js            # Testes de API (Supertest)
├── schema_postgreSQL.sql                  # Schema do banco
├── jest.config.js                         # Configuração do Jest
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
- **Health check sem exposição sensível** — não retorna stack trace nem dados internos do banco

---

## 💡 Dicas de Uso

- Use o modo privacidade para esconder valores
- Double Tap no mobile para ações rápidas
- Use "Imprimir" para gerar PDF
- No Render free, o sistema pode hibernar fora da janela de keep-alive
- Monitore a saúde da aplicação via endpoint `/health`
- Consulte os logs do GitHub Actions para entender se o ping foi executado ou ignorado
- **Portal de Terceiros**: envie o link `/contas/NomeDaPessoa` para que
  terceiros acompanhem suas contas diretamente, sem precisar de prints

---

## 🎯 Objetivos do Projeto

- Simplicidade operacional
- Performance
- Organização visual
- Independência geográfica
- Código limpo e manutenível
- Cobertura de testes automatizados
- Boa observabilidade em ambiente cloud
- Baixo custo operacional no plano gratuito

---

## 📄 Licença

ISC — Veja [LICENSE](LICENSE) para detalhes.

---

Desenvolvido com foco em Clean Code, Performance, Observabilidade e Liberdade Geográfica.
💸
