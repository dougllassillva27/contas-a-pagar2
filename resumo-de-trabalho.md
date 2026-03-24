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
