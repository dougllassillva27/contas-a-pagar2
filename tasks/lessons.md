# Lessons Learned — Registro de Padrões de Erro e Regras Preventivas

> Este arquivo é revisado no início de cada sessão para evitar reincidência de erros.
> Formato: `[LESSON-YYYYMMDD-NN]` + Categoria + Padrão do Erro + Regra Preventiva.

---

## Neon Postgres / Serverless DB

### [LESSON-20260601-01] Lock Contention em DB Serverless (Neon)

- **Padrão do Erro**: Uso de `SELECT ... FOR UPDATE` dentro de transações explícitas (`BEGIN/COMMIT`) no Neon Postgres causa lock exclusivo que persiste por ~6 minutos após o COMMIT, bloqueando TODAS as queries subsequentes (incluindo leituras simples e F5).
- **Regra Preventiva**: Em bancos serverless (Neon, Supabase, etc.), NUNCA use `FOR UPDATE` ou transações longas com locks exclusivos. Prefira:
  1. Abordagem otimista: `UPDATE ... WHERE campo = $valorEsperado` + verificação de `rowCount`
  2. Se transação for obrigatória, mantenha-a o mais curta possível (< 100ms)
  3. Use `SET statement_timeout = '5s'` para fail-fast em vez de esperar locks
  4. Retorne dados derivados (ex: resumos, agregações) no mesmo response da escrita, evitando queries subsequentes que podem esbarrar em lock residual
- **Contexto**: Caso "Dividir Conta" — OBS-20260601-08 a OBS-20260601-14 no resumo-de-trabalho.md

### [LESSON-20260601-02] Pool Connection Contamination pós-Transação

- **Padrão do Erro**: Após transações com `FOR UPDATE` ou locks pesados, conexões do pool compartilhado podem ficar "contaminadas" — mesmo liberadas, o banco serverless mantém estado de lock associado àquela conexão/sessão.
- **Regra Preventiva**:
  1. Para operações críticas pós-transação, use client dedicado (`db.getClient()`) com release imediato
  2. Ou melhor ainda: elimine a transação e use queries atômicas via pool compartilhado
  3. Nunca reutilize client dedicado para queries de leitura após COMMIT de transação com lock
- **Contexto**: `getResumoTerceirosGrid` demorava 5min19s quando executada via pool compartilhado logo após `dividirConta` com FOR UPDATE

---

## Frontend / UX

### [LESSON-20260601-03] Race Condition entre history.back() e Modais

- **Padrão do Erro**: `fecharModais()` chama `handleModalClose()` → `history.back()` que dispara evento `popstate` ASSÍNCRONO. Se outro modal for aberto ou se houver lógica dependente de estado de modais logo após, o popstate reentrante corrompe o estado da UI (travamento em "processando...").
- **Regra Preventiva**: Sempre ative `_suppressPopstate = true` ANTES de chamar `fecharModais()` em fluxos programáticos, e desative APÓS a operação seguinte ser concluída. O handler de popstate já respeita essa flag.
- **Contexto**: OBS-20260531-13 documentou a flag, mas ela não foi aplicada ao fluxo de dividir conta até OBS-20260601-08

### [LESSON-20260601-04] window.location.reload() em SPAs com Sessão

- **Padrão do Erro**: `window.location.reload()` após POST pode causar loop infinito de redirect 302 se a sessão estiver em race condition (MemoryStore do Express salva sessão assincronamente; GET subsequente chega antes do save completar → sessão indisponível → 302 → login).
- **Regra Preventiva**: Nunca use `window.location.reload()` após mutações. Prefira:
  1. Dados inline no response do POST + renderização via JS puro
  2. `softRefreshSafe()` com endpoint API leve (não GET /)
  3. Se reload for inevitável, adicione delay > 2s e use `credentials: 'same-origin'`
- **Contexto**: OBS-20260531-04 diagnosticou o redirect 302; OBS-20260601-09 substituiu por softRefreshSafe

---

## Debug / Metodologia

### [LESSON-20260601-05] Logs de Ping com Timestamp Relativo para Identificar Gargalos

- **Padrão do Erro**: Em problemas de performance/delay, adicionar logs genéricos não revela ONDE está o gargalo. Sem timestamps relativos, é impossível distinguir se o delay é no POST, no delay artificial, no fetch subsequente ou na renderização.
- **Regra Preventiva**: Em diagnósticos de delay, SEMPRE use logs de ping com timestamp relativo:
  ```javascript
  const t0 = Date.now();
  const ping = (label) => console.log(`[PING] ${label} +${Date.now() - t0}ms`);
  ```
  Isso revela instantaneamente qual etapa consome tempo (ex: `+318935ms` no fetch = lock contention).
- **Contexto**: Logs `[DIVIDIR-PING]` e `[SRS-PING]` identificaram que o gargalo era exclusivamente no GET /api/terceiros/resumo (318s), não no POST (729ms) nem no delay (800ms)

### [LESSON-20260601-06] Servidor Precisa Ser Reiniciado Após Edições Backend

- **Padrão do Erro**: Editar arquivos backend e testar sem reiniciar o servidor resulta em comportamento antigo, levando a diagnósticos falsos e perda de tempo. Mesmo com nodemon, edições em arquivos não observados ou erros de cache podem impedir o reload.
- **Regra Preventiva**:
  1. Após editar arquivos backend, SEMPRE confirme que o servidor recarregou (verifique timestamp nos logs de startup)
  2. Se usar nodemon, verifique se o arquivo editado está no watch pattern
  3. Em caso de dúvida, mate todos os processos Node.js (`taskkill /F /IM node.exe`) e reinicie manualmente
  4. Adicione log de versão/timestamp no startup para confirmar qual código está rodando
- **Contexto**: Múltiplas tentativas de debug falharam porque os logs `[DIVIDIR-DEBUG]` nunca apareciam — o servidor não havia recarregado apesar das edições

---

## Fluxo GSD / Agentes

### [LESSON-20260602-01] Interrupcao de Agente Pos-Mutacao (gsdrecorder)

- **Padrao do Erro**: Invocar o agente `gsdrecorder` via ferramenta `Agent` apos uma mutacao bem-sucedida pode ser interrompido pelo usuario ou falhar por timeout, deixando o `resumo-de-trabalho.md` dessincronizado e forcando retrabalho manual.
- **Regra Preventiva**:
  1. Para registros simples (uma unica observacao de documentacao ou mudanca menor), NAO invoque o agente `gsdrecorder`. Use `Add-Content` diretamente no PowerShell com o padrao `[OBS-YYYYMMDD-NN]`.
  2. Reserve o `gsdrecorder` para cenarios complexos: multiplos arquivos alterados, decisoes arquiteturais, ou quando o proprio agente precisa analisar diffs para gerar o resumo.
  3. Se o agente for interrompido, NAO tente reinvoca-lo imediatamente. Faca o registro manual via terminal e siga em frente.
  4. O gate pos-mutacao exige que o historico esteja atualizado, nao QUE seja via agente. A ferramenta e meio, nao fim.
- **Contexto**: Atualizacao do README.md (secao Split) foi concluida com sucesso, mas o gsdrecorder foi rejeitado pelo usuario, exigindo registro manual via Add-Content (OBS-20260602-01).

---

## Frontend / UX

### [LESSON-20260603-01] Race Condition entre Modais no Mobile

- **Padrao do Erro**: Ao copiar link na home mobile, o modal de sucesso nao aparecia porque `history.back()` (chamado por `handleModalClose()`) dispara o evento `popstate` assincronamente. Se um novo modal e aberto antes do popstate completar, o handler fecha o modal recem-aberto.
- **Regra Preventiva**: Sempre adicione um `setTimeout` de 150ms entre fechar um modal que chama `handleModalClose()` e abrir o proximo modal. Isso garante que o ciclo do `popstate` complete sem interferir na nova abertura. A flag `_suppressPopstate` tambem deve ser usada para suprimir o handler durante o fluxo programatico.
- **Contexto**: Fix aplicado em `copiarLinkCompartilhado()` — modal de sucesso "Link de XXX copiado" agora aparece corretamente apos copiar link na home mobile.

### [LESSON-20260603-02] Normalizacao de Terceiro "Eu"/"Dodo" em APIs de Integracao

- **Padrao do Erro**: O widget enviava "Eu" ou "Dodo" no campo terceiro, e o endpoint da API de integracao (`/api/v1/integracao/lancamentos`) passava esse valor direto para o banco, criando novos terceiros em vez de associar a conta ao proprio usuario. O sistema principal usa a funcao `normalizarTerceiro()` (em `LancamentoRepository.js:26`) que converte "Eu", "Dodo" ou vazio para `NULL`, mas o endpoint de integracao nao estava usando essa funcao.
- **Regra Preventiva**: Centralize a logica de normalizacao de terceiros em uma unica funcao (`normalizarTerceiro()`) e use-a em TODOS os pontos de entrada de dados (APIs, widgets, imports). Aplique a normalizacao tanto no handler da rota quanto no repositorio para garantir defesa em profundidade. Nunca confie que o valor recebido ja esta normalizado.
- **Contexto**: Fix aplicado em dois niveis:
  1. `src/routes/integrationRoutes.js` — normalizacao no handler da API
  2. `src/repositories/LancamentoRepository.js` — normalizacao na funcao `addLancamento()`
  Agora contas com "Eu" ou "Dodo" vao para o proprio usuario (terceiro NULL) em vez de criar novo registro na tabela de terceiros.

### [LESSON-20260603-03] Backend Precisa Ser Reiniciado Apos Mudancas no Codigo

- **Padrao do Erro**: Apos aplicar fixes nos arquivos `integrationRoutes.js` e `LancamentoRepository.js`, o widget continuou criando terceiros "Eu"/"Dodo" porque o servidor backend ainda estava rodando a versao antiga do codigo (cache de modulo Node.js). O fix so funciona apos reiniciar o processo Node.js.
- **Regra Preventiva**: SEMPRE reinicie o servidor Node.js apos modificar arquivos de rota, repositorio ou qualquer modulo backend. Nao confie apenas no nodemon — em caso de duvida, mate todos os processos Node (`taskkill /F /IM node.exe`) e reinicie manualmente. Verifique nos logs de startup que o novo codigo foi carregado (timestamp ou versao).
- **Contexto**: Usuario testou o widget apos o fix e continuou com erro porque o backend nao foi reiniciado. So apos restart do processo Node o fix foi aplicado corretamente.
