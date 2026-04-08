# 💡 Calculadora de Consumo de Energia

Aplicação web Full-Stack (Monolito Leve) para cálculo e acompanhamento mensal de consumo de energia elétrica.

O projeto foi recentemente refatorado para focar em uma experiência de usuário simplificada (**KISS**), eliminando a necessidade de rateios dinâmicos e passando a utilizar as tarifas exatas da distribuidora (TUSD + TE + Iluminação Pública) para entregar estimativas com precisão de centavos.

---

## 🚀 Tecnologias Utilizadas

### Backend

- **Node.js** com **Express**
- **PostgreSQL** (Hospedado na nuvem via NeonDB)
- **pg** (Pool de conexões com resiliência e auto-reconexão)
- **dotenv** & **CORS**

### Frontend

- **HTML5** Semântico
- **CSS3** (Design System com Variáveis Globais, Layout Fluido 100% responsivo e suporte nativo a **Dark Mode**)
- **JavaScript (Vanilla)** (Fetch API, formatação de UI e controle de estado)

---

## 📁 Estrutura do Projeto

    calcularLuz/
    │
    ├── server.js              # Ponto de entrada do Backend (API + Servidor Estático + DB Sync)
    ├── public/                # Frontend (Single Page Application)
    │   ├── index.html         # Estrutura da interface
    │   ├── css/
    │   │   └── style.css      # Estilos e Tema Escuro/Claro
    │   └── js/
    │       └── app.js         # Lógica de cálculo, regras de negócio e chamadas à API
    │
    ├── .env                   # Variáveis de ambiente (não versionado)
    ├── .env.example           # Template de configuração
    ├── .gitignore
    └── README.md

---

## ⚙️ Configuração do Ambiente

### 1. Clonar o projeto

    git clone <seu-repo>
    cd calcularLuz

### 2. Instalar dependências

    npm install

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

    PORT=3000
    DATABASE_URL=postgresql://usuario:senha@ep-seu-host.neon.tech/seu_db?sslmode=require

> ⚠️ **Atenção:** Nunca suba o arquivo `.env` para repositórios públicos.

---

## 🧠 Como Funciona a Aplicação

### Entrada de Dados (Simplificada)

O formulário exige apenas 3 informações do usuário:

1. **Mês de Referência** (Ex: Abril/2026)
2. **Leitura Anterior** (O que estava no relógio no mês passado)
3. **Leitura Atual** (O que está no relógio hoje)

### Processamento e Regras de Negócio

O sistema calcula a diferença para obter o **Consumo em kWh**. Em seguida, aplica uma tarifa fixa configurável no topo do arquivo `app.js` baseada nos dados reais da concessionária:

**Preço do kWh:** R$ 1,0383 (TUSD + TE com impostos ICMS/PIS/COFINS embutidos)  
**Iluminação Pública (IP-CIP):** R$ 13,57 (Taxa fixa municipal)

### Persistência e Histórico

- Os dados são salvos no banco **PostgreSQL**
- O sistema possui uma funcionalidade inteligente de **Reutilizar**: com um clique, ele puxa a "Leitura Atual" de um registro histórico e a transforma na "Leitura Anterior" do seu novo preenchimento

---

## 🔌 API RESTful

### POST /api/salvar

Salva uma nova medição no banco de dados.

**Body (JSON):**

    {
      "mesReferencia": "Abril 2026",
      "leituraAnterior": 7581,
      "leituraAtual": 7875,
      "consumo": 294,
      "valorEstimado": 318.83
    }

**Respostas:**

- **201 Created** - Retorna o objeto salvo
- **400 Bad Request** - Faltam dados obrigatórios
- **500 Internal Server Error** - Falha de banco de dados

---

### GET /api/historico

Retorna a lista completa de registros ordenados do mais recente para o mais antigo.

**Resposta:**

    [
      {
        "id": 1,
        "mes_referencia": "Abril 2026",
        "leitura_anterior": 7581.00,
        "leitura_atual": 7875.00,
        "consumo_kwh": 294.00,
        "valor_estimado": 318.83,
        "data_registro": "2026-04-15T10:30:00.000Z"
      }
    ]

---

### DELETE /api/deletar/:id

Exclui um registro específico pelo ID.

**Exemplo:**

    DELETE /api/deletar/42

**Respostas:**

- **200 OK** - Registro excluído com sucesso
- **404 Not Found** - ID não encontrado
- **500 Internal Server Error** - Falha de banco de dados

---

## 📊 Banco de Dados (Auto-Gerenciado)

O sistema utiliza **PostgreSQL**. Uma funcionalidade de `syncDatabaseSchema` roda automaticamente ao iniciar o `server.js`, garantindo que a tabela exista e não possua restrições legadas.

### DDL da Tabela Atual:

    CREATE TABLE IF NOT EXISTS registros_luz (
        id SERIAL PRIMARY KEY,
        mes_referencia VARCHAR(50) NOT NULL,
        leitura_anterior NUMERIC(10, 2) NOT NULL,
        leitura_atual NUMERIC(10, 2) NOT NULL,
        consumo_kwh NUMERIC(10, 2) NOT NULL,
        valor_estimado NUMERIC(10, 2) NOT NULL,
        data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

---

## ▶️ Executando o Projeto

Para rodar a aplicação em ambiente de desenvolvimento:

    node server.js

O servidor inicializará, sincronizará o banco de dados automaticamente e estará disponível em:

**http://localhost:3000**

---

## 👨‍💻 Autor

**Douglas Silva**

---

## 📄 Licença

Este projeto está sob a licença **MIT**.

---
