# 💸 Gestão Financeira Pessoal

Um sistema web robusto e performático para controle de contas a pagar, gestão de cartão de crédito e organização financeira familiar, rodando localmente.

---

## 📖 Sobre o Projeto

Este projeto foi desenvolvido para substituir planilhas complexas por uma interface visual intuitiva e focada em **Contas a Pagar**. Ele permite gerenciar não apenas as finanças pessoais (**Dodo**), mas também segregar gastos de terceiros (familiares) que utilizam o mesmo cartão de crédito, facilitando a cobrança e o controle no final do mês.

O sistema roda localmente para garantir **privacidade total dos dados** e **performance instantânea**.

---

## 🚀 Funcionalidades Principais

### 📊 Dashboard & Controle

- **Visão Geral:** Cards com Total de Rendas, Total de Contas, Falta Pagar e Saldo Previsto.
- **Contas Fixas:** Gestão de despesas recorrentes (Água, Luz, Internet).
- **Cartão de Crédito:** Controle detalhado com suporte a parcelamento (ex: `01/10`).
- **Bloco de Notas:** Área de anotações persistente (salva automaticamente).

### 👥 Gestão de Terceiros

- **Painéis Individuais:** Separação automática de gastos por pessoa (ex: Mãe, Vô, Casa).
- **Totalizadores:** Visualização rápida de quanto cada terceiro deve no mês.

### ✨ UX/UI (Experiência do Usuário)

- **Drag & Drop:** Organize a prioridade das contas e a ordem dos cards de terceiros arrastando e soltando.
- **Modais Responsivos:** Adição e edição de lançamentos sem recarregar a página.
- **Dark Mode:** Interface moderna e confortável para uso noturno.
- **Scroll Fino:** Barras de rolagem estilizadas e minimalistas.

### ⚙️ Ferramentas Avançadas

- **Copiar Mês:** Duplica contas fixas e parcelas pendentes para o mês seguinte automaticamente.
- **Backup:** Exportação completa dos dados para JSON com um clique.
- **Segurança:** Login com senha para acesso restrito.
- **Impressão:** Layout otimizado para imprimir relatórios de cobrança.

---

## 🛠️ Tecnologias Utilizadas

- **Backend:** Node.js com Express
- **Database:** SQL Server (MSSQL)
- **Frontend:** EJS (Template Engine), CSS3 puro (Variáveis, Flexbox e Grid)
- **Autenticação:** Express-Session

---

## 📝 Pré-requisitos

Antes de começar, você precisa ter instalado:

- Node.js (versão LTS recomendada)
- SQL Server (Express ou Developer)

---

## 🚀 Instalação e Configuração

### 1️⃣ Clonar ou Baixar

Extraia os arquivos do projeto em uma pasta de sua preferência  
Exemplo: `C:\Projetos\GestaoFinanceira`

### 2️⃣ Instalar Dependências

No terminal, dentro da pasta do projeto:

```bash
npm install
```

### 3️⃣ Configurar Banco de Dados

1. Abra seu gerenciador de banco (SSMS, DBeaver ou Azure Data Studio).
2. Abra o arquivo `schema.sql` (na raiz do projeto).
3. Execute todo o script para criar o banco **GestaoFinanceira** e as tabelas:
   - `Lancamentos`
   - `Anotacoes`
   - `OrdemCards`

### 4️⃣ Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DB_USER=seu_usuario_sql
DB_PASS=sua_senha_sql
DB_SERVER=NOME-DO-PC\INSTANCIA
DB_NAME=GestaoFinanceira
PORT=80
```

---

## ▶️ Como Rodar

### Modo Padrão

```bash
node src/app.js
```

Ou:

```bash
npm start
```

### 🌐 Acessando

- Porta 80 → http://localhost
- Porta 3000 → http://localhost:3000

**Senha Padrão:** `XXXX`

> Pode ser alterada editando a constante `SENHA_MESTRA` em `src/app.js`

---

## 📂 Estrutura do Projeto

```text
/
├── public/
│   └── css/
│       └── style.css
├── src/
│   ├── config/
│   │   └── db.js
│   ├── repositories/
│   │   └── FinanceiroRepository.js
│   ├── views/
│   │   ├── index.ejs
│   │   └── login.ejs
│   └── app.js
├── .env
├── schema.sql
└── package.json
```

---

## 💡 Dicas de Uso

- **Criação Rápida:** Modal já abre com foco na descrição.
- **Parcelas:** Use o formato `Atual/Total` (ex: `1/10`).
- **Mover Cards:** Arraste pelo título do card.
- **Impressão:** Ideal para gerar PDF e enviar no WhatsApp da família.

---

## 🔒 Backup e Segurança

- **Backup:** Botão no topo gera `.json` com todos os dados.
- **Rede Local:** Acesse pelo celular via IP local  
  Exemplo: `http://192.168.0.15`

---

Desenvolvido para uso pessoal com foco em **Clean Code**, **Performance** e **Controle Financeiro Consciente**. 💸
