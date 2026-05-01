<div align="center">

# 💸 Gestão Financeira Pessoal (Cloud Edition)

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon.tech-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Jest](https://img.shields.io/badge/Jest-30.x-C21325?style=for-the-badge&logo=jest&logoColor=white)](https://jestjs.io/)

Sistema web robusto, PWA-Ready e focado em altíssima performance para controle de contas a pagar, gestão de cartões de crédito em lote e organização financeira familiar distribuída.

Migrado para a nuvem utilizando **PostgreSQL**, com deploy em **Render** e banco hospedado no **Neon**, permitindo acesso via celular ou desktop de qualquer lugar, mantendo privacidade e performance.

</div>

---

## 📖 Sobre o Projeto

Este projeto nasceu para substituir planilhas complexas por uma interface visual, intuitiva e focada em **Contas a Pagar**.

Permite:

- Controle financeiro pessoal mensal
- Separação de gastos de terceiros (familiares que utilizam o mesmo cartão)
- Organização por prioridade (ordem customizável)
- Comparação de fatura real vs sistema
- Sincronização e espelhamento automático entre contas

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
- **Gestão de Terceiros**
  - **Painel Centralizado (`/terceiros`)**: Área administrativa exclusiva (protegida por autenticação) para visualizar o total de gastos de cada pessoa e gerenciar o compartilhamento de links públicos de forma ágil.
  - **Notificador WhatsApp**: Disparo semi-automático de links com mensagens padronizadas diretamente para o aplicativo do destinatário.
  - **Templates Dinâmicos**: Personalize a mensagem global no próprio painel utilizando variáveis mágicas (`{nome_terceiro}`, `{mes}`, `{ano}`, `{link}`).
  - **Agenda de Contatos**: Persistência automática dos números de telefone (+55) de cada terceiro no banco de dados para envios com 1 clique.
- **Bloco de Notas Avançado**
  - Abas para anotações Mensais e Globais (atemporais)
  - Suporte a Markdown básico e Checklists interativos salvos em nuvem

---

### 🌐 Portal de Terceiros (Acesso Público)

- **URL Inteligente e Direta** — cada terceiro acessa suas próprias contas via link único já contextualizado com o mês e ano ativos (ex: `/contas/1/Mae?month=3&year=2026`).
- **Isolamento de Dados** — garante que terceiros com o mesmo nome em contas de usuários diferentes não tenham seus dados misturados.
- **Sem necessidade de login** — acesso 100% público e _read-only_ (somente leitura) para o cliente final.
- **Navegação Histórica** — botões Anterior / Próximo para consultar faturas passadas.
- **Compartilhamento Descomplicado** — links gerados pelo administrador via tela de gestão de terceiros (com atalho direto de envio pro WhatsApp) ou menu de contexto.
- **Privacidade e SEO** — meta tags `noindex, nofollow` impedem indexação por buscadores (Google, Bing).
- **Mobile-first** — interface totalmente responsiva com design dark mode imersivo.

---

### 🤖 Bot do Telegram

- **Lançamentos via chat** — registre contas direto pelo Telegram
- **Conversa interativa** — o bot pergunta campo por campo
- **Botões inline** — selecione usuário e tipo com um toque
- **UX Minimalista** — Respostas consolidadas na mesma linha (in-place) mantendo o histórico de chat super limpo.
- **Lançamento em Lote (Bulk)** — Permite inserir múltiplos nomes separados por vírgula na etapa de terceiros para lançamentos simultâneos.
- **Segurança** — restrito ao seu Chat ID
- Documentação completa em `botTelegram/README.md`

---

### 💡 Módulo de Estimativa de Luz

- **Microsserviço Integrado** — calcula e acompanha o consumo mensal de energia elétrica.
- **Precisão Real** — utiliza tarifas exatas da distribuidora (TUSD + TE + Iluminação Pública) com precisão de centavos.
- **KISS (Keep It Simple, Stupid)** — interface minimalista focada apenas nos dados essenciais: leitura anterior e atual.
- **Reutilização Inteligente** — permite puxar a última leitura com um clique para iniciar um novo mês.
- **Segurança** — rotas de API protegidas nativamente por validação de API Key.
- Documentação completa em `calcularLuz/README.md`

---

### 🕒 Módulo Data/Hora de Brasília

- **Microsserviço Independente** — consulta a World Time API via RapidAPI para obter o horário exato de Brasília.
- **Fuso Horário Blindado** — imune ao fuso horário do servidor em nuvem (Render roda em UTC), processando os dados através de string parsing para garantir a hora exata (UTC-3).
- **Suporte Multiformato (API REST)** — acessando `/dataHora` pelo navegador exibe uma interface HTML minimalista. Suporta _content negotiation_ para retornar dados estruturados em JSON, ou diretamente via endpoint `/dataHora/json` para integrações de backend/Postman.
- **Acesso Livre** — rota pública sem necessidade de autenticação no sistema.

---

## ⚙️ Ferramentas Avançadas

- **Fechamento de Mês (Month Lock)**
  - Trava de segurança que congela o mês selecionado, impedindo a criação ou exclusão acidental de lançamentos.
  - Ideal para manter a integridade dos dados após a conferência e conciliação bancária.
  - Mudanças de status rotineiras (pago/pendente/conferido) continuam liberadas na interface.
- **Mover Mês (Shift)**
  - Deslocamento ágil de contas (especialmente de Cartão de Crédito) para o mês anterior ou seguinte, corrigindo faturamentos deslocados com 1 clique.
  - Funciona individualmente (ícones `❮` e `❯` nas linhas) ou em massa (seleção múltipla no modal de Últimas Adições).
  - Respeita rigorosamente a Trava de Mês Fechado (_Month Lock_) nas duas pontas (origem e destino da alteração).
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
- **Monitoramento e Anti-Idle via Google Apps Script**
  - Mantém o serviço ativo no Render Free contornando bloqueios de bots conhecidos
  - Rota dedicada: `/ping`
  - Mais leve que runtimes de CI/CD e sem necessidade de servidores extras

---

## ⚡ Arquitetura e Alta Performance

- **Soft Refresh (DOM Diffing Nativo)**
  - O frontend intercepta requisições CRUD (Adicionar, Editar, Mover, Deletar) e atualiza a interface cirurgicamente em _background_ utilizando `DOMParser`. O tempo de resposta para o usuário cai de ~5s (F5 tradicional) para ~0.5s, criando uma experiência _App-like_.
- **Sincronização Fire-and-Forget**
  - Cálculos pesados de divisão de contas e espelhamentos de terceiros rodam em background na _Event Loop_ do Node.js, não bloqueando o carregamento (SSR) do Dashboard.
- **Trava Anti-Corrida (Memory Locks)**
  - O frontend possui um state machine rigoroso (`isSubmitting`) que atua na _thread_ principal do JavaScript, impossibilitando envios duplicados mesmo com _double-clicks_ agressivos (mouse gamer ou tela touch).
- **Cache-Busting Customizado (`versionador.js`)**
  - Motor próprio de versionamento no _build-time_ que varre a aplicação inteira, calcula o MD5 dos arquivos estáticos reais e injeta as hashes `?v=hash` no HTML/CSS.
  - Blinda a aplicação contra "Service Workers zumbis" e agressividade do cache de navegadores mobile (iOS/Android).

---

## 🩺 Monitoramento e Keep Alive

Para evitar o _cold start_ (hibernação) do plano gratuito do Render, o projeto utiliza um script no Google Apps Script simulando um navegador real. Essa estratégia impede o serviço de host de abater conexões vindas de _bots conhecidos_ (como ocorria no UptimeRobot).

### Estratégia Adotada (Passo a Passo)

1. Crie um novo projeto gratuito no Google Apps Script.
2. Adicione a função responsável por fazer um GET disfarçado e salve o código:
   ```javascript
   function pingRenderHost() {
     var url = 'https://SEU_PROJETO.onrender.com/ping';
     var options = {
       method: 'get',
       muteHttpExceptions: true,
       headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' },
     };
     UrlFetchApp.fetch(url, options);
   }
   ```
3. Configure um **Acionador (Trigger)** baseado no tempo (_Minutes timer_) para executar a função `pingRenderHost` a cada **10 minutos**.

- **Vantagem Principal**: IPs originários da infraestrutura do Google Drive não caem em filtros primários em balanceadores Cloudflare e o _spoofing_ do cabeçalho `User-Agent` finaliza a ilusão de tráfego real.

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

## ⌨️ Atalhos de Teclado (Power Users)

Focando em agilidade e ergonomia para quem utiliza o sistema pelo computador, o dashboard suporta atalhos globais:

- <kbd>Alt</kbd> + <kbd>A</kbd>: Abre o painel de **Últimas Adições**.
- <kbd>Alt</kbd> + <kbd>N</kbd>: Abre o formulário de **Novo Lançamento**.
- <kbd>Alt</kbd> + <kbd>T</kbd>: Abre a tela de **Gestão de Terceiros** preservando o mês atual.
- <kbd>Alt</kbd> + <kbd>B</kbd>: Realiza o **Backup JSON** do sistema.
- <kbd>Alt</kbd> + <kbd>C</kbd>: Alterna o status de **Fechamento do Mês** (Cadeado).
- <kbd>Alt</kbd> + <kbd>I</kbd>: Abre a tela de **Relatório/Impressão** do mês atual.
- <kbd>Esc</kbd>: Fecha qualquer modal ativo ou menu de contexto instantaneamente.

---

## ⚡ Automação: Cópia Mensal de Contas

O sistema possui um endpoint de automação que realiza a cópia das contas de todos os usuários de forma automática e gratuita via **Google Apps Script**.

### Como Configurar (Google Apps Script)

1. Abra seu projeto no Google Apps Script.
2. Cole a função abaixo (também disponível em scripts/google-apps-script-example.js):

```javascript
/**
 * Adicione este código ao seu Google Apps Script (GAS)
 * Configurar como: Temporizador Diário (22:00 às 23:00)
 */
function verificarEExecutarCopia() {
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);

  if (amanha.getDate() === 1) {
    Logger.log('📅 Último dia detectado. Iniciando...');
    dispararWebhookCopia();
  }
}

function dispararWebhookCopia() {
  const URL_BASE = 'https://SUA_URL.onrender.com';
  const API_TOKEN = 'SEU_API_TOKEN';
  const url = URL_BASE + '/api/v1/integracao/copiar-mensal';

  const options = {
    method: 'post',
    headers: { 'x-api-key': API_TOKEN },
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  Logger.log(response.getContentText());
}
```

3. No menu lateral, vá em **Acionadores** (ícone de relógio).
4. Clique em **Adicionar Acionador**.
5. Configure:
   - **Função**: `verificarEExecutarCopia`
   - **Origem do evento**: Contagem de tempo.
   - **Tipo de acionador**: Temporizador diário.
   - **Horário**: 22:00 às 23:00 (Horário de Brasília).

> **Por que diário?** O script possui uma proteção interna que checa se "amanhã é dia 1". Ele rodará todo dia, mas a cópia real só acontece no **exato último dia do mês**.

### Segurança

O script utiliza o `API_TOKEN` definido no seu `.env` para garantir que apenas o seu robô possa disparar a cópia.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia        | Detalhes                        |
| :---------------- | :------------------------------ |
| **Runtime**       | Node.js v18+                    |
| **Framework**     | Express 5.x                     |
| **Database**      | PostgreSQL (Neon.tech)          |
| **Hospedagem**    | Render.com (Plano Gratuito)     |
| **Frontend**      | EJS + Vanilla CSS (Grid/Flex)   |
| **Monitoramento** | Google Apps Script (Triggers)   |
| **Bot Telegram**  | node-telegram-bot-api (webhook) |
| **Testes**        | Jest 30 + Supertest 7           |

---

## 🏗️ Arquitetura

O projeto segue uma arquitetura **modular** com separação clara de responsabilidades:

| Camada          | Diretório           | Responsabilidade                                                |
| :-------------- | :------------------ | :-------------------------------------------------------------- |
| **Entrada**     | `src/app.js`        | Configuração do Express, sessão e montagem dos módulos          |
| **Módulos**     | `src/modules/`      | Funcionalidades independentes (Bot Telegram, Estimativa de Luz) |
| **Rotas**       | `src/routes/`       | Handlers de cada grupo de endpoints                             |
| **Middlewares** | `src/middlewares/`  | Autenticação web (sessão), API (token) e logger                 |
| **Helpers**     | `src/helpers/`      | Parsing, async handler e inicialização do banco                 |
| **Dados**       | `src/repositories/` | Repositories especializados por domínio + facade                |
| **Constantes**  | `src/constants.js`  | Valores centralizados (status, tipos, limites)                  |
| **Conexão**     | `src/config/`       | Pool de conexão PostgreSQL                                      |
| **Views**       | `src/views/`        | Templates EJS com partials reutilizáveis                        |
| **Frontend**    | `public/`           | CSS, JavaScript do cliente e assets estáticos                   |
| **Testes**      | `__tests__/`        | Unitários, repositórios (mock), bot e integração                |

---

## 📂 Estrutura do Projeto

```txt
/
├── docs/
│   └── history/
│       └── database/                      # Scripts e SQL de migrações históricas
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
│   ├── modules/
│   │   ├── botTelegram/                   # Bot Telegram (webhook)
│   │   ├── calcularLuz/                   # App de estimativa de conta de luz
│   │   └── dataHora/                      # Microsserviço de horário de Brasília
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
│   │   ├── MesFechadoRepository.js        # Controle de congelamento de meses
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
-- 1. Tabela Usuarios
CREATE TABLE IF NOT EXISTS Usuarios (
    Id SERIAL PRIMARY KEY,
    Nome VARCHAR(50) NOT NULL,
    Login VARCHAR(50) NOT NULL UNIQUE,
    SenhaHash VARCHAR(255) NOT NULL
);

-- Insere usuários padrão se não existirem
INSERT INTO Usuarios (Nome, Login, SenhaHash)
VALUES
('Dodo', 'dodo', '$HASH_SENHA'),
('Vitoria', 'vitoria', '$HASH_SENHA')
ON CONFLICT (Login) DO NOTHING;

-- 2. Tabela Lancamentos
CREATE TABLE IF NOT EXISTS Lancamentos (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id),
    Descricao VARCHAR(255) NOT NULL,
    Valor DECIMAL(18, 2) NOT NULL,
    Tipo VARCHAR(20) NOT NULL, -- 'RENDA', 'FIXA', 'CARTAO'
    Categoria VARCHAR(50), -- 'Salários', 'Extra', etc
    Status VARCHAR(20) DEFAULT 'PENDENTE',
    DataVencimento DATE NOT NULL,
    ParcelaAtual INT,
    TotalParcelas INT,
    NomeTerceiro VARCHAR(100),
    Ordem INT DEFAULT 9999,
    Conferido BOOLEAN DEFAULT FALSE,
    DataCriacao TIMESTAMP DEFAULT NOW(),
    ConferidoExtrato BOOLEAN DEFAULT FALSE
);

-- 3. Tabela Anotacoes
CREATE TABLE IF NOT EXISTS Anotacoes (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id),
    Mes INT,
    Ano INT,
    Conteudo TEXT,
    UNIQUE(UsuarioId, Mes, Ano)
);

-- 4. Tabela OrdemCards
CREATE TABLE IF NOT EXISTS OrdemCards (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id),
    Nome VARCHAR(255) NOT NULL,
    Ordem INT NOT NULL
);

-- 5. Tabela FaturaManual
CREATE TABLE IF NOT EXISTS FaturaManual (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id),
    Mes INT NOT NULL,
    Ano INT NOT NULL,
    Valor DECIMAL(18, 2) DEFAULT 0,
    UNIQUE(UsuarioId, Mes, Ano)
);

-- ==============================================================================
-- Tabela de Tokens Persistentes (Lembrar de mim)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS TokensPersistentes (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
    Token VARCHAR(255) NOT NULL UNIQUE,
    DataExpiracao TIMESTAMP NOT NULL,
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tokens_token ON TokensPersistentes(Token);
CREATE INDEX IF NOT EXISTS idx_tokens_expires ON TokensPersistentes(DataExpiracao);

-- ==============================================================================
-- 6. Tabela MesesFechados (Controle de Mês Trancado)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS MesesFechados (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
    Mes INT NOT NULL,
    Ano INT NOT NULL,
    DataFechamento TIMESTAMP DEFAULT NOW(),
    UNIQUE(UsuarioId, Mes, Ano)
);

-- ==============================================================================
-- 7. Tabela registros_luz (Módulo Calcular Luz)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS registros_luz (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
    mes_referencia VARCHAR(50) NOT NULL,
    leitura_anterior NUMERIC(10, 2) NOT NULL,
    leitura_atual NUMERIC(10, 2) NOT NULL,
    consumo_kwh NUMERIC(10, 2) NOT NULL,
    valor_estimado NUMERIC(10, 2) NOT NULL,
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 8. Tabela Terceiros (Contatos de Terceiros / WhatsApp)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS Terceiros (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
    Nome VARCHAR(100) NOT NULL,
    Telefone VARCHAR(20),
    UNIQUE(UsuarioId, Nome)
);

-- ==============================================================================
-- 9. Tabela configuracoes (Preferências do Usuário)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS configuracoes (
    usuario_id INT PRIMARY KEY REFERENCES Usuarios(Id) ON DELETE CASCADE,
    whatsapp_template TEXT,
    privacidade_global BOOLEAN DEFAULT FALSE,
    divisao_casa_minimo NUMERIC(10, 2) DEFAULT 750.00
);
```

### 4️⃣ Variáveis de Ambiente

Crie o arquivo `.env`:

```env
DATABASE_URL=postgres://usuario:senha@endpoint-neon.tech/neondb?sslmode=verify-full
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

## 🧪 Testes Automatizados (Jest & Supertest)

A aplicação possui uma suíte de testes robusta contendo **190 testes automatizados** com execução ultrarrápida (~2.5s totais).

- **Unitários**: Regras de negócio, _parseHelpers_, formatadores e cálculo de datas (fuso UTC-3 blindado).
- **Repositórios**: Mock da biblioteca `pg`. Validação de transações (`BEGIN/COMMIT/ROLLBACK`), `UPSERTs` e lógicas de paginação sem tocar no banco de dados físico.
- **Middlewares**: Validação de injeção de tokens persistentes, `x-api-key` e falhas de sessão.
- **Integração M2M**: Testes fim-a-ponta na API Android e endpoints de _webhook_ do Telegram.
- **UI & DOM**: Validações anti-duplo-clique e injeção do `DOMParser` testadas em ambiente `jsdom`.
- **Memory Leaks**: Mocks dedicados de _Fetch API_ e instâncias assíncronas de Rede (Telegram) para garantir encerramento gracioso (sem _Open Handles_).

**Para executar a suíte localmente:**

```bash
# Todos os testes
npm test
```

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

ISC — Desenvolvido por Douglas Silva.
💸
