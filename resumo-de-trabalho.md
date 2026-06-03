# Resumo de Trabalho - Gestão Financeira

Arquivo de log de modificações e controle de progresso.

---

# 🧠 Resumo de Trabalho & Arquitetura Macro (Hot Storage)

## 🏗️ Stack e Infraestrutura

- **Backend**: Node.js 18+, Express 5.x. Hospedagem: Render (Free Tier) c/ Failsafe no `app.js`.
- **Banco de Dados**: PostgreSQL (Neon.tech). Uso de pool `pg`, queries parametrizadas e transações (`BEGIN/COMMIT`).
- **Frontend**: EJS (SSR) + Vanilla JS modularizado (`app.js`, `ui.js`, `dragdrop.js`, `utils.js` c/ debounce). Uso intensivo de `localStorage` para estados de UI (ex: Privacidade, Acordeões) prevenindo FOUC (piscar de tela).
- **Testes**: Jest + Supertest (Cobertura Unitária e Integração c/ DB Mockado).

## 🕒 Histórico de Sprint (Recente)

_(Mantenha aqui apenas as iterações dos últimos 3 a 5 dias. O restante está em `docs/history/resumo-de-trabalho-arquivado.md`)_


[OBS-20260601-01] [01/06/2026 22:45] - [Refatoracao] Compactacao do historico da feature Dividir Conta -> [Acao] Consolidado historico de ~20 tentativas falhas e erros de lock contention/race condition na feature Dividir Conta em entradas historicas limpas. -> [Motivo] Limpeza de logs de erro repetitivos no resumo de trabalho para evitar token bloat e melhorar legibilidade.

[OBS-20260601-02] [01/06/2026 19:52] - [Desenvolvimento] Implementacao e estabilizacao da feature Dividir Conta -> [Acao] Adicionado repository LancamentoRepository.js com divisao otimista de contas (sem transacao exclusiva FOR UPDATE) e dados de terceiros inline na resposta do POST; frontend app.js modificado para renderizar a grid via dados inline, fechar modais controlando popstate e realizar refresh seguro contra redirect 302 de sessao. -> [Motivo] Evitar pool starvation/lock contention de 6min no Neon Postgres, corrigir loading eterno e cache stale sem exigir F5 manual.

[OBS-20260601-03] [01/06/2026 22:57] - [Documentacao] Revisao da secao Split no README.md -> [Acao] Atualizada secao 'Divisao de Contas (Split)' para refletir implementacao final estabilizada: zero lock contention, dados inline na resposta POST e renderizacao sem reload. -> [Motivo] Sincronizar documentacao com estado real do codigo apos estabilizacao da feature.

[OBS-20260602-01] [02/06/2026 07:45] - [Documentacao] Atualizacao do README.md secao Divisao de Contas (Split) -> [Acao] Revisada a secao para refletir implementacao final estabilizada: zero lock contention, dados inline no response, renderizacao sem reload via renderizarTerceirosGrid e controle robusto de modal com popstate. -> [Motivo] Sincronizar documentacao publica com o estado real da feature apos estabilizacao da OBS-20260601-02.

[OBS-20260602-02] [02/06/2026 09:13] - [Desenvolvimento] Ajuste UX e acessibilidade no form do widgetLancamentos -> [Acao] form.reset() pos-submit restaura estado visual dos botoes usuario/tipo e retorna foco ao campo descricao; adicionada navegacao por setas Esquerda/Direita nos botoes de usuario para acessibilidade via teclado. Build gerado: Widget Lancamentos Setup 0.1.0.exe. -> [Motivo] Melhorar experiencia pos-cadastro evitando estado inconsistente de UI e garantir conformidade com navegacao por teclado.

[OBS-20260602-03] [02/06/2026 17:45] - [SUCESSO] Correcao reset valor Casa ao copiar mes VALIDADA -> [Resultado] Logs confirmam funcionamento perfeito: conta "Casa" Fixa/categoria Casa detectada e resetada de R$ 1115.63 para R$ 750.00 conforme divisao_casa_minimo. -> [Evidencia] Logs em _contexto-ia/Geral.md mostram backend resetando corretamente e frontend recebendo resposta 200 OK.

[OBS-20260603-01] [03/06/2026 10:30] - [Limpeza] Remocao de codigo morto — Endpoint GET /api/backup deletado de apiRoutes.js, imports orfaos de BackupRepository removidos de apiRoutes.js e FinanceiroRepository.js, arquivos src/repositories/BackupRepository.js e __tests__/repositories/BackupRepository.test.js deletados. Ganho: ~20 linhas, 2 arquivos, 1 endpoint obsoleto.

[OBS-20260603-02] [03/06/2026 10:35] - [Correcao] Teste db.test.js atualizado — Valores de idleTimeoutMillis (30000→60000) e connectionTimeoutMillis (5000→10000) ajustados para alinhar com src/config/db.js. Testes passando.

[OBS-20260603-03] [03/06/2026 10:40] - [Analise] Segunda passagem codehealth — Zero codigo morto, zero arquivos orfaos. Duplicacoes reportadas eram falsos positivos. Codigo saudavel.

[OBS-20260603-04] [03/06/2026 10:48] - [Correcao] Fix modal sucesso copiar link home mobile (public/js/ui.js) — Adicionado setTimeout de 150ms antes de mostrarAviso() para garantir que history.back() complete. Modal de sucesso agora aparece corretamente apos copiar link via menu de contexto.

[OBS-20260603-05] [03/06/2026 10:48] - [Correcao] Fix widget lancamentos campo terceiro Eu/Dodo (src/routes/integrationRoutes.js e src/repositories/LancamentoRepository.js) — Adicionada normalizacao de terceiro 'Eu'/'Dodo'/vazio para NULL na API de integracao e na funcao addLancamento(). Contas com 'Eu' ou 'Dodo' vao para o proprio usuario em vez de criar novo terceiro.
