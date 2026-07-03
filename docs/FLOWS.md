# Fluxos do Sistema - Contas a Pagar

Documentação técnica baseada no código real do projeto.

---

## 1. Login & Autenticação

**Arquivo**: `src/routes/publicRoutes.js`

### GET /login
Renderiza página login. Se usuário já autenticado (sessão ativa), redireciona para `/`.

### POST /login
**Fluxo**:
1. Rate limiter aplica proteção contra brute force (`loginLimiter`)
2. Valida campos: `login` (ou `username`) + `password`
3. Busca usuário no banco via `repo.obterUsuarioPorLogin(login)`
4. Compara hash bcrypt (`bcrypt.compare`)
5. **Proteção Timing Attack**: Se usuário não existe, executa `bcrypt.compare` contra dummy hash (custo 10) para evitar user enumeration
6. Se credenciais válidas:
   - Cria sessão: `req.session.user = { id, nome, login }`
   - Se checkbox "Lembrar de mim" marcado:
     - Gera token persistente via `repo.criarToken(userId, 90)` (90 dias validade)
     - Set cookie `remember_me` com flags: `httpOnly`, `secure` (production), `sameSite: 'lax'`
   - Redireciona para `/`
7. Se inválido: Renderiza login com erro "Senha incorreta!"

### GET /logout
**Fluxo**:
1. Se cookie `remember_me` existe:
   - Revoga token via `repo.revogarToken(token)`
   - Limpa cookie
2. Destrói sessão: `req.session.destroy()`
3. Redireciona para `/login`

---

## 2. Autenticação Persistente (Tokens)

**Arquivo**: `src/routes/authRoutes.js`

### POST /api/auth/token
Gera token persistente para "Lembrar de mim".

**Fluxo**:
1. Recebe `userId`
2. Revoga tokens antigos do usuário (um token ativo por dispositivo)
3. Cria novo token via `TokenRepository.criarToken(userId, 90)`
4. Retorna `{ token, expiresAt }`

### POST /api/auth/validate
Valida token persistente (auto-login).

**Fluxo**:
1. Recebe `token`
2. Valida via `TokenRepository.validarToken(token)`
3. Se válido:
   - Renova automaticamente por mais 90 dias (`TokenRepository.renovarToken`)
   - Retorna `{ valid: true, user: { id, nome, login } }`
4. Se inválido/expirado: Retorna 401 `{ valid: false }`

### DELETE /api/auth/token
Revoga token (logout explícito).

### GET /api/auth/me
Retorna usuário da sessão atual. Se não autenticado, retorna 401.

---

## 3. Cadastro

**Arquivo**: `src/routes/publicRoutes.js`

### GET /signup
Renderiza página cadastro. Se já autenticado, redireciona para `/`.

### POST /signup
**Fluxo**:
1. Rate limiter aplica proteção (`loginLimiter`)
2. Valida campos obrigatórios: `nome`, `login`, `password`
3. Normaliza login para lowercase
4. Verifica se login já existe via `repo.obterUsuarioPorLogin(login)`
5. Se existe: Renderiza signup com erro "Este login já está em uso."
6. Se não existe:
   - Gera hash bcrypt (custo 10): `bcrypt.hash(password, 10)`
   - Cria usuário via `repo.criarUsuario(nome, login, hash)`
   - Auto-login: Cria sessão `req.session.user`
   - Redireciona para `/`

---

## 4. CRUD Lançamentos (Contas/Pagamentos)

**Arquivo**: `src/routes/lancamentos/lancamentosRoutes.js`

### GET /api/lancamentos/recentes
Retorna últimos lançamentos do usuário via `repo.getUltimosLancamentos(userId)`.

### GET /api/rendas
Retorna detalhes de rendas por mês/ano.

**Query params**: `month`, `year` (opcionais, default: mês atual)

### GET /api/cartao/:pessoa
Retorna lançamentos de cartão filtrados por pessoa (terceiro).

**Query params**: `month`, `year`

### POST /api/lancamentos
Cria novo lançamento. Suporta 3 modos:

#### Modo Normal (lançamento único)
**Fluxo**:
1. Valida se mês está fechado via `repo.isMesFechado(userId, month, year)`. Se fechado, retorna 403.
2. Classifica lançamento via `classificarLancamento({ tipo_transacao, sub_tipo, parcelas })`:
   - Normaliza `tipo` (FIXA, CARTAO, etc)
   - Normaliza `categoria`
   - Normaliza `status` (PENDENTE, PAGO)
   - Extrai `parcelaAtual`, `totalParcelas`
3. Cria `dataBase` = dia 10 do mês/ano
4. Parse valor via `parseValor(valor)` (converte vírgula para ponto)
5. Insere via `repo.addLancamento(userId, dados)`
6. **Sync Assíncrono** (fire-and-forget via `setImmediate`):
   - Busca configurações do usuário
   - Se tem `regras_sync`, executa `syncService.executarSincronizacaoDinamica`
7. Invalida cache dashboard
8. Retorna `{ success: true }`

#### Modo Bulk (lançamento em massa para múltiplos terceiros)
**Payload**: `bulk_mode: true`, `terceiros: ["Nome1", "Nome2"]`

**Fluxo**:
1. Valida mês fechado
2. Classifica lançamento (mesma lógica modo normal)
3. Filtra terceiros vazios e remove duplicados
4. Insere em lote via `repo.addLancamentosBulk(userId, dadosBase, terceirosUnicos)`
5. Sync assíncrono (mesma lógica)
6. Retorna `{ success: true, ...resultado }`

#### Modo Fallback (detecção automática de vírgulas)
Se `nome_terceiro` contém vírgula e resulta em múltiplos nomes:
- Converte para array
- Executa bulk automaticamente

### PUT /api/lancamentos/:id
Atualiza lançamento existente.

**Fluxo**:
1. Classifica lançamento (mesma lógica POST)
2. Atualiza via `repo.updateLancamento(userId, id, dados)`
3. Busca lançamento atualizado para extrair mês/ano
4. Invalida cache dashboard para aquele mês
5. Retorna `{ success: true }`

### DELETE /api/lancamentos/:id
Deleta lançamento único.

**Fluxo**:
1. Busca lançamento via `repo.getLancamento(userId, id)`
2. Extrai mês/ano da `datavencimento`
3. Valida se mês está fechado. Se fechado, retorna 403.
4. Deleta via `repo.deleteLancamento(userId, id)`
5. Invalida cache dashboard
6. Retorna `{ success: true }`

### DELETE /api/lancamentos/lote
Deleta múltiplos lançamentos por array de IDs.

**Fluxo**:
1. Valida payload: `{ ids: [1, 2, 3] }`
2. Busca mês/ano de cada lançamento via `repo.getMesesAnosPorIds(userId, ids)`
3. Valida se algum mês está fechado. Se sim, retorna 403.
4. Deleta em lote via `repo.deleteLancamentosEmLote(userId, ids)`
5. Invalida cache dashboard
6. Retorna `{ success: true, deleted: count }`

### DELETE /api/lancamentos/mes
Deleta todos lançamentos de um mês.

**Query params**: `month`, `year`

**Fluxo**:
1. Valida se mês está fechado. Se fechado, retorna 403.
2. Deleta via `repo.deleteMonth(userId, month, year)`
3. Invalida cache dashboard
4. Retorna `{ success: true }`

### DELETE /api/lancamentos/pessoa/:nome
Deleta todos lançamentos de uma pessoa (terceiro) em um mês.

**Query params**: `month`, `year`

### POST /api/lancamentos/copiar
Copia lançamentos de um mês para o próximo.

**Fluxo**:
1. Recebe `month`, `year` no body
2. Calcula próximo mês (month+1, se >12 vira janeiro ano seguinte)
3. Valida se mês destino está fechado. Se fechado, retorna 403.
4. Copia via `repo.copyMonth(userId, currentMonth, currentYear)`
5. Invalida cache dashboard para ambos meses (origem e destino)
6. **Sync assíncrono** (background via `setImmediate`):
   - Busca configurações
   - Executa `executarSincronizacaoDinamica` para mês destino
7. Retorna `{ success: true }`

### POST /api/lancamentos/mover-mes
Move lançamentos para mês anterior ou seguinte.

**Payload**: `{ ids: [1,2,3], direcao: -1 | 1 }`

**Fluxo**:
1. Valida payload: `direcao` deve ser -1 (anterior) ou 1 (próximo)
2. Para cada lançamento:
   - Valida se mês origem está fechado
   - Calcula mês destino (mes + offset)
   - Valida se mês destino está fechado
   - Se algum bloqueio, retorna 403
3. Move via `repo.moverLancamentosMes(userId, ids, offset)`
4. Invalida cache dashboard
5. Retorna `{ success: true, updated: count }`

### POST /api/lancamentos/dividir
Divide conta entre múltiplos terceiros.

**Payload**: `{ idOriginal: 123, terceiros: ["Nome1", "Nome2"] }`

**Fluxo**:
1. Valida payload
2. Chama `repo.dividirConta(userId, idOriginal, terceiros)`
3. **Tratamento de erros específicos**:
   - `CONTA_NAO_ENCONTRADA` → 404
   - `NENHUM_TERCEIRO_VALIDO` → 400
   - `LIMITE_TERCEIROS_EXCEDIDO` → 400 (máx 20 terceiros)
   - `VALOR_INVALIDO` → 400 (valor deve ser > 0)
   - `CONTA_MODIFICADA_CONCORRENTE` → 409 (conflito)
4. Retorna resultado da divisão

### PATCH /api/lancamentos/:id/status
Atualiza status de lançamento (PENDENTE, PAGO).

**Payload**: `{ status: "PAGO" }`

**Fluxo**:
1. Atualiza via `repo.updateStatus(userId, id, status)`
2. Invalida cache dashboard totais
3. Retorna `{ success: true }`

### PATCH /api/lancamentos/:id/conferido
Marca lançamento como conferido.

**Payload**: `{ conferido: true | false }`

### PATCH /api/lancamentos/:id/conferido-extrato
Marca lançamento como conferido no extrato.

### POST /api/lancamentos/conferido-extrato-lote
Marca múltiplos lançamentos como conferidos no extrato.

**Payload**: `{ ids: [1,2,3], conferido: true }`

### POST /api/lancamentos/status-pessoa
Atualiza status de todos lançamentos de uma pessoa em um mês.

**Payload**: `{ pessoa: "Nome", status: "PAGO", month: 7, year: 2026 }`

### POST /api/lancamentos/conferido-recentes
Marca lançamentos recentes como conferidos em lote.

### POST /api/lancamentos/reorder
Reordena lançamentos (drag & drop).

**Payload**: `{ itens: [{ id: 1, ordem: 1 }, { id: 2, ordem: 2 }] }`

---

## 5. CRUD Terceiros

**Arquivo**: `src/routes/terceiros/terceirosRoutes.js`

### GET /terceiros
Dashboard de terceiros (página principal).

**Fluxo**:
1. Calcula contexto navegação (mês/ano) via `calcularContextoNavegacao(req.query)`
2. Busca em paralelo:
   - `repo.getDadosTerceiros(userId, month, year)` - lançamentos de terceiros
   - `repo.isMesFechado(userId, month, year)` - status fechamento
   - `repo.getConfiguracoes(userId)` - configurações usuário
3. Monta mapa de terceiros via `montarMapaTerceiros(dadosTerceirosRaw, userName)`:
   - Agrupa por nome de terceiro
   - Calcula totais (fixas + cartão)
4. Filtra terceiros com movimento no mês
5. **Bulk UPSERT** de terceiros na tabela `terceiros`:
   - Garante registro de todos terceiros encontrados
   - Usa `INSERT ... ON CONFLICT DO NOTHING`
6. Busca info adicional (telefone, token_publico) via query direta
7. Aplica template WhatsApp das configurações
8. Ordena alfabeticamente
9. Renderiza view `terceiros-dashboard`

### GET /api/terceiros/resumo
Retorna resumo leve da grid de terceiros (para soft refresh).

**Query params**: `month`, `year`

### POST /api/terceiros/telefone
Salva telefone de terceiro.

**Payload**: `{ nome: "Fulano", telefone: "(11) 99999-9999" }`

**Fluxo**:
1. Limpa telefone (remove caracteres não numéricos)
2. Adiciona prefixo Brasil (55) se 10 ou 11 dígitos
3. Se telefone vazio: Deleta registro da tabela `terceiros`
4. Se válido: UPSERT via `INSERT ... ON CONFLICT DO UPDATE`
5. Retorna `{ success: true }`

### GET /api/terceiros/:nome/token
Obtém token público de terceiro para compartilhamento.

**Fluxo**:
1. Verifica se terceiro já tem `token_publico`
2. Se não tem:
   - Gera token via `crypto.randomBytes(16).toString('hex')`
   - Atualiza no banco
3. Retorna `{ token }`

### GET /contas/:tokenPublico (Portal Público)
**Arquivo**: `src/routes/publicRoutes.js`

Portal público para terceiros visualizarem suas contas (sem autenticação).

**Fluxo**:
1. Valida formato UUID v4 no `tokenPublico` (regex). Se inválido, retorna 404.
2. Busca terceiro na tabela via `token_publico`
3. Se não encontrado, retorna 404 "Link Revogado"
4. Extrai `usuario_id` e `nome` do terceiro
5. Calcula contexto navegação (mês/ano)
6. Busca lançamentos do terceiro via `repo.getLancamentosTerceiro(userId, nome, month, year)`
7. Agrupa por tipo (FIXA, CARTAO)
8. Calcula totais
9. Renderiza view `terceiro` (página pública read-only)

---

## 6. Dashboard & Navegação

**Arquivo**: `src/routes/dashboard/dashboardRoutes.js`

### GET / (Dashboard Principal)
**Fluxo**:
1. Calcula contexto navegação via `calcularContextoNavegacao(req.query)`:
   - Extrai `month`, `year` de query params
   - Calcula mês anterior/próximo para navegação
   - Retorna `{ month, year, nav: { atual, ant, prox } }`
2. Busca configurações via `repo.getConfiguracoes(userId)`
3. Busca dados completos via `repo.getDashboardDataModular(userId, month, year, userName)`:
   - `totais` - totais gerais
   - `fixas` - contas fixas
   - `cartao` - contas cartão
   - `anotacoes` - anotações do mês
   - `resumoPessoas` - resumo por pessoa
   - `dadosTerceirosRaw` - dados brutos terceiros
   - `ordemCardsRaw` - ordem customizada cards
   - `faturaManualVal` - fatura manual
   - `mesFechado` - status fechamento
   - `terceirosDistinct` - lista terceiros distintos
4. Monta mapa terceiros via `montarMapaTerceiros`
5. Ordena terceiros via `ordenarTerceiros` (respeita ordem customizada)
6. Calcula `totalCasa` (terceiro "Casa")
7. **Sync Automático** (background via `setImmediate`):
   - Condição: `temDados && configuracoes.regras_sync.length > 0`
   - Executa `syncService.executarSincronizacaoDinamica`
8. Renderiza view `index` com todos dados
9. Log de performance (dev): tempo total, tempo render

### GET /relatorio
Relatório mensal agrupado por pessoa.

**Query params**: `month`, `year`

**Fluxo**:
1. Busca relatório via `repo.getRelatorioMensal(userId, month, year)`
2. Agrupa por pessoa (terceiro ou usuário)
3. Calcula totais por pessoa e geral
4. Formata nome mês (capitalizado)
5. Renderiza view `relatorio`

### GET /api/dashboard/totals
Retorna totais para atualização parcial (sem reload).

**Query params**: `month`, `year`

**Fluxo**:
1. Busca em paralelo:
   - `repo.getDashboardTotals`
   - `repo.getLancamentosPorTipo('FIXA')`
   - `repo.getLancamentosPorTipo('CARTAO')`
   - `repo.getResumoPessoas`
   - `repo.getDadosTerceiros`
2. Monta mapa terceiros
3. Calcula:
   - `totalCasa`
   - `fixasPendente` (soma PENDENTE)
   - `cartaoPendente` (soma PENDENTE)
   - `cartaoGeral` (soma resumo pessoas)
4. Retorna JSON com totais + arrays

### GET /api/dashboard/resumo
Endpoint JSON para soft refresh rápido (com cache).

**Query params**: `month`, `year`

**Fluxo**:
1. Monta cache key: `${userId}-${month}-${year}`
2. Verifica cache via `resumoCache.get(userId, month, year)`
3. Se cache HIT: Retorna dados cacheados
4. Se cache MISS:
   - Busca via `repo.getDashboardDataModular`
   - Monta response structure
   - Salva no cache via `resumoCache.set`
   - Retorna JSON

---

## 7. Bot Telegram

**Arquivo**: `src/modules/botTelegram/telegramBot.js`

### Criação do Bot
**Função**: `criarBot({ token, chatIdPermitido, repo })`

**Fluxo**:
1. Cria instância `TelegramBot` com polling desativado
2. Registra comandos no menu nativo Telegram:
   - `/iniciar` - Iniciar novo lançamento
   - `/iniciardodo` - Lançamento rápido Dodo
   - `/iniciarvitoria` - Lançamento rápido Vitória
   - `/cancelar` - Cancelar lançamento
   - `/help` - Ajuda
3. Configura handlers:
   - `bot.on('message')` - Mensagens texto
   - `bot.on('callback_query')` - Cliques em botões inline
4. **Proteção**: Valida `chatId` contra `chatIdPermitido` (apenas usuário autorizado)

### Fluxo Conversa Interativa

#### Comando /iniciar (ou /novo, /start)
**Fluxo**:
1. Inicia conversa via `iniciarConversa(chatId)`
2. Busca todos usuários via `repo.getTodosUsuarios()`
3. Se argumento fornecido (ex: `/iniciar dodo`):
   - Busca usuário por nome ou ID
   - Se encontrado:
     - Salva `usuarioId` e `nomeUsuario` na conversa
     - Avança para próxima etapa
   - Se não encontrado:
     - Envia menu de seleção usuário
4. Se sem argumento:
   - Envia menu de seleção usuário (inline keyboard)

#### Comando /iniciardodo, /iniciarvitoria
Atalhos para lançamento rápido.

**Fluxo**:
1. Parse comando: extrai nome após `/iniciar`
2. Executa mesma lógica `/iniciar` com argumento

#### Processamento Texto Livre
**Função**: `processarTexto(bot, chatId, texto, repo)`

**Fluxo**:
1. Obtém conversa ativa via `obterConversa(chatId)`
2. Se não há conversa:
   - Envia menu principal
   - Remove teclado antigo (cleanup)
3. Se há conversa:
   - Identifica etapa atual (`conversa.etapa`)
   - Processa resposta baseado na etapa:

**Etapas**:
- `ETAPAS.USUARIO` - Seleção usuário (inline keyboard)
- `ETAPAS.DESCRICAO` - Texto livre (descrição conta)
- `ETAPAS.VALOR` - Texto livre (valor, parse via `parseValor`)
- `ETAPAS.TIPO` - Seleção tipo (inline: Fixa, Cartão)
- `ETAPAS.PARCELAS` - Seleção parcelas (inline: 1x, 2x, 3x...)
- `ETAPAS.TERCEIRO` - Seleção terceiro (inline keyboard com terceiros frequentes)

#### Processamento Callback Query
**Função**: `processarCallback(bot, chatId, query, repo)`

**Fluxo**:
1. Extrai `callback_data` do clique
2. Parse formato: `etapa:valor` (ex: `tipo:FIXA`, `parcelas:3`)
3. Avança conversa via `avancarConversa(chatId, campo, valor)`
4. Envia próxima pergunta via `enviarPergunta`

#### Finalização Lançamento
Quando todas etapas completas:

**Fluxo**:
1. Obtém dados acumulados da conversa
2. Classifica lançamento via `classificarLancamento`
3. Cria `dataBase` = dia 10 do mês atual
4. Insere via `repo.addLancamento(userId, dados)`
5. Formata mensagem sucesso via `formatarSucesso` ou `formatarSucessoBulk`
6. Finaliza conversa via `finalizarConversa(chatId)`
7. Envia mensagem sucesso
8. Envia menu principal para novo lançamento

#### Comando /cancelar
**Fluxo**:
1. Cancela conversa via `cancelarConversa(chatId)`
2. Envia mensagem "Lançamento cancelado"
3. Envia menu principal

---

## 8. Processamentos Assíncronos (Sync Service)

**Arquivo**: `src/services/syncService.js`

### Motor de Sincronização Dinâmica
**Função**: `executarSincronizacaoDinamica(repo, userId, month, year, regras)`

**Características**:
- **Mutex global**: Evita execuções concorrentes para mesmo usuário/mês/ano
- **Fire-and-forget**: Executado via `setImmediate` (não bloqueia response)
- **Baseado em regras**: Processa array de regras declarativas (JSONB)

**Fluxo**:
1. Cria mutex key: `${userId}:${month}:${year}`
2. Se já tem sync rodando para esta key, retorna imediatamente
3. Cria promise e registra no Map `_syncPromises`
4. Itera sobre array `regras`:
   - Se `regra.ativo === false`, pula
   - Executa handler baseado em `regra.tipo`
5. Libera mutex e resolve promise

### Tipos de Regras

#### COPIAR_CONTAS
Copia total de cartão de um terceiro para conta fixa de outro usuário.

**Config**:
```json
{
  "tipo": "COPIAR_CONTAS",
  "ativo": true,
  "terceiroOrigem": "Morr",
  "usuarioDestino": 2,
  "contaDestino": "Cartão Douglas"
}
```

**Fluxo**:
1. Busca total cartão do terceiro origem via `repo.getTotalTerceiroCartao(terceiroOrigem, sourceUserId, month, year)`
2. Cria/atualiza conta fixa no usuário destino via `repo.findAndUpdateOrCreateContaFixa(usuarioDestino, contaDestino, total, month, year)`

**Caso de uso**: Total cartão "Morr" (usuário 1) → Conta "Cartão Douglas" (usuário 2)

#### COPIAR_CONTA_FIXA
Copia valor de conta fixa específica entre usuários.

**Config**:
```json
{
  "tipo": "COPIAR_CONTA_FIXA",
  "ativo": true,
  "descricaoOrigem": "Casa",
  "terceiroOrigem": "Morr",
  "usuarioDestino": 2,
  "contaDestino": "Casa"
}
```

**Fluxo**:
1. Busca valor da conta fixa específica via `repo.getContaFixaValor(descricaoOrigem, terceiroOrigem, sourceUserId, month, year)`
2. Cria/atualiza conta fixa no usuário destino via `repo.findAndUpdateOrCreateContaFixa`

**Caso de uso**: Conta "Casa" (usuário 1, terceiro "Morr") → Conta "Casa" (usuário 2)

#### DIVISAO_CASA
Divide contas do terceiro "CASA" com fórmula: base fixa + metade excedente.

**Config**:
```json
{
  "tipo": "DIVISAO_CASA",
  "ativo": true,
  "terceiroOrigem": "CASA",
  "usuarioDestino": 2,
  "valorMinimo": 750,
  "terceiroEspelhoNoOrigem": "Morr"
}
```

**Fórmula**:
- Base fixa: R$ 750 por conta (R$ 1.500 total)
- Se total > R$ 1.500:
  - Excedente = total - 1.500
  - Cada conta = 750 + (excedente / 2)

**Fluxo**:
1. Busca total do terceiro CASA via `repo.getTotalTerceiroParaDivisaoCasa(terceiroOrigem, sourceUserId, month, year)`
2. Calcula valor por conta baseado na fórmula
3. Cria/atualiza DUAS contas fixas no MESMO usuário origem:
   - Conta "Casa" (terceiro=null) - Card Casa geral
   - Conta "Casa" (terceiro="Morr") - Card espelho
4. Executa batch UPSERT em transação via `repo.bulkUpsertContasFixas(sourceUserId, operations)`

**Caso de uso**: Divisão automática de despesas de casa entre dois usuários

### Gatilhos de Execução
Sync executa automaticamente em:
- `POST /api/lancamentos` (todos modos: normal, bulk, fallback)
- `POST /api/lancamentos/copiar`
- `GET /` (dashboard load, se tem dados e regras)

---

## 9. Fechamento de Mês

**Arquivo**: `src/routes/configuracoes/configuracoesRoutes.js`

### POST /api/meses-fechados/toggle
Alterna status de fechamento de mês.

**Payload**: `{ month: 7, year: 2026 }`

**Fluxo**:
1. Toggle via `repo.toggleMesFechado(userId, month, year)`
2. Retorna `{ success: true, mesFechado: novoStatus }`

**Efeitos do Mês Fechado**:
- Bloqueia criação de lançamentos (`POST /api/lancamentos`)
- Bloqueia atualização (`PUT /api/lancamentos/:id`)
- Bloqueia exclusão (`DELETE /api/lancamentos/:id`, `/lote`, `/mes`, `/pessoa/:nome`)
- Bloqueia movimentação entre meses (`POST /api/lancamentos/mover-mes`)
- Bloqueia cópia para mês fechado (`POST /api/lancamentos/copiar`)

**Validação**: Todas rotas acima verificam `repo.isMesFechado(userId, month, year)` antes de executar.

---

## 10. Configurações

**Arquivo**: `src/routes/configuracoes/configuracoesRoutes.js`

### POST /api/configuracoes
Salva configuração genérica.

**Payload**: `{ chave: "divisao_casa_minimo", valor: "750.00" }`

**Fluxo**:
1. Valida campos obrigatórios: `chave`, `valor`
2. Salva via `repo.saveConfiguracao(userId, chave, valor)`
3. Retorna `{ success: true }`

### POST /api/configuracoes/whatsapp
Salva template mensagem WhatsApp.

**Payload**: `{ template: "Olá {nome_terceiro}! O link das suas contas..." }`

**Fluxo**:
1. UPSERT na tabela `configuracoes` via SQL direto
2. Invalida cache se `repo.invalidateCache` existe
3. Retorna `{ success: true }`

**Placeholders disponíveis**:
- `{nome_terceiro}` - Nome do terceiro
- `{mes}` - Mês referência
- `{ano}` - Ano referência
- `{link}` - Link portal público

---

## 11. Outros (Anotações, Fatura Manual, Cards)

**Arquivo**: `src/routes/outros/outrosRoutes.js`

### POST /api/anotacoes
Salva anotações do mês.

**Payload**: `{ month: 7, year: 2026, conteudo: "Texto livre" }`

### GET /api/anotacoes
Retorna anotações do mês.

**Query params**: `month`, `year`

**Retorno**: `{ conteudo: "Texto" }`

### POST /api/fatura-manual
Salva valor fatura manual.

**Payload**: `{ month: 7, year: 2026, valor: "1.234,56" }`

**Fluxo**:
1. Parse valor via `parseValor` (converte vírgula para ponto)
2. Salva via `repo.saveFaturaManual(userId, month, year, valor)`
3. Retorna `{ success: true }`

### POST /api/cards/reorder
Reordena cards do dashboard (drag & drop).

**Payload**: `{ nomes: ["Casa", "Cartão", "Morr"] }`

**Fluxo**:
1. Salva ordem customizada via `repo.saveOrdemCards(userId, nomes)`
2. Retorna `{ success: true }`

---

## 12. Infraestrutura & Suporte

### Rate Limiter
**Arquivo**: `src/middlewares/rateLimiter.js`

Proteção contra brute force em rotas críticas:
- `/login` - `loginLimiter`
- `/signup` - `loginLimiter`

### Middleware Auth
**Arquivo**: `src/middlewares/auth.js`

Valida sessão autenticada. Se não autenticado:
- Rotas API: Retorna 401
- Rotas página: Redireciona para `/login`

### Cache Helpers
**Arquivo**: `src/helpers/cacheHelpers.js`

Invalidação de cache para forçar dados frescos:
- `cache.invalidate(key)` - Invalida por key pattern
- Uso principal: `dashboard:totais:${userId}:`

### Resumo Cache
**Arquivo**: `src/helpers/resumoCache.js`

Cache em memória para endpoint `/api/dashboard/resumo`:
- `resumoCache.get(userId, month, year)` - Busca cache
- `resumoCache.set(data, userId, month, year)` - Salva cache

### Async Handler
**Arquivo**: `src/helpers/asyncHandler.js`

Wrapper para captura automática de erros em rotas async:
```javascript
asyncHandler(async (req, res) => { ... })
```

### Parse Helpers
**Arquivo**: `src/helpers/parseHelpers.js`

- `parseValor(valor)` - Converte "1.234,56" → 1234.56
- `normalizarParcelasPorTipo(parcelas, tipo)` - Normaliza formato parcelas

### Classificação Lançamentos
**Arquivo**: `src/routes/lancamentos/classificacaoHelpers.js`

**Função**: `classificarLancamento({ tipo_transacao, sub_tipo, parcelas })`

Normaliza dados de lançamento:
- `dbTipo` - FIXA, CARTAO, etc
- `dbCategoria` - Categoria normalizada
- `dbStatus` - PENDENTE, PAGO
- `pAtual`, `pTotal` - Parcela atual e total

### Navegação Helpers
**Arquivo**: `src/routes/dashboard/navigationHelpers.js`

**Função**: `calcularContextoNavegacao(req.query)`

Calcula contexto de navegação mensal:
- Extrai `month`, `year` de query params
- Default: mês/ano atual
- Calcula mês anterior/próximo
- Retorna `{ month, year, nav: { atual, ant, prox } }`

### Terceiros Helpers
**Arquivo**: `src/routes/terceiros/terceirosHelpers.js`

**Função**: `montarMapaTerceiros(dadosTerceirosRaw, userName)`

Agrupa lançamentos por terceiro:
- Cria mapa com totais por terceiro
- Separa fixas e cartão
- Calcula `totalGeral`, `totalFixas`, `totalCartao`

**Função**: `ordenarTerceiros(terceirosMap, ordemCardsRaw)`

Ordena terceiros respeitando ordem customizada salva pelo usuário.

---

## 13. Repositórios (Camada de Dados)

### FinanceiroRepository
**Arquivo**: `src/repositories/FinanceiroRepository.js`

Operações principais:
- `getDashboardDataModular(userId, month, year, userName)` - Dados completos dashboard
- `getDashboardTotals(userId, month, year)` - Totais parciais
- `addLancamento(userId, dados)` - Cria lançamento
- `updateLancamento(userId, id, dados)` - Atualiza lançamento
- `deleteLancamento(userId, id)` - Deleta lançamento
- `addLancamentosBulk(userId, dadosBase, terceiros)` - Cria em lote
- `deleteLancamentosEmLote(userId, ids)` - Deleta em lote
- `moverLancamentosMes(userId, ids, offset)` - Move entre meses
- `dividirConta(userId, idOriginal, terceiros)` - Divide conta
- `copyMonth(userId, month, year)` - Copia mês
- `isMesFechado(userId, month, year)` - Verifica fechamento
- `toggleMesFechado(userId, month, year)` - Alterna fechamento
- `getDadosTerceiros(userId, month, year)` - Dados terceiros
- `getLancamentosTerceiro(userId, nome, month, year)` - Lançamentos terceiro específico
- `getConfiguracoes(userId)` - Busca configurações
- `saveConfiguracao(userId, chave, valor)` - Salva configuração

### TokenRepository
**Arquivo**: `src/repositories/TokenRepository.js`

Gerenciamento tokens persistentes:
- `criarToken(userId, diasValidade)` - Cria token
- `validarToken(token)` - Valida token
- `renovarToken(token, diasValidade)` - Renova token
- `revogarToken(token)` - Revoga token

### UsuarioRepository
**Arquivo**: `src/repositories/UsuarioRepository.js`

Operações usuário:
- `obterUsuarioPorLogin(login)` - Busca por login
- `criarUsuario(nome, login, hash)` - Cria usuário
- `getTodosUsuarios()` - Lista todos usuários

### MesFechadoRepository
**Arquivo**: `src/repositories/MesFechadoRepository.js`

Controle fechamento meses.

### AnotacaoRepository
**Arquivo**: `src/repositories/AnotacaoRepository.js`

CRUD anotações mensais.

### FaturaManualRepository
**Arquivo**: `src/repositories/FaturaManualRepository.js`

CRUD fatura manual.

### OrdemCardsRepository
**Arquivo**: `src/repositories/OrdemCardsRepository.js`

Ordem customizada cards dashboard.

### ConfiguracaoRepository
**Arquivo**: `src/repositories/ConfiguracaoRepository.js`

CRUD configurações usuário.

---

## 14. Estrutura de Dados

### Lançamento (Tabela: lancamentos)
```javascript
{
  id: Number,
  usuario_id: Number,
  descricao: String,
  valor: Number,
  tipo: String,           // FIXA, CARTAO
  categoria: String,
  status: String,         // PENDENTE, PAGO
  parcela_atual: Number,
  total_parcelas: Number,
  nome_terceiro: String,  // null para contas próprias
  data_vencimento: Date,
  conferido: Boolean,
  conferido_extrato: Boolean,
  ordem: Number
}
```

### Terceiro (Tabela: terceiros)
```javascript
{
  usuario_id: Number,
  nome: String,
  telefone: String,       // Formato: 5511999999999
  token_publico: String   // UUID para portal público
}
```

### Configuração (Tabela: configuracoes)
```javascript
{
  usuario_id: Number,
  divisao_casa_minimo: String,
  regras_sync: Array,     // JSONB com regras sincronização
  whatsapp_template: String,
  onboarding_completed: Boolean
}
```

### Token Persistente (Tabela: tokens_persistentes)
```javascript
{
  id: Number,
  usuario_id: Number,
  token: String,
  expires_at: Date,
  revogado: Boolean,
  criado_em: Date
}
```

### Mês Fechado (Tabela: meses_fechados)
```javascript
{
  usuario_id: Number,
  mes: Number,
  ano: Number,
  fechado: Boolean
}
```

---

## 15. Fluxos Completos (Exemplos)

### Fluxo: Lançamento via Web
```
1. Usuário acessa dashboard (GET /)
2. Clica "Novo Lançamento"
3. Preenche formulário:
   - Descrição: "Supermercado"
   - Valor: "450,00"
   - Tipo: "Fixa"
   - Terceiro: "Casa"
4. Submete (POST /api/lancamentos)
5. Backend:
   - Valida mês fechado
   - Classifica lançamento
   - Parse valor
   - Insere no banco
   - Executa sync assíncrono (se tem regras)
   - Invalida cache dashboard
6. Frontend recebe { success: true }
7. Frontend faz soft refresh (GET /api/dashboard/resumo)
8. Dashboard atualiza com novo lançamento
```

### Fluxo: Lançamento via Telegram
```
1. Usuário envia /iniciar no bot
2. Bot envia menu seleção usuário (inline keyboard)
3. Usuário clica "Dodo"
4. Bot pergunta descrição
5. Usuário digita "Supermercado"
6. Bot pergunta valor
7. Usuário digita "450,00"
8. Bot pergunta tipo (Fixa/Cartão)
9. Usuário clica "Fixa"
10. Bot pergunta parcelas (1x, 2x, 3x)
11. Usuário clica "1x"
12. Bot pergunta terceiro (inline com frequentes)
13. Usuário clica "Casa"
14. Bot:
    - Classifica lançamento
    - Insere no banco
    - Formata mensagem sucesso
    - Finaliza conversa
    - Envia menu principal
```

### Fluxo: Sincronização Automática
```
1. Usuário lança conta no dashboard
2. POST /api/lancamentos executa
3. Após inserir, dispara setImmediate:
   - Busca configuracoes.regras_sync
   - Executa executarSincronizacaoDinamica
4. Sync service:
   - Cria mutex key
   - Itera regras ativas
   - Para cada regra:
     - COPIAR_CONTAS: Copia total cartão entre usuários
     - COPIAR_CONTA_FIXA: Copia conta fixa específica
     - DIVISAO_CASA: Divide despesas casa
   - Libera mutex
5. Lançamentos sincronizados aparecem para outro usuário
```

### Fluxo: Fechamento de Mês
```
1. Usuário acessa configurações
2. Clica "Fechar Mês" (toggle)
3. POST /api/meses-fechados/toggle
4. Backend:
   - Toggle status no banco
   - Retorna novo status
5. Frontend atualiza UI (mostra cadeado)
6. Tentativas de editar lançamentos bloqueadas:
   - POST /api/lancamentos → 403
   - PUT /api/lancamentos/:id → 403
   - DELETE /api/lancamentos/:id → 403
```

### Fluxo: Portal Público Terceiro
```
1. Usuário clica "Gerar Link" em terceiro
2. GET /api/terceiros/:nome/token
3. Backend:
   - Verifica se token existe
   - Se não, gera via crypto.randomBytes
   - Retorna token
4. Frontend monta link: /contas/{token}
5. Usuário compartilha link com terceiro
6. Terceiro acessa link (sem autenticação)
7. GET /contas/:tokenPublico
8. Backend:
   - Valida formato UUID
   - Busca terceiro no banco
   - Busca lançamentos do terceiro
   - Agrupa por tipo
   - Calcula totais
9. Renderiza página pública read-only
```

### Fluxo: Cópia de Mês com Sync
```
1. Usuário clica "Copiar para Próximo Mês"
2. POST /api/lancamentos/copiar
3. Backend:
   - Calcula próximo mês
   - Valida se destino não está fechado
   - Copia lançamentos via repo.copyMonth
   - Invalida cache ambos meses
   - Dispara sync assíncrono para mês destino
4. Sync service:
   - Executa regras para mês destino
   - Ex: COPIAR_CONTAS atualiza valores
5. Frontend recebe success
6. Usuário navega para próximo mês
7. Vê lançamentos copiados + sincronizados
```

---

## 16. Considerações Técnicas

### Performance
- **Cache em memória**: `/api/dashboard/resumo` usa cache para soft refresh rápido
- **Mutex em sync**: Evita execuções concorrentes para mesmo usuário/mês
- **Fire-and-forget**: Sync executa em background (não bloqueia response)
- **Bulk operations**: UPSERT em lote para terceiros (evita N queries)
- **Promise.all**: Busca paralela de dados independentes

### Segurança
- **Rate limiting**: Proteção brute force em login/signup
- **Timing attack prevention**: Dummy hash em login falho
- **Session-based auth**: Sessão server-side
- **Token persistente**: HttpOnly cookie, secure em production
- **UUID validation**: Portal público valida formato UUID
- **IDOR prevention**: Todas queries filtram por `userId` da sessão

### Consistência
- **Invalidação cache**: Após toda mutação, invalida cache dashboard
- **Transações**: Operações bulk usam transação (ex: bulkUpsertContasFixas)
- **Validação mês fechado**: Bloqueia mutações em meses fechados
- **Classificação centralizada**: `classificarLancamento` usado em POST/PUT

### Escalabilidade
- **Regras declarativas**: Sync baseado em regras JSONB (SaaS ready)
- **Modularização**: Rotas separadas por domínio (auth, dashboard, lançamentos, terceiros)
- **Repository pattern**: Camada de dados abstraída
- **Async handlers**: Captura automática de erros

---

**Fim da documentação.**
