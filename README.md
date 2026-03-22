# 💸 Gestão Financeira Pessoal (Cloud Edition)

Sistema web robusto e acessível de qualquer lugar para controle de contas a pagar, gestão de cartão de crédito e organização financeira familiar.

Migrado para a nuvem utilizando **PostgreSQL**, com deploy em **Render** e banco hospedado no **Neon**, permitindo acesso via celular ou desktop de qualquer lugar, mantendo privacidade e performance.

---

## 📖 Sobre o Projeto

Este projeto nasceu para substituir planilhas complexas por uma interface visual, intuitiva e focada em **Contas a Pagar**.

Permite:
- Controle financeiro pessoal mensal
- Separação de gastos de terceiros (familiares que utilizam o mesmo cartão)
- Organização por prioridade (ordem customizável)
- Comparação de fatura real vs sistema

Originalmente desenvolvido em SQL Server local, foi modernizado para PostgreSQL e arquitetura cloud.

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

### 🌐 Portal de Terceiros (Acesso Público)
- **URL direta por pessoa** — cada terceiro acessa suas contas via link único contextuallizado (ex: `/contas/1/Mae`)
- **Isolamento de Dados** — garante que terceiros com o mesmo nome em contas de usuários diferentes não tenham seus dados misturados
- **Sem necessidade de login** — acesso público e read-only
- **Navegação entre meses** — botões Anterior / Próximo para consultar histórico
- **Compartilhar link** — no dashboard admin, clique direito no nome do terceiro → "Compartilhar link" copia a URL para o clipboard
- **SEO protegido** — meta tags `noindex, nofollow` impedem indexação por buscadores
- **Mobile-first** — totalmente responsivo e com design dark mode consistente

---

### 🤖 Bot do Telegram
- **Lançamentos via chat** — registre contas direto pelo Telegram
- **Conversa interativa** — o bot pergunta campo por campo
- **Botões inline** — selecione usuário e tipo com um toque
- **Segurança** — restrito ao seu Chat ID
- Documentação completa em [`botTelegram/README.md`](botTelegram/README.md)

---

## ⚙️ Ferramentas Avançadas

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
  - Compatível com monitoramento e diagnóstico rápido
- **Monitoramento via UptimeRobot**
  - Mantém o serviço ativo no Render free através de pings regulares
  - Rota dedicada: `/ping`
  - Mais leve que o GitHub Actions e sem necessidade de workflows externos

---

## 🩺 Monitoramento e Keep Alive

Para evitar o *cold start* (hibernação) do plano gratuito do Render, o projeto utiliza uma estratégia de monitoramento externo.

### Estratégia Adotada
- **Ferramenta**: [UptimeRobot](https://uptimerobot.com/).
- **Endpoint**: `/ping`.
- **Intervalo**: Chamada a cada **12 minutos**.
- **Vantagem**: Mantém a aplicação ativa sem a complexidade de workflows externos ou dependência de navegadores abertos.

### 🔍 Endpoint `/health`
O projeto possui um endpoint de health check pensado para:
- Monitoramento de uptime profundo.
- Verificação de conectividade com o banco Neon.
- Diagnóstico rápido da aplicação.

**Exemplo de resposta saudável:**
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

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Detalhes |
| :--- | :--- |
| **Runtime** | Node.js v18+ |
| **Framework** | Express 5.x |
| **Database** | PostgreSQL (Neon.tech) |
| **Hospedagem**| Render.com (Plano Gratuito) |
| **Frontend** | EJS + Vanilla CSS (Grid/Flex) |
| **Monitoramento**| UptimeRobot |
| **Bot Telegram** | node-telegram-bot-api (webhook) |
| **Testes** | Jest 30 + Supertest 7 |

---

## 🏗️ Arquitetura

O projeto segue uma arquitetura **modular** com separação clara de responsabilidades:

| Camada | Diretório | Responsabilidade |
| :--- | :--- | :--- |
| **Entrada** | `src/app.js` | Configuração do Express, sessão e montagem dos módulos |
| **Rotas** | `src/routes/` | Handlers de cada grupo de endpoints |
| **Middlewares** | `src/middlewares/` | Autenticação web (sessão), API (token) e logger |
| **Helpers** | `src/helpers/` | Parsing, async handler e inicialização do banco |
| **Dados** | `src/repositories/` | Repositories especializados por domínio + facade |
| **Constantes** | `src/constants.js` | Valores centralizados (status, tipos, limites) |
| **Conexão** | `src/config/` | Pool de conexão PostgreSQL |
| **Bot** | `botTelegram/` | Bot Telegram com conversa interativa (webhook) |
| **Views** | `src/views/` | Templates EJS com partials reutilizáveis |
| **Frontend** | `public/` | CSS, JavaScript do cliente e assets estáticos |
| **Testes** | `__tests__/` | Unitários, repositórios (mock), bot e integração |

---

## 📂 Estrutura do Projeto

```txt
/
├── public/
│   ├── css/
│   │   ├── style.css                      # Design system (dark mode)
│   │   └── terceiro.css                   # Estilos do Portal de Terceiros
│   ├── js/app.js                          # JavaScript do dashboard
│   ├── icons/                             # Ícones do projeto (PWA/Social)
│   └── favicon.ico
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
│   ├── telegramBot.js                     # Lógica principal do bot
│   └── README.md                          # Documentação do bot
├── __tests__/
│   ├── helpers/                           # Testes de parsing
│   ├── repositories/                      # Testes CRUD (mock do DB)
│   └── integration/                       # Testes de API (Supertest)
├── schema_postgreSQL.sql                  # Schema completo do banco
├── package.json
└── README.md
```

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
Execute o script SQL (disponível em `schema_postgreSQL.sql`):
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

### 4️⃣ Variáveis de Ambiente
Crie o arquivo `.env`:
```env
DATABASE_URL=postgres://usuario:senha@endpoint-neon.tech/neondb?sslmode=require
PORT=3000
SESSION_SECRET=seu_segredo_aqui
SENHA_MESTRA=sua_senha_aqui
API_TOKEN=seu_token_api
NODE_VERSION=18

# Bot Telegram (opcional)
TELEGRAM_BOT_TOKEN=token_do_botfather
TELEGRAM_CHAT_ID=seu_chat_id
TELEGRAM_WEBHOOK_SECRET=string_aleatoria
RENDER_EXTERNAL_URL=https://seu-app.onrender.com
```

### 5️⃣ Rodar
```bash
npm start
```
Acesse: `http://localhost:3000`

---

## ☁️ Deploy (Render + Neon)

### Neon
- Criar projeto e copiar connection string.
- Executar o script SQL acima.

### Render
- **New Web Service**: Conectar repositório GitHub.
- **Build Command**: `npm install`
- **Start Command**: `node src/app.js`
- **Environment Variables**: Adicionar todas as variáveis definidas no seu `.env`.

---

## 🔒 Segurança
- **Senhas hashadas** com `bcryptjs` (nunca armazenadas em texto puro).
- **Proteção contra brute-force** — delay configurável em tentativas de login.
- **Autenticação de sessão** para rotas web (`express-session`).
- **Autenticação por token** para API Android (`API_TOKEN`).
- **Bot restrito por Chat ID** — Telegram aceita apenas mensagens do dono.
- **Webhook com secret** — URL protegida contra payloads falsos.
- **Async error handling** — wrapper `asyncHandler` captura exceções em rotas.

---

## 💡 Dicas de Uso
- **Modo Privacidade**: Use para esconder valores na tela inicial.
- **Interação Mobile**: Double Tap para ações rápidas.
- **Relatórios**: Utilize o botão "Imprimir" para gerar PDF de cobrança.
- **Monitoramento**: Monitore a saúde da aplicação via endpoint `/health`.
- **Portal de Terceiros**: Compartilhe links contextuais para que terceiros acompanhem suas contas diretamente.

---

## 🎯 Objetivos do Projeto
- Simplicidade operacional e performance.
- Organização visual e independência geográfica.
- Código limpo e manutenível (Clean Code).
- Cobertura de testes automatizados e boa observabilidade.

---

## 📄 Licença
ISC — Desenvolvido por [Douglas Silva](https://github.com/dougllassillva27).
💸
