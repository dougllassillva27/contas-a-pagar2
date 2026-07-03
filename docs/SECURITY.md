# SECURITY.md — Documentação de Segurança

> Fonte: código real do projeto (commit `590e076`). Última atualização: 2026-07-03.

---

## 1. Autenticação

### 1.1 Senhas — bcrypt

- **Biblioteca:** `bcrypt@^5.1.1`
- **Custo (rounds):** 10
- **Arquivos:** `src/routes/publicRoutes.js` (linhas 53, 87-101)
- **Fluxo:**
  - **Cadastro (`POST /signup`):** senha em texto puro é hasheada com `bcrypt.hash(password, 10)` antes de persistir no campo `Usuarios.SenhaHash`.
  - **Login (`POST /login`):** comparação via `bcrypt.compare(passwordDigitada, user.senhahash)`.
  - **Mitigação de Timing Attack (User Enumeration):** quando o login não existe no banco, executa `bcrypt.compare` contra um hash dummy (`$2b$10$...`) para manter tempo de resposta constante e evitar enumeração de usuários por diferença de latência.

### 1.2 Sessão — express-session

- **Biblioteca:** `express-session@^1.19.0`
- **Configuração:** `src/app.js` (linhas 69-81)

| Parâmetro         | Valor                                      |
|-------------------|--------------------------------------------|
| `secret`          | `process.env.SESSION_SECRET` (obrigatório em produção; fallback `crypto.randomBytes(32)` em dev) |
| `resave`          | `false`                                    |
| `saveUninitialized` | `true`                                   |
| `cookie.secure`   | `true` em produção (HTTPS via Render)      |
| `cookie.httpOnly` | `true` (previne acesso via JavaScript/XSS) |
| `cookie.sameSite` | `strict`                                   |
| `cookie.maxAge`   | `24 * 60 * 60 * 1000` (24 horas)          |
| `trust proxy`     | `1` (necessário para cookies Secure atrás do proxy do Render) |

### 1.3 Tokens Persistentes — "Lembrar de mim"

- **Arquivos:** `src/repositories/TokenRepository.js`, `src/routes/authRoutes.js`, `src/routes/publicRoutes.js` (linhas 111-128)
- **Geração:** `crypto.randomBytes(32).toString('hex')` (64 caracteres hexadecimais)
- **Armazenamento:** hash SHA-256 do token bruto é persistido na tabela `TokensPersistentes`; o valor bruto é enviado ao cliente como cookie `remember_me`.
- **Expiração:** 90 dias, com renovação automática a cada validação.
- **Cookie:** `httpOnly: true`, `secure: true` (produção), `sameSite: 'lax'`, `maxAge: 90 dias`.
- **Revogação:** ao criar novo token, todos os tokens antigos do usuário são revogados (um token ativo por dispositivo). Logout revoga o token corrente.
- **Limpeza:** função `limparTokensExpirados()` para manutenção de tokens vencidos.

### 1.4 JWT

**Não utilizado.** O projeto não emprega JWT em nenhum fluxo de autenticação.

### 1.5 API Token (Integração M2M)

- **Configuração:** `process.env.API_TOKEN` (obrigatório em produção)
- **Mecanismo:** comparação estática contra header `x-api-key` ou query param `token`
- **Arquivo:** `src/middlewares/auth.js` — função `createApiAuth()`
- **Validação cruzada:** emite warning se `API_TOKEN === SESSION_SECRET`

---

## 2. Autorização

### 2.1 Middleware de Sessão (`authMiddleware`)

- **Arquivo:** `src/middlewares/auth.js` (linhas 8-45)
- **Fluxo em 3 camadas:**
  1. Verifica `req.session.user` (sessão ativa).
  2. Se sem sessão, tenta recuperar cookie `remember_me` e reidrata a sessão via `TokenRepository.validarToken()`.
  3. Se nenhum dos dois, redireciona para `/login`.
- **Protege:** todas as rotas do dashboard, CRUD, APIs internas e módulo Calcular Luz.

### 2.2 Autenticação Híbrida (`createAuthHybrid`)

- **Arquivo:** `src/middlewares/auth.js` (linhas 63-72)
- **Uso:** rotas acessíveis tanto por sessão web quanto por API token (ex: `/dataHora`).
- **Fluxo:** verifica API token primeiro (M2M); se ausente, faz fallback transparente para `authMiddleware` (sessão web).

### 2.3 Portal Público de Terceiros

- **Arquivo:** `src/routes/publicRoutes.js` (linhas 172-254)
- **Mecanismo:** acesso via UUID v4 público (`/contas/:tokenPublico`), sem autenticação.
- **Isolamento de dados:** query filtra lançamentos por `usuario_id` vinculado ao token, impedindo vazamento cruzado entre usuários.

### 2.4 Rotas Protegidas vs. Públicas

| Rota                          | Autenticação         |
|-------------------------------|----------------------|
| `/login`, `/signup`           | Pública              |
| `/contas/:tokenPublico`       | Pública (UUID)       |
| `/api/integration/*`          | API Token (`x-api-key`) |
| `/telegram/*`                 | Webhook (sem auth de sessão) |
| `/dataHora`                   | Híbrida (sessão ou API Token) |
| `/calcularLuz-v2/*`           | Sessão (`authMiddleware`) |
| `/api/*`                      | Sessão + Rate Limiter |
| Todo o dashboard              | Sessão (`authMiddleware`) |

---

## 3. Helmet (HTTP Headers)

- **Biblioteca:** `helmet@^7.1.0`
- **Configuração:** `src/app.js` (linha 60)

```javascript
app.use(helmet({ contentSecurityPolicy: false }));
```

- **Headers ativos:** todos os defaults do Helmet exceto CSP (desabilitado para compatibilidade com templates EJS que usam inline scripts).
- **Headers fornecidos:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-DNS-Prefetch-Control`, `X-Download-Options`, `X-Permitted-Cross-Domain-Policies`, `Referrer-Policy`, `X-XSS-Protection`, `Strict-Transport-Security` (em produção via proxy).

---

## 4. Compression

- **Biblioteca:** `compression@^1.8.1`
- **Configuração:** `src/app.js` (linha 59)
- **Efeito:** compressão gzip/deflate de todas as respostas HTTP, reduzindo bandwidth e tempo de carregamento.

---

## 5. Proteção Contra Ataques

### 5.1 Rate Limiting (Brute-Force e DoS)

- **Biblioteca:** `express-rate-limit@^7.5.0`
- **Arquivo:** `src/middlewares/rateLimiter.js`

| Limiter          | Janela   | Limite | Aplicação                          |
|------------------|----------|--------|------------------------------------|
| `loginLimiter`   | 15 min   | 5 req  | `POST /login`, `POST /signup`      |
| `apiLimiter`     | 15 min   | 200 req | Todas as rotas `/api/*` (dashboard) |

- **Headers padrão:** `RateLimit-*` (RFC draft) habilitados; headers legados (`X-RateLimit-*`) desabilitados.

### 5.2 Timing Attack (User Enumeration)

- **Arquivo:** `src/routes/publicRoutes.js` (linhas 80-102)
- **Mecanismo:** hash dummy bcrypt executado quando usuário não existe, equalizando tempo de resposta entre "usuário não existe" e "senha incorreta".

### 5.3 DoS por Payload Massivo

- **Arquivo:** `src/app.js` (linhas 62-63)

```javascript
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
```

- **Limite:** 100KB para body JSON e form-urlencoded. Requisições acima retornam 413 automaticamente.

### 5.4 XSS (Cross-Site Scripting)

- **Cookie `httpOnly`:** session e `remember_me` inacessíveis via `document.cookie`.
- **Helmet:** headers `X-XSS-Protection` e `X-Content-Type-Options` ativos.

### 5.5 CSRF (Cross-Site Request Forgery)

- **Cookie `sameSite: strict`** na sessão principal (bloqueia envio em contextos cross-site).
- **Cookie `sameSite: lax`** no `remember_me` (permite GET cross-site para redirecionamentos pós-login, mas bloqueia POST cross-site).

### 5.6 SQL Injection

- **Proteção:** todas as queries ao PostgreSQL (`pg@^8.18.0`) usam parâmetros posicionais (`$1`, `$2`, ...), nunca interpolação direta de strings do usuário.

### 5.7 Vazamento de Dados em Logs

- **Arquivo:** `src/middlewares/logger.js`
- **Regra:** logger de requisições **não** registra corpo da requisição (previne exposição de senhas em logs).
- **Login:** logs de tentativa registram apenas IP e resultado (sucesso/falha), nunca a senha digitada.

### 5.8 Error Handler Global

- **Arquivo:** `src/app.js` (linhas 125-134)
- **Comportamento:** exceções não tratadas retornam payload JSON estruturado para rotas API e HTML mínimo para demais. Stack trace é logado no servidor mas **não** exposto ao cliente.

---

## 6. Validação de Input

### 6.1 Cadastro e Login

- **Arquivo:** `src/routes/publicRoutes.js`
- **Campos:** `nome`, `login`, `password` — todos passam por `.trim()` antes de processar.
- **Login:** normalizado para `.toLowerCase()`.
- **Campos obrigatórios:** validação de presença antes de qualquer operação de banco.

### 6.2 Portal Público (UUID)

- **Arquivo:** `src/routes/publicRoutes.js` (linhas 178-183)
- **Validação:** regex estrita de UUID v4 (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`).
- **Falha:** retorna 404 genérico (não revela se o token existe ou não).

### 6.3 Body Parser Limits

- **JSON:** limite de 100KB (`express.json({ limit: '100kb' })`).
- **URL-encoded:** limite de 100KB (`express.urlencoded({ limit: '100kb' })`).

### 6.4 API Token Auth

- **Arquivo:** `src/middlewares/auth.js`
- **Validação:** presença e comparação exata do token. Requisições sem token ou com token incorreto retornam 401.

---

## 7. Segurança de Sessão

| Aspecto               | Implementação                                                    |
|-----------------------|------------------------------------------------------------------|
| **Secret**            | `SESSION_SECRET` via env var (obrigatório em produção; `process.exit(1)` se ausente) |
| **Fallback dev**      | `crypto.randomBytes(32).toString('hex')` (gerado em runtime, não persistente) |
| **Duração**           | 24 horas (sessão) / 90 dias (token persistente)                  |
| **Renovação**         | Sessão não renova automaticamente; token persistente renova a cada validação |
| **Revogação**         | Logout destrói sessão + revoga token persistente no banco        |
| **Single-token**      | Apenas 1 token persistente ativo por usuário (antigos revogados) |
| **Transporte**        | `secure: true` em produção (HTTPS), `httpOnly: true`, `sameSite` configurado |
| **Proxy**             | `trust proxy: 1` para cookies Secure atrás do Render             |
| **Armazenamento DB**  | Tokens persistidos como hash SHA-256 (nunca em texto puro)       |

---

## 8. Variáveis de Ambiente Críticas

| Variável           | Obrigatória em Produção | Função                                    |
|--------------------|:-----------------------:|-------------------------------------------|
| `SESSION_SECRET`   | Sim                     | Secret de assinatura de cookies de sessão |
| `API_TOKEN`        | Sim                     | Token de autenticação M2M (integrações)   |
| `NODE_ENV`         | Recomendado             | Define comportamento production/development |
| `DATABASE_URL`     | Sim                     | Conexão PostgreSQL                        |

**Validação no boot** (`src/app.js` linhas 39-47):
- Em produção, ausência de `SESSION_SECRET` ou `API_TOKEN` causa `process.exit(1)`.
- `API_TOKEN === SESSION_SECRET` emite warning (reduzir superfície de ataque).

---

## 9. Dependências de Segurança

| Pacote               | Versão   | Função                                    |
|----------------------|----------|-------------------------------------------|
| `bcrypt`             | `^5.1.1` | Hashing de senhas (custo 10)              |
| `helmet`             | `^7.1.0` | Hardening de headers HTTP                 |
| `compression`        | `^1.8.1` | Compressão gzip/deflate                   |
| `express-rate-limit` | `^7.5.0` | Rate limiting por IP                      |
| `express-session`    | `^1.19.0` | Gerenciamento de sessão server-side      |
| `cookie-parser`      | `^1.4.7` | Parse de cookies (token persistente)      |
| `crypto` (stdlib)    | built-in | Geração de tokens e hashing SHA-256       |
