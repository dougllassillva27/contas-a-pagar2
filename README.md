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

- **Dark Mode**

- **Mobile First**
  - Otimizado para smartphones (ex: Galaxy S23)
  - Bloqueio de seleção acidental de texto

- **Impressão A4**
  - CSS print
  - Ideal para gerar PDF de cobrança

---

### ⚙️ Ferramentas Avançadas

- **Copiar Mês**
  - Replica contas fixas
  - Replica parcelas pendentes
- **Backup JSON**
  - Exportação manual de segurança
- **Fatura Manual**
  - Campo para comparar valor calculado vs valor do app do banco

---

## 🛠️ Tecnologias Utilizadas

- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Neon.tech)
- **Hospedagem:** Render.com (Plano Gratuito)
- **Frontend:** EJS + CSS3 (Grid Layout + Variáveis)
- **Driver:** pg (node-postgres)

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
```

---

### 5️⃣ Rodar

```bash
npm start
```

Acesse:

http://localhost:3000

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
- Build Command:

```{=html}
<!-- -->
```

    npm install

- Start Command:

```{=html}
<!-- -->
```

    node src/app.js

- Variáveis:
  - DATABASE_URL
  - NODE_VERSION
  - SESSION_SECRET
  - SENHA_MESTRA

---

## 🏗️ Arquitetura

O projeto segue uma arquitetura **modular** com separação clara de responsabilidades:

| Camada          | Diretório           | Responsabilidade                                       |
| --------------- | ------------------- | ------------------------------------------------------ |
| **Entrada**     | `src/app.js`        | Configuração do Express, sessão e montagem dos módulos |
| **Rotas**       | `src/routes/`       | Handlers de cada grupo de endpoints                    |
| **Middlewares** | `src/middlewares/`  | Autenticação web (sessão) e API (token)                |
| **Helpers**     | `src/helpers/`      | Funções utilitárias (parsing de valores, parcelas)     |
| **Dados**       | `src/repositories/` | Queries SQL e acesso ao banco                          |
| **Conexão**     | `src/config/`       | Pool de conexão PostgreSQL                             |
| **Views**       | `src/views/`        | Templates EJS com partials reutilizáveis               |
| **Frontend**    | `public/`           | CSS, JavaScript do cliente e assets estáticos          |

---

## 📂 Estrutura do Projeto

    /
    ├── public/
    │   ├── css/style.css               # Design system (dark mode)
    │   ├── js/app.js                   # JavaScript do dashboard
    │   └── favicon.ico
    ├── src/
    │   ├── app.js                      # Ponto de entrada (~65 linhas)
    │   ├── config/
    │   │   └── db.js                   # Pool PostgreSQL
    │   ├── helpers/
    │   │   └── parseHelpers.js         # parseValor, parcelas, etc.
    │   ├── middlewares/
    │   │   └── auth.js                 # authMiddleware + apiAuth
    │   ├── repositories/
    │   │   └── FinanceiroRepository.js # Camada de dados (queries)
    │   ├── routes/
    │   │   ├── publicRoutes.js         # Login / Logout
    │   │   ├── integrationRoutes.js    # API Android
    │   │   └── apiRoutes.js            # Dashboard + CRUD + APIs
    │   └── views/
    │       ├── index.ejs               # Dashboard principal
    │       ├── login.ejs               # Tela de login
    │       ├── relatorio.ejs           # Extrato para impressão
    │       └── partials/
    │           ├── head.ejs            # Meta tags, CSS, fonts
    │           ├── header.ejs          # Barra superior + navegação
    │           └── modals.ejs          # Todos os modais
    ├── schema_postgreSQL.sql           # Schema do banco
    ├── .gitignore
    ├── package.json
    └── README.md

---

## 💡 Dicas de Uso

- Use o modo privacidade para esconder valores
- Double Tap no mobile para ações rápidas
- Use "Imprimir" para gerar PDF
- Plano free pode hibernar --- basta relogar

---

## 🎯 Objetivos do Projeto

- Simplicidade operacional
- Performance
- Organização visual
- Independência geográfica
- Código limpo e manutenível

---

Desenvolvido com foco em Clean Code, Performance e Liberdade Geográfica.
💸
