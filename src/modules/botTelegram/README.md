# 🤖 Bot Telegram — Contas a Pagar

Bot do Telegram integrado ao sistema **Contas a Pagar** para registrar lançamentos financeiros diretamente pelo chat, usando uma conversa interativa passo a passo.

---

## 📋 Visão Geral

O bot substitui o app **Atalhos HTTP** (Android) como forma de inserir lançamentos no sistema. Em vez de preencher formulários ou montar mensagens manualmente, o bot **pergunta campo por campo** usando botões inline e texto livre.

### Fluxo da Conversa

```
/novo ou qualquer mensagem
    │
    ▼
👤 Conta de quem?  ─── [🧑 Dodo] [👩 Vitória]  (botão inline)
    │
    ▼
📋 Qual a descrição?  ─── Netflix, Mercado...    (texto livre)
    │
    ▼
💰 Qual o valor?  ─── R$ 100,00 ou 100           (texto livre)
    │
    ▼
📌 Tipo de conta?  ─── [🔁 Fixa] [1️⃣ Única] [📊 Parcelada]  (botão inline)
    │
    ├── Se "Parcelada":
    │   ▼
    │   🔢 Quantas parcelas?  ─── 10 ou 1/10     (texto livre)
    │
    ▼
🏷️ Terceiro?  ─── Morr, Mãe, Davi...            (texto livre)
               ─── [⏭️ Pular (conta própria)]    (botão inline)
    │
    ▼
✅ CONTA LANÇADA COM SUCESSO
```

> **Nota:** A pergunta sobre parcelas **só aparece** quando o tipo selecionado é "Parcelada".

---

## 🗂️ Estrutura de Arquivos

```
botTelegram/
├── conversationManager.js   # Máquina de estados (controle do fluxo)
├── messageParser.js         # Parser de mensagens (formato linha única - legado)
├── responseFormatter.js     # Formatação visual das respostas
├── telegramBot.js           # Lógica principal do bot
├── telegramRoutes.js        # Rota Express para webhook
├── setupWebhook.js          # Script de configuração do webhook
└── README.md                # Este arquivo
```

### Descrição dos Módulos

| Módulo                   | Responsabilidade                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `conversationManager.js` | Máquina de estados por chat. Controla qual etapa o usuário está e avança o fluxo conforme as respostas. |
| `telegramBot.js`         | Módulo principal. Recebe mensagens e callbacks, orquestra perguntas, valida entradas e insere no banco. |
| `responseFormatter.js`   | Formata as mensagens de sucesso e erro usando MarkdownV2 do Telegram.                                   |
| `telegramRoutes.js`      | Rota Express `POST /telegram/webhook/:secret` que recebe updates do Telegram.                           |
| `setupWebhook.js`        | Script utilitário para registrar o webhook na API do Telegram.                                          |
| `messageParser.js`       | Parser do formato linha única (legado, mantido para compatibilidade).                                   |

---

## ⚙️ Configuração

### Pré-requisitos

- Node.js >= 18
- Conta no Telegram
- Bot criado via [@BotFather](https://t.me/BotFather)

### Variáveis de Ambiente

Adicione ao `.env` na raiz do projeto:

```env
# Token do bot (obtido no @BotFather)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...

# Seu Chat ID (obtido via @userinfobot)
TELEGRAM_CHAT_ID=123456789

# String aleatória para proteger a URL do webhook
TELEGRAM_WEBHOOK_SECRET=minha-string-secreta-aqui

# URL pública do servidor (Render, etc.)
RENDER_EXTERNAL_URL=https://seu-app.onrender.com
```

### Como obter o Token

1. Abra o Telegram e pesquise por `@BotFather`
2. Envie `/newbot`
3. Escolha um nome e username para o bot
4. Copie o token gerado

### Como obter o Chat ID

1. Pesquise por `@userinfobot` no Telegram
2. Envie `/start`
3. Copie o número do seu ID

### Registrar o Webhook

Após configurar as variáveis de ambiente e fazer o deploy:

```bash
npm run telegram:setup
```

Saída esperada:

```
🧹 Webhook anterior removido.
✅ Webhook registrado com sucesso!
   URL: https://seu-app.onrender.com/telegram/webhook/minha-string-secreta
```

---

## 🚀 Comandos do Bot

| Comando             | Descrição                         |
| ------------------- | --------------------------------- |
| `/novo` ou `/start` | Inicia um novo lançamento         |
| `/cancelar`         | Cancela o lançamento em andamento |
| `/help`             | Exibe a lista de comandos         |

> **Dica:** O bot ignora mensagens de texto livre caso nenhum lançamento tenha sido iniciado com `/iniciar`.

---

## 🔒 Segurança

- **Chat ID restrito:** O bot ignora mensagens de qualquer chat que não seja o `TELEGRAM_CHAT_ID` configurado.
- **Webhook protegido:** A URL do webhook inclui um `secret` no path, impedindo payloads falsos.
- **Sem polling:** Usa modo webhook (não mantém conexão persistente), compatível com servidores que desligam por inatividade (Render free).

---

## 🏗️ Arquitetura

### Fluxo de Dados

```
Telegram (usuário) → API Telegram → Webhook (Express) → telegramBot.js
                                                              │
                                         conversationManager ◄─┤
                                         parseHelpers        ◄─┤
                                                              │
                                         repo.addLancamento ──►  PostgreSQL (Neon)
                                                              │
Telegram (usuário) ◄─ API Telegram ◄─ responseFormatter ◄────┘
```

### Máquina de Estados (`conversationManager.js`)

Cada conversa é um objeto `{ etapa, dados }` armazenado em memória (Map).

```
USUARIO → DESCRICAO → VALOR → TIPO ─┬─► PARCELAS → TERCEIRO → (fim)
                                     │
                                     └─► TERCEIRO → (fim)
                                         (se tipo ≠ parcelada)
```

### Integração com o Sistema Existente

O bot reutiliza os módulos existentes do sistema:

- `src/helpers/parseHelpers.js` → `parseValor()`, `normalizarParcelasPorTipo()`
- `src/constants.js` → `STATUS`, `TIPO`
- `src/repositories/` → `repo.addLancamento()`

Nenhuma lógica de negócio foi duplicada.

---

## 🧪 Testes

Os testes ficam em `__tests__/botTelegram/`:

| Arquivo                     | Testes | Cobertura                                           |
| --------------------------- | ------ | --------------------------------------------------- |
| `messageParser.test.js`     | 16     | Conversation Manager: ciclo de vida, fluxos, etapas |
| `responseFormatter.test.js` | 9      | Formatação de sucesso, erro e escape MarkdownV2     |

Executar:

```bash
# Apenas testes do bot
npx jest __tests__/botTelegram --verbose

# Todos os testes do projeto
npm test
```

---

## 📝 Exemplo de Uso

### Conta Fixa

```
Você: /novo
Bot:  👤 Conta de quem?     → [🧑 Dodo]
Bot:  📋 Qual a descrição?  → "Internet"
Bot:  💰 Qual o valor?      → "R$ 100,00"
Bot:  📌 Tipo de conta?     → [🔁 Fixa]
Bot:  🏷️ Terceiro?          → [⏭️ Pular]

Bot:  🏦 Contas a Pagar - Lançamentos
      ✅ CONTA LANÇADA COM SUCESSO
      👤 Usuário: Dodo
      📋 Descrição: Internet
      💰 Valor: R$ 100,00
      📌 Tipo: Conta Fixa
      🏷️ Terceiro: —
```

### Conta Parcelada

```
Você: /novo
Bot:  👤 Conta de quem?     → [👩 Vitória]
Bot:  📋 Qual a descrição?  → "Tênis Nike"
Bot:  💰 Qual o valor?      → "R$ 500,00"
Bot:  📌 Tipo de conta?     → [📊 Parcelada]
Bot:  🔢 Quantas parcelas?  → "10"
Bot:  🏷️ Terceiro?          → "Morr"

Bot:  🏦 Contas a Pagar - Lançamentos
      ✅ CONTA LANÇADA COM SUCESSO
      👤 Usuário: Vitória
      📋 Descrição: Tênis Nike
      💰 Valor: R$ 500,00
      📌 Tipo: Parcelado 1/10
      🏷️ Terceiro: Morr
```

---

## 🐛 Troubleshooting

| Problema                    | Solução                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| Bot não responde            | Verifique se `TELEGRAM_BOT_TOKEN` está correto no `.env` do Render |
| Webhook não registra        | Execute `npm run telegram:setup` após o deploy                     |
| "Mensagem ignorada" no log  | O `TELEGRAM_CHAT_ID` não confere com o seu ID                      |
| Demora na primeira mensagem | Normal no Render free (~30s para acordar o servidor)               |
| Erro de parcelas            | Envie no formato `10` ou `1/10` (total >= 2)                       |
