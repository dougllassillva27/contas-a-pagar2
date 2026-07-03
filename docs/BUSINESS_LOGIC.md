# BUSINESS_LOGIC.md - Regras de Negócio do Sistema de Contas a Pagar

> Fonte: código-fonte em `src/` (repositórios, rotas, helpers, services).
> Última atualização: 2026-07-03.

---

## 1. Modelo de Dados Principal

### Tabela `Lancamentos`

| Campo | Tipo | Regra |
|-------|------|-------|
| `Id` | SERIAL | PK |
| `UsuarioId` | INT | FK → usuarios.id |
| `Descricao` | TEXT | Obrigatório |
| `Valor` | NUMERIC | Obrigatório, > 0 |
| `Tipo` | ENUM | `FIXA`, `CARTAO`, `RENDA` |
| `Categoria` | TEXT | NULL (exceto RENDA: subtipo da renda) |
| `Status` | ENUM | `PENDENTE`, `PAGO` |
| `DataVencimento` | DATE | Dia 10 do mês de referência |
| `ParcelaAtual` | INT | NULL se não parcelada |
| `TotalParcelas` | INT | NULL se não parcelada |
| `NomeTerceiro` | TEXT | NULL = conta própria do usuário |
| `Ordem` | INT | Ordenação manual (drag & drop) |
| `Conferido` | BOOL | Flag de conferência |
| `ConferidoExtrato` | BOOL | Flag de conferência vs extrato bancário |
| `MesVencimento` | INT | Coluna computada (EXTRACT MONTH de DataVencimento) |
| `AnoVencimento` | INT | Coluna computada (EXTRACT YEAR de DataVencimento) |
| `DataCriacao` | TIMESTAMP | Padrão: `1970-01-01` para lançamentos manuais |

### Tabelas Auxiliares

| Tabela | Função |
|--------|--------|
| `MesesFechados` | Registra meses bloqueados por usuário (UsuarioId, Mes, Ano) |
| `FaturaManual` | Valor manual de fatura de cartão por mês (UPSERT por UsuarioId+Mes+Ano) |
| `OrdemCards` | Ordem customizada dos cards de terceiros no dashboard |
| `terceiros` | Cadastro de terceiros com telefone e token público |
| `registros_luz` | Medições de consumo de energia (módulo calcularLuz) |
| `Anotacoes` | Notas livres por usuário/mês/ano |
| `Configuracoes` | JSONB com preferências do usuário (regras_sync, divisao_casa_minimo, etc.) |

---

## 2. Classificação de Lançamentos

Fonte: `src/routes/lancamentos/classificacaoHelpers.js` + `src/constants.js`

### 2.1 Tipos de Transação

| Entrada (formulário) | `tipo_transacao` | `sub_tipo` | Resultado no DB |
|----------------------|-------------------|------------|-----------------|
| Conta Fixa | qualquer | `Fixa` | `tipo=FIXA`, `status=PENDENTE` |
| Cartão à vista | qualquer | outro | `tipo=CARTAO`, `status=PENDENTE` |
| Cartão parcelado | qualquer | `Parcelada` | `tipo=CARTAO`, `status=PENDENTE`, parcelas preenchidas |
| Renda | `RENDA` | qualquer | `tipo=RENDA`, `status=PAGO`, `categoria=sub_tipo` |

### 2.2 Regra de Parcelas

- Parcelas **só existem** quando `sub_tipo === 'Parcelada'`.
- Se não for parcelada: `parcelaAtual=NULL`, `totalParcelas=NULL` (mesmo que venham dados).
- Formatos aceitos para parcelas:
  - `"10"` → `{ atual: 1, total: 10 }`
  - `"1/10"` → `{ atual: 1, total: 10 }`
- Validação mínima: `total >= 2`, `atual >= 1`, `atual <= total`.

### 2.3 Normalização de Terceiro

Fonte: `src/repositories/LancamentoRepository.js` → `normalizarTerceiro()`

- Valores `"eu"`, `"dodo"`, `""` (vazio) → normalizados para `NULL` (conta própria).
- Qualquer outro valor → mantido como string trimada.

### 2.4 Parsing de Valor

Fonte: `src/helpers/parseHelpers.js` → `parseValor()`

- Aceita: `"R$ 1.234,56"`, `"1234,56"`, `"1234.56"`.
- Remove `"R$"`, remove separador de milhar (`.`), troca vírgula por ponto.
- Resultado inválido → `0.0`.

---

## 3. Trava de Mês (Fechamento)

Fonte: `src/repositories/MesFechadoRepository.js` + `src/routes/lancamentos/lancamentosRoutes.js`

### Regra

- Tabela `MesesFechados` registra combinações `(UsuarioId, Mes, Ano)` bloqueadas.
- Query: `SELECT EXISTS(SELECT 1 FROM MesesFechados WHERE UsuarioId=$1 AND Mes=$2 AND Ano=$3)`.

### Operações Bloqueadas em Mês Fechado

| Operação | HTTP | Comportamento |
|----------|------|---------------|
| Criar lançamento | `POST /api/lancamentos` | 403 |
| Editar lançamento | `PUT /api/lancamentos/:id` | Verifica mês do item |
| Deletar lançamento | `DELETE /api/lancamentos/:id` | 403 |
| Deletar lote | `DELETE /api/lancamentos/lote` | 403 se qualquer item em mês fechado |
| Mover mês | `POST /api/lancamentos/mover-mes` | 403 se origem OU destino fechados |
| Copiar mês | `POST /api/lancamentos/copiar` | 403 se mês destino fechado |
| Deletar mês inteiro | `DELETE /api/lancamentos/mes` | 403 |
| Deletar por pessoa | `DELETE /api/lancamentos/pessoa/:nome` | 403 |

---

## 4. Dashboard

Fonte: `src/routes/dashboard/dashboardRoutes.js`

### 4.1 Dados Carregados

O endpoint `GET /` chama `repo.getDashboardDataModular(userId, month, year, userName)` que retorna:

| Dado | Descrição |
|------|-----------|
| `totais` | Totais gerais (pendentes, pagos, etc.) |
| `fixas` | Lançamentos tipo FIXA do mês |
| `cartao` | Lançamentos tipo CARTAO do mês |
| `anotacoes` | Notas do mês |
| `resumoPessoas` | Agrupamento por pessoa (terceiro) |
| `dadosTerceirosRaw` | Dados brutos de terceiros para montar cards |
| `ordemCardsRaw` | Ordem customizada dos cards |
| `faturaManualVal` | Valor da fatura manual do mês |
| `mesFechado` | Boolean se mês está travado |
| `terceirosDistinct` | Lista distinta de terceiros |

### 4.2 Montagem do Mapa de Terceiros

Fonte: `src/routes/terceiros/terceirosHelpers.js` → `montarMapaTerceiros()`

- Agrupa lançamentos por `NomeTerceiro`.
- Ignora lançamentos sem terceiro (conta própria).
- Para cada terceiro calcula:
  - `totalCartao`: soma de valores CARTAO com status PENDENTE.
  - `totalFixas`: soma de valores FIXA com status PENDENTE.
  - `totalGeral`: soma de todos PENDENTE.
  - `itensCartao` / `itensFixas`: arrays de itens.

### 4.3 Ordenação dos Cards

Fonte: `terceirosHelpers.js` → `ordenarTerceiros()`

- Usa `OrdemCards` (salva via drag & drop).
- Terceiros sem ordem definida → valor padrão `9999`.
- Desempate: ordem alfabética (`localeCompare`).

### 4.4 Navegação Mensal

Fonte: `src/routes/dashboard/navigationHelpers.js`

- Se `?month` e `?year` não informados → usa mês/ano corrente.
- Calcula contexto: mês atual, anterior e próximo.

### 4.5 Sincronização Automática (Background)

- Ao carregar dashboard, se o mês tem dados E existem regras de sync configuradas:
  - Executa `executarSincronizacaoDinamica()` via `setImmediate()` (não bloqueia resposta).
- Condição: `temDados = fixas.length > 0 || cartao.length > 0 || terceiros > 0`.

### 4.6 Cache

- `GET /api/dashboard/resumo` usa cache em memória (`resumoCache`).
- Chave: `${userId}-${month}-${year}`.
- Invalidado em toda mutação de lançamentos.

---

## 5. Operações em Lote

### 5.1 Copiar Mês

Fonte: `src/repositories/LancamentoRepository.js` → `copyMonth()`

- Copia todos os lançamentos do mês corrente para o próximo mês.
- Regras especiais:
  - Contas do terceiro "CASA" com descrição "Casa" → valor resetado para `divisao_casa_minimo` (padrão R$ 750).
  - Demais contas → copiadas com mesmo valor, nova data de vencimento, nova ordem.
- Transação ACID (BEGIN/COMMIT/ROLLBACK).
- Após cópia: invalida cache de ambos os meses.

### 5.2 Divisão de Conta

Fonte: `src/repositories/LancamentoRepository.js` → `dividirConta()`

- Divide uma conta em N partes iguais (original + N novos terceiros).
- Algoritmo:
  1. `n = terceiros.length + 1` (inclui a conta original).
  2. `valorPorParte = floor(valorOriginal / n * 100) / 100` (2 casas decimais).
  3. `resto = valorOriginal - (valorPorParte * n)` (ajuste de centavos).
  4. Conta original recebe `valorPorParte + resto`.
  5. Novas contas recebem `valorPorParte` cada.
- Validações:
  - Conta deve existir e pertencer ao usuário → `CONTA_NAO_ENCONTRADA` (404).
  - Pelo menos 1 terceiro válido → `NENHUM_TERCEIRO_VALIDO` (400).
  - Máximo 20 terceiros → `LIMITE_TERCEIROS_EXCEDIDO` (400).
  - Valor original > 0 → `VALOR_INVALIDO` (400).
  - Verificação otimista: se valor mudou entre leitura e escrita → `CONTA_MODIFICADA_CONCORRENTE` (409).

### 5.3 Mover Mês (Deslocamento em Lote)

Fonte: `lancamentosRoutes.js` → `POST /api/lancamentos/mover-mes`

- Move lançamentos para o mês anterior (`direcao=-1`) ou próximo (`direcao=1`).
- Valida: origem E destino não podem estar fechados.
- Ajusta mês/ano com wrap (dezembro+1 → janeiro do ano seguinte, janeiro-1 → dezembro do ano anterior).

### 5.4 Exclusão em Lote

Fonte: `lancamentosRoutes.js` → `DELETE /api/lancamentos/lote`

- Recebe array de IDs.
- Verifica se algum ID pertence a mês fechado → 403.
- Deleta todos de uma vez.

### 5.5 Bulk Mode (Lançamento em Massa)

Fonte: `lancamentosRoutes.js` → `POST /api/lancamentos`

- Se `bulk_mode=true` e `terceiros` é array:
  - Cria um lançamento idêntico para cada terceiro único.
  - Deduplica terceiros (Set).
  - Filtra strings vazias.
- Fallback defensivo: se `nome_terceiro` contém vírgulas → trata como bulk automático.

---

## 6. Motor de Sincronização Dinâmica

Fonte: `src/services/syncService.js`

### 6.1 Arquitetura

- Processa regras declarativas armazenadas em `configuracoes.regras_sync` (JSONB).
- Mutex por `(userId, month, year)` → impede execuções concorrentes.
- Regras inativas (`ativo=false`) são ignoradas.

### 6.2 Tipos de Regra

#### `COPIAR_CONTAS`

- Copia o **total de cartão** de um terceiro do usuário origem para uma conta fixa no usuário destino.
- Exemplo: Total do cartão "Morr" (usuário 1) → Conta "Cartão Douglas" (usuário 2).
- Busca: `getTotalTerceiroCartao()` → soma apenas `Tipo='CARTAO'`.

#### `COPIAR_CONTA_FIXA`

- Copia o valor de uma **conta fixa específica** de um usuário para outro.
- Exemplo: Conta "Casa" do usuário 1 (terceiro "Morr") → Conta "Casa" do usuário 2.
- Busca: `getContaFixaValor()` → busca por descrição + terceiro + tipo FIXA.

#### `DIVISAO_CASA`

- Divide contas do terceiro "CASA" entre dois usuários.
- Algoritmo:
  1. Busca total do terceiro CASA (cartão + fixas): `getTotalTerceiroParaDivisaoCasa()`.
  2. Base fixa = `valorMinimo` (padrão R$ 750).
  3. Limite base = `valorMinimo * 2` (R$ 1.500).
  4. Se `total > limiteBase`:
     - `excedente = total - limiteBase`
     - `metadeExcedente = round(excedente / 2, 2)`
     - `valorPorConta = baseFixa + metadeExcedente`
  5. Se `total <= limiteBase`:
     - `valorPorConta = baseFixa` (R$ 750).
  6. Cria/atualiza DUAS contas fixas no mesmo usuário:
     - Conta "Casa" com `terceiro=NULL` (card Casa geral).
     - Conta "Casa" com `terceiro=terceiroEspelhoNoOrigem` (ex: "Morr").
  7. Data de vencimento: dia 10 do mês de referência.
  8. Executa via `bulkUpsertContasFixas()` (transação única com UNNEST).

### 6.3 UPSERT de Conta Fixa

Fonte: `findAndUpdateOrCreateContaFixa()`

- Se valor <= 0 → ignora (não cria/atualiza).
- Query CTE:
  1. Busca registro existente (mesmo usuário, descrição, tipo FIXA, mês/ano).
  2. Se existe → UPDATE do valor.
  3. Se não existe → INSERT com nova ordem.

---

## 7. Módulo calcularLuz

Fonte: `src/modules/calcularLuz/calcularLuzRoutes.js`

### 7.1 Modelo

Tabela `registros_luz`:

| Campo | Tipo |
|-------|------|
| `id` | SERIAL |
| `usuario_id` | INT |
| `mes_referencia` | DATE/TEXT |
| `leitura_anterior` | NUMERIC |
| `leitura_atual` | NUMERIC |
| `consumo_kwh` | NUMERIC |
| `valor_estimado` | NUMERIC |

### 7.2 Validações

- `POST /salvar`: exige `mesReferencia`, `leituraAnterior`, `leituraAtual`.
- `consumo` e `valorEstimado` são opcionais (calculados pelo frontend).
- Escopo: sempre filtrado por `usuario_id` da sessão.

### 7.3 Endpoints

| Método | Rota | Ação |
|--------|------|------|
| GET | `/historico` | Lista medições ordenadas por data DESC |
| POST | `/salvar` | Cria nova medição |
| DELETE | `/deletar/:id` | Exclui medição (escopo: usuário logado) |

---

## 8. Integração Android

Fonte: `src/routes/integrationRoutes.js`

### 8.1 Endpoint de Lançamento

`POST /api/v1/integracao/lancamentos` (autenticado via `apiAuth`)

Payload esperado:

```json
{
  "usuario_id": 1,
  "descricao": "Internet",
  "valor": "R$ 100,00",
  "tipo": "fixa" | "unica" | "parcelada",
  "parcelas": "" | "10" | "1/10",
  "terceiro": "Nome",
  "month": 7,
  "year": 2026
}
```

Regras:
- `tipo="fixa"` → `TIPO.FIXA`.
- Qualquer outro tipo → `TIPO.CARTAO`.
- `tipo="parcelada"` → valida parcelas (total >= 2).
- Terceiro normalizado: "Eu"/"Dodo"/vazio → NULL.
- Se `month` e `year` informados → cria no mês especificado; senão → data corrente.
- Status sempre `PENDENTE`.

### 8.2 Cópia Mensal Automática

`POST /api/v1/integracao/copiar-mensal` (autenticado via `apiAuth`)

- Calcula mês/ano de referência pelo fuso de Brasília (UTC-3).
- Itera todos os usuários e executa `copyMonth()` para cada um.
- Envia notificação via Telegram (se tokens configurados).

---

## 9. Terceiros

Fonte: `src/routes/terceiros/terceirosRoutes.js`

### 9.1 Dashboard de Terceiros

- Lista terceiros com movimento no mês.
- Para cada terceiro: `nome`, `totalGeral`, `telefone`, `tokenPublico`.
- Bulk UPSERT na tabela `terceiros` (garante registro para terceiros com movimento).

### 9.2 Telefone

- Normalização: remove não-dígitos, prefixa `"55"` se 10 ou 11 dígitos.
- Se telefone vazio → deleta registro da tabela `terceiros`.

### 9.3 Token Público

- Gerado sob demanda (crypto.randomBytes(16).toString('hex')).
- Persistido na tabela `terceiros.token_publico`.
- Usado para compartilhamento de link público de contas.

### 9.4 Template WhatsApp

- Configurável em `configuracoes.whatsapp_template`.
- Placeholders: `{nome_terceiro}`, `{mes}`, `{ano}`, `{link}`.

---

## 10. Fatura Manual

Fonte: `src/repositories/FaturaManualRepository.js`

- UPSERT por `(UsuarioId, Mes, Ano)`.
- Valor parseado via `parseValor()`.
- Exibido no dashboard como valor adicional de fatura de cartão.

---

## 11. Anotações

- Livres por usuário/mês/ano.
- `POST /api/anotacoes`: upsert de conteúdo textual.
- `GET /api/anotacoes`: retorna conteúdo do mês.

---

## 12. Constantes do Sistema

Fonte: `src/constants.js`

| Constante | Valor | Uso |
|-----------|-------|-----|
| `STATUS.PENDENTE` | `'PENDENTE'` | Lançamento não pago |
| `STATUS.PAGO` | `'PAGO'` | Lançamento quitado |
| `TIPO.FIXA` | `'FIXA'` | Conta fixa mensal |
| `TIPO.CARTAO` | `'CARTAO'` | Compra de cartão |
| `TIPO.RENDA` | `'RENDA'` | Entrada de renda |
| `LIMITES.ULTIMOS_LANCAMENTOS` | `20` | Máximo de itens na listagem recente |
| `LIMITES.BRUTE_FORCE_DELAY_MS` | `500` | Delay anti-brute-force |
| `LIMITES.ORDEM_DEFAULT` | `9999` | Ordem padrão para cards não ordenados |
| `SQL_SEM_TERCEIRO` | `"NomeTerceiro IS NULL"` | Fragmento SQL para conta própria |

---

## 13. Regras de Cache

- Chave de cache de totais: `dashboard:totais:${userId}:${month}:${year}`.
- Cache de terceiros distintos: `dashboard:distintos_terceiros:${userId}`.
- Invalidado em: criação, edição, exclusão, mudança de status, cópia de mês.
- Sync em background não bloqueia resposta HTTP.

---

## 14. Fluxo de Sincronização Pós-Mutação

Após qualquer criação/edição de lançamento:

1. Resposta HTTP enviada imediatamente (`res.json({ success: true })`).
2. `setImmediate()` dispara sincronização em background.
3. Lê `configuracoes.regras_sync` do banco.
4. Se existem regras ativas → executa `executarSincronizacaoDinamica()`.
5. Mutex impede execuções concorrentes para mesmo `(userId, month, year)`.

---

## 15. Validações Transversais

| Validação | Onde | Regra |
|-----------|------|-------|
| Mês fechado | Rotas de lançamento | 403 se mês travado |
| Valor > 0 | `parseValor()` | Retorna 0.0 se inválido |
| Parcelas mínimas | `normalizarParcelasPorTipo()` | total >= 2, atual >= 1, atual <= total |
| Terceiro válido | `dividirConta()` | Mínimo 1, máximo 20 |
| Concorrência | `dividirConta()` | Verificação otimista de valor |
| Valor conta fixa | `findAndUpdateOrCreateContaFixa()` | Ignora se valor <= 0 |
| IDOR | `deleteLancamento()`, `updateLancamento()` | Sempre filtra por `UsuarioId` |
| Bulk UPSERT terceiros | `terceirosRoutes.js` | UNNEST com ON CONFLICT DO NOTHING |

---

## 16. Portal Público do Terceiro

Fonte: `getLancamentosTerceiro()`

- Consulta lançamentos de um terceiro específico.
- Filtra: `UsuarioId`, `NomeTerceiro`, `Tipo IN ('FIXA','CARTAO')`, mês/ano.
- Ordena: `Tipo, Ordem ASC`.
- Acesso via token público (sem autenticação de sessão).
