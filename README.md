# 💸 Gestão Financeira Pessoal (Cloud Edition)

Um sistema web robusto e acessível de qualquer lugar para controle de
contas a pagar, gestão de cartão de crédito e organização financeira
familiar. Agora migrado para a nuvem com **PostgreSQL**!

---

## 📖 Sobre o Projeto

Este projeto substitui planilhas complexas por uma interface visual
intuitiva e focada em **Contas a Pagar**. Ele permite gerenciar não
apenas as finanças pessoais, mas também segregar gastos de terceiros
(familiares) que utilizam o mesmo cartão de crédito.

Originalmente criado em SQL Server local, o projeto foi modernizado para
**PostgreSQL** e hospedado no **Render/Neon**, permitindo acesso via
celular ou desktop de qualquer lugar, mantendo a privacidade e a
performance.

---

## 🚀 Funcionalidades Principais

### 📊 Dashboard & Controle

- **Visão Geral:** Cards com Total de Rendas (com modo privacidade
  👁️), Total de Contas, Falta Pagar e Saldo Previsto.
- **Contas Fixas:** Gestão de despesas recorrentes (Água, Luz,
  Internet).
- **Cartão de Crédito:** Controle detalhado com suporte a parcelamento
  (ex: `01/10`).
- **Bloco de Notas:** Área de anotações persistente.

### 👥 Gestão de Terceiros

- **Painéis Individuais:** Separação automática de gastos por pessoa
  (ex: Mãe, Vô, Casa).
- **Totalizadores:** Visualização rápida de quanto cada terceiro deve
  no mês.

### ✨ UX/UI (Experiência do Usuário)

- **Drag & Drop:** Organize a prioridade das contas arrastando e
  soltando.
- **Modais Responsivos:** Adição e edição rápida sem recarregar a
  página.
- **Dark Mode:** Interface moderna e confortável.
- **Impressão A4:** Layout otimizado (CSS print) para gerar relatórios
  de cobrança em PDF.

### ⚙️ Ferramentas Avançadas

- **Copiar Mês:** Duplica contas fixas e parcelas pendentes para o mês
  seguinte.
- **Backup:** Exportação dos dados (JSON) para segurança local.
- **Fatura App:** Campo para comparar o valor calculado pelo sistema
  vs valor real do App do banco.

---

## 🛠️ Tecnologias Utilizadas

- **Backend:** Node.js com Express
- **Database:** PostgreSQL (Hospedado no Neon.tech)
- **Hospedagem:** Render.com (Plano Gratuito)
- **Frontend:** EJS, CSS3 (Variáveis, Grid Layout)
- **Driver:** `pg` (node-postgres)

---

## 📝 Pré-requisitos

Para rodar ou modificar o projeto, você precisa: - **Node.js** (v18 ou
superior) - Conta no **GitHub** (para deploy) - Conta no **Neon.tech**
(Banco de dados gratuito) - Conta no **Render.com** (Hospedagem
gratuita)

---

## 🚀 Instalação e Configuração (Local)

Se quiser rodar no seu PC para desenvolvimento:

### 1️⃣ Clonar o Repositório

```bash
git clone https://github.com/dougllassillva27/contas-a-pagar2.git
cd contas-a-pagar2
```

### 2️⃣ Instalar Dependências

```bash
npm install
```

### 3️⃣ Configurar Banco de Dados (PostgreSQL)

Crie um banco de dados no Neon ou no seu Postgres Local.

Rode o script de criação das tabelas (SQL) no seu gerenciador de banco:

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

Crie um arquivo `.env` na raiz ou configure no seu sistema:

```env
DATABASE_URL=postgres://usuario:senha@endpoint-neon.tech/neondb?sslmode=require
PORT=3000
```

### 5️⃣ Rodar

```bash
npm start
```

Acesse: http://localhost:3000

---

## ☁️ Como Fazer Deploy (Colocar Online)

### Passo 1: GitHub

Suba seu código para um repositório no GitHub.

### Passo 2: Neon.tech (Banco)

- Crie um projeto no Neon.
- Copie a Connection String (começa com `postgres://...`).
- Vá no "SQL Editor" do Neon e rode o script de criação das tabelas.

### Passo 3: Render.com (App)

- Crie um **New Web Service**.

- Conecte seu repositório do GitHub.

- Em **Build Command**, use:

      npm install

- Em **Start Command**, use:

      node src/app.js

- Em **Environment Variables**, adicione:
  - `DATABASE_URL` = (Sua string de conexão do Neon)
  - `NODE_VERSION` = 18 (ou 20)

Pronto! Seu sistema estará online. 🌍

---

## 📂 Estrutura do Projeto

    /
    ├── public/
    │   ├── css/style.css
    │   └── js/
    ├── src/
    │   ├── config/
    │   │   └── db.js
    │   ├── repositories/
    │   │   └── FinanceiroRepository.js
    │   ├── views/
    │   │   ├── index.ejs
    │   │   ├── login.ejs
    │   │   └── relatorio.ejs
    │   └── app.js
    ├── .gitignore
    ├── package.json
    └── README.md

---

## 💡 Dicas de Uso

- **Privacidade:** Clique no "olhinho" no card de Rendas para
  esconder/mostrar o valor (salva a preferência no navegador).
- **Impressão:** O botão "Imprimir" gera um relatório limpo, ideal
  para salvar em PDF.
- **Login:** O sistema pode desconectar automaticamente no plano free
  do Render. Basta logar novamente.

---

Desenvolvido com foco em Clean Code, Performance e Liberdade Geográfica.
💸
