# Resumo de Trabalho - Gestão Financeira

Arquivo de log de modificações e controle de progresso.

---

### [2026-03-24] Fix: Persistência de Sessão "Lembrar de Mim"

- Instalado pacote `cookie-parser` para gerenciamento de tokens persistentes.
- Implementada geração de cookie `remember_me` (90 dias) no `publicRoutes.js` (POST /login).
- Criado `createPersistAuthMiddleware` no `src/middlewares/auth.js` para restaurar sessões automaticamente.
- Atualizado `app.js` para integrar o middleware de persistência antes da proteção de rotas.
- Ajustada lógica de Logout para revogar tokens persistentes no banco de dados e limpar cookies.
- Adicionados logs detalhados para monitorar a restauração de sessões: `[PERSIST-AUTH] ✅ Sessão restaurada`.

### [2026-03-24] UI/UX: Melhoria no Checkbox de Login

- Refatoração da estrutura HTML do checkbox "Lembrar de mim" no `login.ejs`, removendo estilos inline em prol de classes limpas.
- Criação de componente visual customizado em CSS (`style.css`), alinhado ao _Dark Mode_ do design system.
- Implementação de micro-interações de estado: _hover_ dinâmico, realce na cor do texto e efeito _glow_ neon ao marcar a opção.
- Melhoria no espaçamento e respiro em relação ao botão de ação principal.

### [2026-03-24] Banco de Dados: Migração da Tabela TokensPersistentes

- Ajuste e correção da estrutura da tabela `TokensPersistentes` no banco PostgreSQL (Neon DB).
- Criação de script de migração inteligente no `schema_postgreSQL.sql` para alterar `ExpiresAt` para `DataExpiracao` e ajustar o tamanho do `Token` para 255 caracteres sem perder dados.
- Atualização do `src/helpers/initDatabase.js` para padronizar a criação da tabela durante o startup do sistema e evitar recriações conflitantes.

### [2026-03-24] Backend: Refatoração do Middleware de Autenticação Persistente

- Implementação de `buscarUsuarioPorToken` no `UsuarioRepository.js` com `JOIN` cruzado para validar segurança e data de expiração (`DataExpiracao > NOW()`).
- Injeção de logs avançados (`[AUTH-DEBUG]`) no middleware de sessão web (`auth.js`) para monitorar o ciclo de vida e reidratação de cookies e sessions em tempo real via Render.
- Estabelecimento de tratativas de fallback que limpam o cookie (`clearCookie`) caso seja considerado adulterado ou obsoleto no banco.

### [2026-03-24] Backend: Correção de Crash no Deploy (Render)

- Removida chamada obsoleta para `createPersistAuthMiddleware` no `app.js`.
- Fluxo de middleware consolidado diretamente no `authMiddleware` para evitar erro de inicialização `is not a function`.

### [2026-03-24] Backend: Homologação e Limpeza da Autenticação Persistente

- Validação bem-sucedida da reidratação de sessões em ambiente de produção (Render).
- Remoção de verbosidade de logs de diagnóstico (`[AUTH-DEBUG]`) no `authMiddleware` para manter a limpeza dos logs operacionais e redução de I/O em produção.

### [2026-03-25] Frontend: Correção na URL de compartilhamento de terceiros (desktop)

- **fix**: Correção na URL de compartilhamento de terceiros (desktop).
  - A função de cópia/abertura de link via modal não estava injetando o `userId` logado, o que gerava uma URL incorreta (`/contas/Nome`).
  - Alteradas as funções `abrirLinkCompartilhado` e `copiarLinkCompartilhado` no arquivo `public/js/app.js` para capturarem o `data-userid` do `body` e gerarem o link no formato correto: `/contas/:userId/:nomeTerceiro`.

### [2026-03-26] Arquitetura: Reorganização Estrutural e Limpeza da Raiz

- **feat**: Centralização de módulos funcionais em `src/modules/`.
  - Pasta `botTelegram/` movida para `src/modules/botTelegram/`.
  - Pasta `calcularLuz/` movida para `src/modules/calcularLuz/`.
- **refactor**: Atualização de caminhos e referências de módulos.
  - Ajustados `require` no `src/app.js` e caminhos relativos em `src/modules/botTelegram/telegramBot.js`.
  - Atualizado script `telegram:setup` no `package.json`.
- **docs**: Consolidação de documentação e arquivamento histórico.
  - Mesclados `guia_integracao.md` e `postgre_conection.md` ao `README.md` principal.
  - Criado `docs/history/database/` para armazenar scripts SQL e JS históricos de migração/deploy.
  - Exclusão da pasta `backup/` redundante.
- **cleanup**: Consolidação de configs de desenvolvimento.
  - Movida configuração do Jest de `jest.config.js` diretamente para o `package.json`, eliminando mais um arquivo da raiz.

### [2026-03-26] Fix: Correção de Caminhos Após Refatoração

- **fix**: Corrigidos caminhos de importação relativos no módulo `botTelegram`.
  - Atualizados `responseFormatter.js` e `messageParser.js` para buscarem `constants` e `helpers` em `../../` (subindo dois níveis).
  - Corrigidos os caminhos nos arquivos de teste em `__tests__/botTelegram/` para apontarem para o novo local em `src/modules/botTelegram/`.
  - Verificação realizada via execução de testes (`npx jest`), com 100% de aprovação (23 testes).

### [2026-03-26] Auth: Login Dedicado para Vitória via Senha Mestra

- **feat**: Implementado fluxo de login baseado em senha para múltiplos usuários.
  - O sistema agora identifica o usuário automaticamente pelo segredo digitado na tela de login (Dodo via `SENHA_MESTRA` e Vitória via `SENHA_VITORIA`).
  - Atualizado `src/app.js` para carregar ambas as variáveis de ambiente e passá-las ao roteador.
  - Refatorada lógica de autenticação no `src/routes/publicRoutes.js` para associar senhas aos IDs de banco (1 e 2).
- **security**: Mantida a simplicidade da UI original, eliminando a necessidade de um campo "Usuário", o que preserva a experiência limpa e rápida.
- **db**: Confirmada a existência dos usuários com IDs 1 (Dodo) e 2 (Vitoria) na tabela `Usuarios` do banco PostgreSQL (Neon).

### [2026-03-26] Commit das Alterações de Login e Estrutura

- **feat**: implementar login dedicado com múltiplas senhas mestras para Vitória
  - carregar `SENHA_VITORIA` do ambiente
  - mapear senhas aos IDs de usuário no `publicRoutes`
  - garantir isolamento de sessão por ID de usuário logado

### [2026-03-26] UI/UX: Implementação de Menu Hamburguer (Mobile)

- **feat**: Migração estrutural da barra de topo (desktop) para um Menu Lateral Hamburger invisível no Desktop e ativo (FAB) em resoluções menores.
- **style**: Glassmorphism aplicado ao sidebar e blur nativo na página durante exibição do menu lateral.
- **fix**: Adequação do Jest no auth.test.js onde mocks incompletos sem obj de query/cookies causavam falhas inesperadas de teste após instanciamento em vazio.
- **QA**: Validação isolada de todos os modais agora fechando o menu lateral preventivamente ao exibirem via callback.

### [2026-03-26] UI/UX: Unificação do Menu Lateral (Desktop e Mobile)

- **feat**: O Menu Hamburguer Flutuante (FAB) foi adotado globalmente como sistema de navegação da aplicação web, resultando em uma interface Desktop purificada de ruídos.
- **style**: Removida a classe .desktop-actions e dezenas de botões do header.ejs, mantendo o topo da tela estritamente para leitura (Mês atual).
- **css**: Regras de media querie removidas para expor Sidebar nativa responsiva em qualquer monitor com glassmorphism contínuo.
- **QA**: Testes e checagens isolados realizados por Jest para certificar ausência de efeitos colaterais na lógica geral.

### [2026-03-26] UI/UX: Hotfix de Correção do Grid Mobile

- **fix**: Correção de escopo de classes na Media Query de 768px que havia quebrado a quebra de linha de cards no Mobile. A chave de fechamento perdida no refactor Desktop foi restaurada em .header-actions, reisolando o grid-template de colunas.

### [2026-03-26] Infra/Docs: Migração de Monitoramento Keep-Alive

- **docs**: Atualização do README.md substituindo a documentação de monitoramento via UptimeRobot pelo método funcional via Google Apps Script (Script de Cloud Function baseado no tempo para drible do isolamento de bots gratuitos da Render).

### [2026-03-27] Infra/Setup: Inicialização do Master Skill

- **feat**: Inicializada a estrutura do `master-skill` no projeto.
- **config**: Criado arquivo `master-skill-config.json` com framework `Google Antigravity` e path de skills `.agent/skills`.
- **docs**: Atualizado o `task.md` e verificado o `resumo-de-trabalho.md` para manutenção do histórico de Arquiteto Sênior.

## [2026-03-29] - Conferência em Lote no Relatório

**Objetivo:** Permitir a marcação e desmarcação em massa de contas (flag `ConferidoExtrato`) diretamente pela tela de relatório, melhorando a usabilidade.

**Implementações realizadas:**

1. **Frontend (`src/views/relatorio.ejs`)**:
   - Adicionado um listener de clique com o botão direito (`contextmenu`) nos cards de pessoas.
   - Criado um menu de contexto flutuante com as opções "Marcar Todas" e "Desmarcar Todas".
   - Implementada "UI Otimista" (Optimistic UI) para atualizar visualmente a tabela, alterando os checkboxes, cores da linha e texto do badge instantaneamente antes mesmo da resposta do servidor.
2. **Backend (`src/routes/apiRoutes.js` e `src/repositories/LancamentoRepository.js`)**:
   - Criada a nova rota `POST /api/lancamentos/conferido-extrato-lote` focada em performance.
   - Adicionada a função de repositório `updateConferidoExtratoLote` que recebe um array de IDs e atualiza todos em uma única query com a instrução `ANY($2::int[])`.
3. **Testes (`__tests__/integration/api.test.js`)**:
   - Adicionado novo bloco de testes validando os cenários de marcação (`true`) e desmarcação (`false`) enviando uma matriz de IDs, com limpeza inteligente dos dados de teste no `afterAll`.

# [2026-03-29] - Correção do Layout de Relatórios e Menu de Contexto

### Problema

Durante a implementação de uma nova funcionalidade no frontend, uma substituição agressiva no arquivo `relatorio.ejs` causou a quebra do layout, resultando em uma página em branco com vazamento de CSS.

### O que foi feito

1. **Restauração do Arquivo Original:** O arquivo `relatorio.ejs` foi restaurado ao seu estado funcional anterior.
2. **Reintegração Segura do CSS:** Os estilos do menu de contexto foram adicionados adequadamente dentro da tag `<style>`.
3. **Menu de Contexto Flutuante:** O HTML correspondente ao menu foi incluído no local correto da página.
4. **JavaScript Focado no Elemento:** O comportamento de clique com o botão direito foi ajustado para selecionar e agir apenas sobre a seção (ou pessoa) específica clicada, garantindo precisão e evitando que ações em lote afetassem itens indesejados.

### Impacto

- A página de relatórios (`/relatorio`) voltou a ser renderizada corretamente.
- A nova funcionalidade de menu de contexto agora atua no escopo correto.

## [2026-03-29l] - Correção Visual e Melhoria nas Ações em Lote do Relatório

### Problema

Durante a introdução de uma feature de menu de contexto, o layout Dark Mode original da página de relatórios (`relatorio.ejs`) foi corrompido, perdendo os estilos, o gráfico (Chart.js) e as opções de exportação (SheetJS). Além disso, a ação em lote limitava-se a marcar apenas um bloco de usuário por vez, o que reduzia a agilidade em telas cheias.

### O que foi feito

1. **Restauração do Layout:** O arquivo `relatorio.ejs` foi 100% restaurado para seu visual Dark Mode original, com os scripts e recursos visuais funcionando.
2. **Menu de Contexto Global:** O script de clique com o botão direito (`contextmenu`) foi refatorado para escutar a tela toda (exceto na barra de ações).
3. **Seleção em Massa (Global):** A ação "Marcar TODAS as contas" agora mapeia globalmente todas as checkboxes `.chk-conferido` da tela, aplicando a atualização visual (Optimistic UI) a todas simultaneamente antes de acionar a API de lote do backend.

### Impacto

- O frontend do relatório voltou a ter sua estética e funcionalidades premium originais.
- A conferência de extrato mensal ficou exponencialmente mais rápida, permitindo liquidar o relatório inteiro com apenas 2 cliques.
