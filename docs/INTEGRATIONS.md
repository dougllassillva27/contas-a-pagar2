# Integrações Externas

> Documentação das integrações com serviços externos, APIs de terceiros e autenticação.

---

## 1. Bot Telegram

### Visão Geral

Bot interativo para lançamento de contas via chat. Usa inline keyboards (máquina de estados) para coletar campo por campo, com suporte a lançamento em lote (bulk) e validação de mês fechado.

**Biblioteca**: `node-telegram-bot-api`
**Modo**: Webhook (produção) / Polling desativado

### Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/modules/botTelegram/telegramBot.js` | Cria instância do bot, registra comandos, processa mensagens e callbacks |
| `src/modules/botTelegram/telegramRoutes.js` | Monta rotas Express do webhook |
| `src/modules/botTelegram/setupWebhook.js` | Script one-shot para registrar webhook no Telegram |
| `src/modules/botTelegram/conversationManager.js` | Máquina de estados das conversas (Map em memória) |
| `src/modules/botTelegram/messageParser.js` | Parser de mensagem no formato delimitado por `;` |
| `src/modules/botTelegram/responseFormatter.js` | Formata respostas em MarkdownV2 |

### Comandos Registrados

| Comando | Descrição |
|---------|-----------|
| `/iniciar` | Inicia novo lançamento (mostra menu de usuários) |
| `/iniciardodo` | Lançamento rápido para usuário "Dodo" |
| `/iniciarvitoria` | Lançamento rápido para usuário "Vitória" |
| `/cancelar` | Cancela lançamento em andamento |
| `/help` | Exibe ajuda e comandos disponíveis |

Aliases compatíveis: `/novo`, `/start` funcionam como `/iniciar`.

### Fluxo da Conversa (Máquina de Estados)

```
USUARIO → DESCRICAO → VALOR → TIPO → [PARCELAS] → TERCEIRO → (insere no banco)
```

1. **USUARIO** — Inline keyboard com usuários do banco
2. **DESCRICAO** — Texto livre
3. **VALOR** — Texto livre (parseado via `parseValor`)
4. **TIPO** — Inline keyboard: Fixa / Única / Parcelada
5. **PARCELAS** — Só aparece se tipo = parcelada. Formato: `10` ou `1/10`
6. **TERCEIRO** — Inline keyboard com contatos predefinidos ou texto livre com vírgulas para bulk

### Webhook

**Endpoint**: `POST /telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>`

- O secret no path atua como autenticação básica (impede payloads falsos)
- Responde `200` imediatamente (Telegram exige resposta rápida)
- Repassa `req.body` para `bot.processUpdate()`

**Setup one-shot** (após deploy):

```bash
node src/modules/botTelegram/setupWebhook.js
```

O script:
1. Remove webhook anterior (`deleteWebHook`)
2. Registra novo webhook na URL `${RENDER_EXTERNAL_URL}/telegram/webhook/${TELEGRAM_WEBHOOK_SECRET}`
3. Exibe info do webhook (URL, pending updates, último erro)

### Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `TELEGRAM_BOT_TOKEN` | Sim | Token do @BotFather. Se ausente, bot é desativado silently |
| `TELEGRAM_CHAT_ID` | Sim | Chat ID autorizado. Mensagens de outros chats são ignoradas |
| `TELEGRAM_WEBHOOK_SECRET` | Sim | Secret usado no path do webhook para autenticação |
| `RENDER_EXTERNAL_URL` | Sim (setup) | URL pública do deploy (ex: `https://contas-a-pagar-nsti.onrender.com`) |

### Segurança

- **Chat ID whitelist**: Apenas o `TELEGRAM_CHAT_ID` configurado pode interagir com o bot
- **Webhook secret**: URL do webhook contém secret aleatório — sem isso, ninguém consegue enviar updates
- **Validação de mês fechado**: Antes de inserir, verifica `repo.isMesFechado()` — se o mês estiver trancado, recusa o lançamento

### Lançamento em Lote (Bulk)

Se o campo "terceiro" contiver vírgulas (ex: `Morr,Mãe,Vô`), o bot cria uma conta para cada terceiro listado via `repo.addLancamentosBulk()`.

### Formato de Mensagem Delimitada (Legacy)

O `messageParser.js` suporta envio de conta em formato estruturado via texto:

```
usuario_id; descricao; valor; tipo; parcelas; terceiro
```

Exemplos:
```
1; Internet; R$ 100,00; fixa; ;
1; Tênis Nike; R$ 500,00; parcelada; 10; Vitoria
```

---

## 2. Banco de Dados (PostgreSQL)

**Biblioteca**: `pg` (node-postgres)

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/config/db.js` | Pool de conexão e exports do repositório |
| `src/config/db_dump.js` | Script utilitário de dump |

O bot e a API web compartilham o mesmo repositório (`repo`), que abstrai as operações SQL.

---

## 3. Widget de Lançamentos (API Externa)

**Biblioteca**: `axios`

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/modules/widgetLancamentos/api/client.js` | Cliente HTTP para comunicação com API externa |

Módulo de widget que consome API externa para exibir lançamentos. Detalhes da API alvo estão no próprio módulo.

---

## 4. Hospedagem (Render)

O projeto é deployado no **Render** como serviço web.

- URL pública exposta via `RENDER_EXTERNAL_URL` (ex: `https://contas-a-pagar-nsti.onrender.com`)
- Usada para montar a URL do webhook do Telegram
- Variável de ambiente injetada automaticamente pelo Render em runtime

---

## Resumo de Dependências Externas

| Serviço | Tipo | Biblioteca | Auth |
|---------|------|-----------|------|
| Telegram Bot API | REST API | `node-telegram-bot-api` | Bot Token + Chat ID whitelist + Webhook Secret |
| PostgreSQL | Database | `pg` | Connection string via env |
| API Widget | HTTP | `axios` | Definida no módulo |
| Render | Hosting | — | `RENDER_EXTERNAL_URL` (auto-injetada) |
