// ==============================================================================
// 🔐 Política mínima de senha
// Aplicada no cadastro e na troca de senha. Mantida simples de propósito: o
// objetivo é impedir senha trivial em um app que guarda dados financeiros.
// ==============================================================================

const TAMANHO_MINIMO = 12;
const TAMANHO_MAXIMO = 128;

// Senhas óbvias que passariam no tamanho mínimo
const SENHAS_PROIBIDAS = new Set([
  '123456789012',
  'senha123456',
  'senha1234567',
  'qwertyuiop12',
  'abcdefghijkl',
  'admin1234567',
  'financeiro12',
  'contas123456',
]);

/**
 * Valida a senha escolhida.
 * @param {string} senha
 * @param {string} [login] — usado para recusar senha igual/derivada do login
 * @returns {{ ok: boolean, erro?: string }}
 */
function validarSenha(senha, login = '') {
  if (typeof senha !== 'string' || senha.length === 0) {
    return { ok: false, erro: 'Informe uma senha.' };
  }

  if (senha.length < TAMANHO_MINIMO) {
    return { ok: false, erro: `A senha deve ter pelo menos ${TAMANHO_MINIMO} caracteres.` };
  }

  if (senha.length > TAMANHO_MAXIMO) {
    return { ok: false, erro: `A senha não pode exceder ${TAMANHO_MAXIMO} caracteres.` };
  }

  const minuscula = senha.toLowerCase();
  const loginNormalizado = String(login || '').trim().toLowerCase();

  if (loginNormalizado && minuscula === loginNormalizado) {
    return { ok: false, erro: 'A senha não pode ser igual ao login.' };
  }

  if (SENHAS_PROIBIDAS.has(minuscula)) {
    return { ok: false, erro: 'Esta senha é muito comum. Escolha outra.' };
  }

  if (new Set(senha).size === 1) {
    return { ok: false, erro: 'A senha não pode repetir o mesmo caractere.' };
  }

  return { ok: true };
}

module.exports = { validarSenha, TAMANHO_MINIMO, TAMANHO_MAXIMO };
