// ==============================================================================
// ✅ login.js — Gerenciamento de Token Persistente
// ==============================================================================

const STORAGE_KEY = 'auth_token_persistente';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

// ==============================================================================
// Verifica token persistente ao carregar página de login
// ==============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem(STORAGE_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (token && expiry) {
    // Verifica se token ainda é válido
    if (new Date(expiry) > new Date()) {
      // Tenta validar token no backend
      try {
        const res = await fetch('/api/auth/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (data.valid && data.user) {
          // Token válido → redireciona para dashboard
          window.location.href = '/';
          return;
        }
      } catch (err) {
        console.error('Erro ao validar token:', err);
      }
    }

    // Token inválido/expirado → limpa storage
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }
});

// ==============================================================================
// Intercepta submit do formulário para gerar token se "Lembrar de mim" marcado
// ==============================================================================
const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    const lembrarCheckbox = document.getElementById('lembrar');
    const passwordInput = document.getElementById('password');

    // Se "Lembrar de mim" NÃO está marcado, deixa o form seguir normal
    if (!lembrarCheckbox || !lembrarCheckbox.checked) {
      return; // Submit normal do form
    }

    // Previne submit normal para processar token primeiro
    e.preventDefault();

    const password = passwordInput.value;

    try {
      // 1. Faz login normal via POST
      const loginRes = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `password=${encodeURIComponent(password)}`,
        redirect: 'manual', // Não segue redirect automaticamente
      });

      // 2. Verifica se login foi bem-sucedido (redirect para /)
      if (loginRes.status === 302 && loginRes.headers.get('location') === '/') {
        // 3. Login OK → gera token persistente
        // Precisamos do userId → faz request para validar sessão
        const sessionRes = await fetch('/api/auth/me');
        
        if (sessionRes.ok) {
          const userData = await sessionRes.json();
          
          // 4. Gera token persistente
          const tokenRes = await fetch('/api/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userData.id }),
          });

          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            
            // 5. Armazena token no localStorage
            localStorage.setItem(STORAGE_KEY, tokenData.token);
            localStorage.setItem(TOKEN_EXPIRY_KEY, tokenData.expiresAt);
          }
        }

        // 6. Redireciona para dashboard
        window.location.href = '/';
      } else {
        // Login falhou → mostra erro
        const errorData = await loginRes.json().catch(() => ({}));
        alert(errorData.error || 'Senha incorreta!');
      }
    } catch (err) {
      console.error('Erro no login:', err);
      alert('Erro de conexão. Tente novamente.');
    }
  });
}

// ==============================================================================
// Função para logout (chamar antes de redirecionar para /logout)
// ==============================================================================
async function logoutPersistente() {
  const token = localStorage.getItem(STORAGE_KEY);
  
  if (token) {
    try {
      await fetch('/api/auth/token', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      console.error('Erro ao revogar token:', err);
    }
  }

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}