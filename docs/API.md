# API Reference - Contas a Pagar

> Gerado a partir de `src/routes/` e `src/controllers/`. Fonte: codigo real do projeto.

---

## Sumario

- [Infraestrutura](#infraestrutura)
- [Autenticacao](#autenticacao)
- [Rotas Publicas](#rotas-publicas)
- [Dashboard](#dashboard)
- [Lancamentos](#lancamentos)
- [Terceiros](#terceiros)
- [Configuracoes](#configuracoes)
- [Anotacoes e Outros](#anotacoes-e-outros)
- [Integracao Android](#integracao-android)

---

## Convencoes

| Legenda         | Significado                                     |
|-----------------|-------------------------------------------------|
| **Sessao**      | Requer `req.session.user` (cookie de sessao)    |
| **apiAuth**     | Requer header `x-api-key` ou query `token`      |
| **Publica**     | Sem autenticacao                                |

---

## Infraestrutura

Arquivo: `src/routes/infraRoutes.js`

### GET /health

Health check com status do banco.

- **Autenticacao:** Nenhuma
- **Payload:** --
- **Response 200:**
  ```json
  {
    "service": "contas-a-pagar",
    "status": "ok",
    "app": "online",
    "db": "online",
    "latency_ms": 12,
    "uptime": "5d 3h 22m 10s",
    "timestamp": "2026-07-03T12:00:00.000Z"
  }
  ```
- **Response 503** (db offline): mesmo shape, `"status": "error"`, `"db": "offline"`

### GET /ping

Ping leve.

- **Autenticacao:** Nenhuma
- **Response 200:**
  ```json
  { "status": "ok", "service": "contas-a-pagar", "timestamp": "..." }
  ```

---

## Autenticacao

Arquivo: `src/routes/authRoutes.js`

### POST /api/auth/token

Gera token persistente ("Lembrar de mim"). Revoga tokens anteriores do usuario.

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "userId": 1 }
  ```
- **Response 200:**
  ```json
  { "success": true, "token": "...", "expiresAt": "..." }
  ```
- **Response 400:** `{ "error": "userId e obrigatorio" }`

### DELETE /api/auth/token

Revoga token persistente (logout).

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "token": "..." }
  ```
- **Response 200:** `{ "success": true }`
- **Response 400:** `{ "error": "token e obrigatorio" }`

### POST /api/auth/validate

Valida token persistente. Renova automaticamente (+90 dias).

- **Autenticacao:** Nenhuma (token no body)
- **Payload:**
  ```json
  { "token": "..." }
  ```
- **Response 200:**
  ```json
  {
    "valid": true,
    "user": { "id": 1, "nome": "...", "login": "..." }
  }
  ```
- **Response 401:** `{ "valid": false, "error": "Token invalido ou expirado" }`

### GET /api/auth/me

Retorna usuario da sessao atual.

- **Autenticacao:** Sessao
- **Response 200:**
  ```json
  { "id": 1, "nome": "...", "login": "..." }
  ```
- **Response 401:** `{ "error": "Nao autenticado" }`

---

## Rotas Publicas

Arquivo: `src/routes/publicRoutes.js`

### GET /login

Renderiza pagina de login. Redireciona para `/` se ja autenticado.

- **Autenticacao:** Publica

### GET /signup

Renderiza pagina de cadastro. Redireciona para `/` se ja autenticado.

- **Autenticacao:** Publica

### POST /signup

Cria nova conta. Rate-limited (`loginLimiter`).

- **Autenticacao:** Publica (rate-limited)
- **Payload (form):**
  ```
  nome=...&login=...&password=...
  ```
- **Response:** Redirect `/` (sucesso) ou re-render `signup` com `error`

### POST /login

Processa autenticacao. Rate-limited (`loginLimiter`).

- **Autenticacao:** Publica (rate-limited)
- **Payload (form):**
  ```
  login=...&password=...&lembrar=on
  ```
- **Response:** Redirect `/` (sucesso) ou re-render `login` com `error`
- **Cookie:** Se `lembrar=on`, define `remember_me` (httpOnly, secure em prod, sameSite=lax, maxAge=90 dias)

### GET /logout

Encerra sessao e revoga token persistente se existir.

- **Autenticacao:** Publica (operacional, le `req.session.user`)
- **Response:** Redirect `/login`

### GET /contas/:tokenPublico

Portal publico de terceiro. Valida UUID v4 no param.

- **Autenticacao:** Publica (acesso via UUID)
- **Query params:** `?month=7&year=2026`
- **Response:** Render `terceiro` com `nome`, `itensFixas`, `itensCartao`, `totalFixas`, `totalCartao`, `totalGeral`, `nav`
- **Response 404:** Se tokenPublico invalido (nao-UUID) ou nao encontrado

---

## Dashboard

Arquivo: `src/routes/dashboard/dashboardRoutes.js`

### GET /

Dashboard principal. Renderiza pagina `index`.

- **Autenticacao:** Sessao
- **Query params:** `?month=7&year=2026`
- **Response:** Render `index` com `totais`, `fixas`, `cartao`, `anotacoes`, `resumoPessoas`, `nav`, `terceiros`, `totalCasa`, `configuracoes`, `mesFechado`, etc.

### GET /relatorio

Relatorio mensal agrupado por pessoa.

- **Autenticacao:** Sessao
- **Query params:** `?month=7&year=2026`
- **Response:** Render `relatorio` com `dados` (agrupado por pessoa), `mes`, `ano`, `totalGeral`, `nav`

### GET /api/dashboard/totals

Totais para atualizacao parcial sem reload.

- **Autenticacao:** Sessao
- **Query params:** `?month=7&year=2026`
- **Response 200:**
  ```json
  {
    "totalFixas": 0,
    "totalCartao": 0,
    "totalCasa": 0,
    "fixasPendente": 0,
    "cartaoPendente": 0,
    "cartaoGeral": 0,
    "resumoPessoas": [{ "pessoa": "...", "total": 0 }],
    "terceiros": [{ "nome": "...", "totalGeral": 0, "totalCartao": 0, "totalFixas": 0 }]
  }
  ```

### GET /api/dashboard/resumo

Resumo leve com cache em memoria.

- **Autenticacao:** Sessao
- **Query params:** `?month=7&year=2026`
- **Response 200:**
  ```json
  {
    "success": true,
    "data": {
      "totais": {},
      "lancamentosFixaECartao": { "rows": [] },
      "resumoPessoas": [],
      "dadosTerceiros": {},
      "auxQueries": {},
      "terceirosDistinct": []
    }
  }
  ```

---

## Lancamentos

Arquivo: `src/routes/lancamentos/lancamentosRoutes.js`

### GET /api/lancamentos/recentes

Ultimos lancamentos do usuario.

- **Autenticacao:** Sessao
- **Response 200:** Array de lancamentos

### GET /api/rendas

Detalhes de rendas do mes.

- **Autenticacao:** Sessao
- **Query params:** `?month=7&year=2026`
- **Response 200:** Array de rendas

### GET /api/cartao/:pessoa

Lancamentos de cartao filtrados por pessoa.

- **Autenticacao:** Sessao
- **Params:** `:pessoa` (nome)
- **Query params:** `?month=7&year=2026`
- **Response 200:** Array de lancamentos cartao

### POST /api/lancamentos

Cria lancamento. Suporta modo normal e bulk (multiplos terceiros).

- **Autenticacao:** Sessao
- **Payload (normal):**
  ```json
  {
    "descricao": "Internet",
    "valor": "150,00",
    "tipo_transacao": "fixa",
    "sub_tipo": "",
    "parcelas": "",
    "nome_terceiro": "Joao",
    "context_month": 7,
    "context_year": 2026
  }
  ```
- **Payload (bulk):**
  ```json
  {
    "descricao": "Internet",
    "valor": "150,00",
    "tipo_transacao": "fixa",
    "sub_tipo": "",
    "parcelas": "",
    "terceiros": ["Joao", "Maria"],
    "bulk_mode": true,
    "context_month": 7,
    "context_year": 2026
  }
  ```
- **Response 200:** `{ "success": true }` ou `{ "success": true, ...resultado }` (bulk)
- **Response 400:** Erro de validacao (classificacao, terceiro vazio)
- **Response 403:** Mes fechado

### PUT /api/lancamentos/:id

Atualiza lancamento existente.

- **Autenticacao:** Sessao
- **Params:** `:id` (ID do lancamento)
- **Payload:**
  ```json
  {
    "descricao": "Internet",
    "valor": "150,00",
    "tipo_transacao": "fixa",
    "sub_tipo": "",
    "parcelas": "",
    "nome_terceiro": "Joao"
  }
  ```
- **Response 200:** `{ "success": true }`
- **Response 400:** Erro de classificacao

### DELETE /api/lancamentos/:id

Exclui lancamento unitario.

- **Autenticacao:** Sessao
- **Params:** `:id`
- **Response 200:** `{ "success": true }`
- **Response 403:** Lancamento em mes fechado

### DELETE /api/lancamentos/lote

Exclusao em lote por array de IDs.

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "ids": [1, 2, 3] }
  ```
- **Response 200:** `{ "success": true, "deleted": 3 }`
- **Response 400:** Array vazio ou invalido
- **Response 403:** Algum item em mes fechado

### DELETE /api/lancamentos/mes

Deleta todos os lancamentos de um mes.

- **Autenticacao:** Sessao
- **Query params:** `?month=7&year=2026`
- **Response 200:** `{ "success": true }`
- **Response 403:** Mes fechado

### DELETE /api/lancamentos/pessoa/:nome

Deleta lancamentos de uma pessoa no mes.

- **Autenticacao:** Sessao
- **Params:** `:nome`
- **Query params:** `?month=7&year=2026`
- **Response 200:** `{ "success": true }`
- **Response 403:** Mes fechado

### POST /api/lancamentos/copiar

Copia lancamentos do mes atual para o proximo mes.

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "month": 7, "year": 2026 }
  ```
- **Response 200:** `{ "success": true }`
- **Response 403:** Proximo mes fechado

### POST /api/lancamentos/status-pessoa

Atualiza status em lote para todos os lancamentos de uma pessoa.

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "pessoa": "Joao", "status": "PAGO", "month": 7, "year": 2026 }
  ```
- **Response 200:** `{ "success": true }`
- **Response 400:** Mes/ano invalidos

### POST /api/lancamentos/conferido-recentes

Marca lancamentos recentes como conferidos (batch).

- **Autenticacao:** Sessao
- **Payload:** --
- **Response 200:** `{ "success": true }`

### POST /api/lancamentos/reorder

Reordena lancamentos (drag & drop).

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "itens": [{ "id": 1, "ordem": 1 }, { "id": 2, "ordem": 2 }] }
  ```
- **Response 200:** `{ "success": true }`

### POST /api/lancamentos/mover-mes

Desloca lancamentos para mes anterior ou seguinte (lote).

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "ids": [1, 2, 3], "direcao": 1 }
  ```
  `direcao`: `1` (proximo mes) ou `-1` (mes anterior)
- **Response 200:** `{ "success": true, "updated": 3 }`
- **Response 400:** Payload invalido
- **Response 403:** Mes origem ou destino fechado

### POST /api/lancamentos/dividir

Divide conta em partes iguais entre terceiros.

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "idOriginal": 42, "terceiros": ["Joao", "Maria"] }
  ```
- **Response 200:** Resultado da divisao (objeto do repositorio)
- **Response 400:** Payload invalido, nenhum terceiro valido, limite excedido (20), valor invalido
- **Response 404:** Conta nao encontrada
- **Response 409:** Conta modificada concorrentemente

### PATCH /api/lancamentos/:id/status

Atualiza status de um lancamento.

- **Autenticacao:** Sessao
- **Params:** `:id`
- **Payload:**
  ```json
  { "status": "PAGO" }
  ```
- **Response 200:** `{ "success": true }`

### PATCH /api/lancamentos/:id/conferido

Atualiza flag `conferido`.

- **Autenticacao:** Sessao
- **Params:** `:id`
- **Payload:**
  ```json
  { "conferido": true }
  ```
- **Response 200:** `{ "success": true }`

### PATCH /api/lancamentos/:id/conferido-extrato

Atualiza flag `conferidoextrato`.

- **Autenticacao:** Sessao
- **Params:** `:id`
- **Payload:**
  ```json
  { "conferido": true }
  ```
- **Response 200:** `{ "success": true }`

### POST /api/lancamentos/conferido-extrato-lote

Atualiza `conferidoextrato` em lote.

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "ids": [1, 2, 3], "conferido": true }
  ```
- **Response 200:** `{ "success": true, "updated": 3 }`
- **Response 400:** Payload invalido

---

## Terceiros

Arquivo: `src/routes/terceiros/terceirosRoutes.js`

### GET /terceiros

Dashboard de terceiros. Renderiza pagina `terceiros-dashboard`.

- **Autenticacao:** Sessao
- **Query params:** `?month=7&year=2026`
- **Response:** Render HTML com `terceiros`, `nav`, `mesFechado`, `whatsappTemplate`, `configuracoes`

### GET /api/terceiros/resumo

Resumo leve da grid de terceiros.

- **Autenticacao:** Sessao
- **Query params:** `?month=7&year=2026`
- **Response 200:**
  ```json
  { "success": true, "terceiros": [...] }
  ```

### POST /api/terceiros/telefone

Salva telefone de terceiro. Normaliza para formato internacional (55 + DDD + numero).

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "nome": "Joao", "telefone": "(51) 99999-0000" }
  ```
- **Response 200:** `{ "success": true }`
- **Nota:** Se telefone vazio/nulo, deleta registro do terceiro.

### GET /api/terceiros/:nome/token

Obtem ou gera token publico de terceiro (para compartilhamento).

- **Autenticacao:** Sessao
- **Params:** `:nome`
- **Response 200:**
  ```json
  { "token": "abc123..." }
  ```
- **Response 401:** Nao autenticado

---

## Configuracoes

Arquivo: `src/routes/configuracoes/configuracoesRoutes.js`

### POST /api/meses-fechados/toggle

Alterna status de mes fechado/aberto.

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "month": 7, "year": 2026 }
  ```
- **Response 200:**
  ```json
  { "success": true, "mesFechado": true }
  ```

### POST /api/configuracoes/whatsapp

Salva template de mensagem WhatsApp para terceiros.

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "template": "Ola {nome_terceiro}! ..." }
  ```
- **Response 200:** `{ "success": true }`

### POST /api/configuracoes

Salva configuracao generica (chave/valor).

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "chave": "divisao_casa_minimo", "valor": "750.00" }
  ```
- **Response 200:** `{ "success": true }`
- **Response 400:** `{ "error": "Chave e valor sao obrigatorios." }`

---

## Anotacoes e Outros

Arquivo: `src/routes/outros/outrosRoutes.js`

### POST /api/anotacoes

Salva anotacao do mes.

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "month": 7, "year": 2026, "conteudo": "Lembrar de..." }
  ```
- **Response 200:** `{ "success": true }`

### GET /api/anotacoes

Obtem anotacao do mes.

- **Autenticacao:** Sessao
- **Query params:** `?month=7&year=2026`
- **Response 200:**
  ```json
  { "conteudo": "Lembrar de..." }
  ```

### POST /api/fatura-manual

Salva valor de fatura manual do mes.

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "month": 7, "year": 2026, "valor": "1500,00" }
  ```
- **Response 200:** `{ "success": true }`

### POST /api/cards/reorder

Reordena cards do dashboard (drag & drop).

- **Autenticacao:** Sessao
- **Payload:**
  ```json
  { "nomes": ["Joao", "Maria", "Casa"] }
  ```
- **Response 200:** `{ "success": true }`

---

## Integracao Android

Arquivo: `src/routes/integrationRoutes.js`

### POST /api/v1/integracao/lancamentos

Cria lancamento via app Android.

- **Autenticacao:** `apiAuth` (header `x-api-key` ou query `token`)
- **Payload:**
  ```json
  {
    "usuario_id": 1,
    "descricao": "Internet",
    "valor": "150,00",
    "tipo": "fixa",
    "parcelas": "",
    "terceiro": "Joao",
    "month": 7,
    "year": 2026
  }
  ```
  - `tipo`: `"fixa"` | `"unica"` | `"parcelada"`
  - `parcelas`: `""` | `"10"` | `"1/10"`
  - `valor`: formato `"150,00"` ou `"150.50"`
- **Response 201:**
  ```json
  {
    "success": true,
    "message": "Lancamento Confirmado",
    "data": {
      "dono": "Dodo",
      "descricao": "Internet",
      "valor_formatado": "R$ 150,00",
      "quem": "Joao",
      "detalhe_tipo": "Conta Fixa"
    }
  }
  ```
- **Response 400:** Campos obrigatorios faltando, valor invalido, parcelas invalidas

### POST /api/v1/integracao/copiar-mensal

Automacao: copia contas de todos os usuarios para o mes atual. Disparada por cron externo.

- **Autenticacao:** `apiAuth` (header `x-api-key` ou query `token`)
- **Payload:** --
- **Response 200:**
  ```json
  {
    "success": true,
    "context": "7/2026",
    "resultados": [
      { "nome": "Dodo", "status": "sucesso" },
      { "nome": "Vitoria", "status": "erro", "error": "..." }
    ]
  }
  ```
- **Response 500:** Erro critico
- **Nota:** Envia notificacao via Telegram se `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` configurados.

---

## Mapa de Autenticacao

| Rota                              | Metodo  | Auth          |
|-----------------------------------|---------|---------------|
| `/health`                         | GET     | Publica       |
| `/ping`                           | GET     | Publica       |
| `/login`                          | GET     | Publica       |
| `/signup`                         | GET     | Publica       |
| `/signup`                         | POST    | Rate-limited  |
| `/login`                          | POST    | Rate-limited  |
| `/logout`                         | GET     | Publica       |
| `/contas/:tokenPublico`           | GET     | UUID publico  |
| `/api/auth/token`                 | POST    | Sessao        |
| `/api/auth/token`                 | DELETE  | Sessao        |
| `/api/auth/validate`              | POST    | Token body    |
| `/api/auth/me`                    | GET     | Sessao        |
| `/`                               | GET     | Sessao        |
| `/relatorio`                      | GET     | Sessao        |
| `/api/dashboard/totals`           | GET     | Sessao        |
| `/api/dashboard/resumo`           | GET     | Sessao        |
| `/api/lancamentos/recentes`       | GET     | Sessao        |
| `/api/rendas`                     | GET     | Sessao        |
| `/api/cartao/:pessoa`             | GET     | Sessao        |
| `/api/lancamentos`                | POST    | Sessao        |
| `/api/lancamentos/:id`            | PUT     | Sessao        |
| `/api/lancamentos/:id`            | DELETE  | Sessao        |
| `/api/lancamentos/lote`           | DELETE  | Sessao        |
| `/api/lancamentos/mes`            | DELETE  | Sessao        |
| `/api/lancamentos/pessoa/:nome`   | DELETE  | Sessao        |
| `/api/lancamentos/copiar`         | POST    | Sessao        |
| `/api/lancamentos/status-pessoa`  | POST    | Sessao        |
| `/api/lancamentos/conferido-recentes` | POST | Sessao       |
| `/api/lancamentos/reorder`        | POST    | Sessao        |
| `/api/lancamentos/mover-mes`      | POST    | Sessao        |
| `/api/lancamentos/dividir`        | POST    | Sessao        |
| `/api/lancamentos/:id/status`     | PATCH   | Sessao        |
| `/api/lancamentos/:id/conferido`  | PATCH   | Sessao        |
| `/api/lancamentos/:id/conferido-extrato` | PATCH | Sessao   |
| `/api/lancamentos/conferido-extrato-lote` | POST | Sessao   |
| `/terceiros`                      | GET     | Sessao        |
| `/api/terceiros/resumo`           | GET     | Sessao        |
| `/api/terceiros/telefone`         | POST    | Sessao        |
| `/api/terceiros/:nome/token`      | GET     | Sessao        |
| `/api/meses-fechados/toggle`      | POST    | Sessao        |
| `/api/configuracoes/whatsapp`     | POST    | Sessao        |
| `/api/configuracoes`              | POST    | Sessao        |
| `/api/anotacoes`                  | POST    | Sessao        |
| `/api/anotacoes`                  | GET     | Sessao        |
| `/api/fatura-manual`              | POST    | Sessao        |
| `/api/cards/reorder`              | POST    | Sessao        |
| `/api/v1/integracao/lancamentos`  | POST    | apiAuth       |
| `/api/v1/integracao/copiar-mensal`| POST    | apiAuth       |
