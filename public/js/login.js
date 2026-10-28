// ==============================================================================
// ⚠️ ARQUIVO DESATIVADO — a autenticação persistente não usa mais token em JS
//
// Antes: o front pedia um token de 90 dias em /api/auth/token, guardava em
// localStorage e o reenviava a cada carregamento. Token de longa duração em
// localStorage fica acessível a qualquer XSS e o usuário não conseguia revogar.
//
// Agora: a sessão persistente é o cookie httpOnly "remember_me", definido pelo
// servidor no POST /login quando "lembrar de mim" está marcado. JavaScript da
// página não enxerga esse cookie.
//
// Nenhuma view carrega este arquivo (ele já estava fora do HTML do login). Ele
// segue aqui apenas para limpar os valores antigos que ficaram nos navegadores.
// ==============================================================================

(function limparTokenLegado() {
  try {
    localStorage.removeItem('auth_token_persistente');
    localStorage.removeItem('auth_token_expiry');
  } catch (_) {
    // Modo privado / storage bloqueado: nada a fazer
  }
})();
