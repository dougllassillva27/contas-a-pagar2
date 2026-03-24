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
- Criação de componente visual customizado em CSS (`style.css`), alinhado ao *Dark Mode* do design system.
- Implementação de micro-interações de estado: *hover* dinâmico, realce na cor do texto e efeito *glow* neon ao marcar a opção.
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
