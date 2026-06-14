// ==============================================================================
// ConfiguracaoRepository — CRUD de Configurações do Usuário
// Com cache em memória (TTL 5min) para evitar queries redundantes
// ==============================================================================

const db = require('../config/db');
const cacheHelpers = require('../helpers/cacheHelpers');

async function getConfiguracoes(userId) {
  const cacheKey = `configuracoes:${userId}`;
  const cached = cacheHelpers.get(cacheKey);
  if (cached) return cached;

  const res = await db.query('SELECT * FROM configuracoes WHERE usuario_id = $1', [userId]);
  const data = res.rows[0] || {};
  cacheHelpers.set(cacheKey, data, 5 * 60 * 1000);
  return data;
}

function invalidateCache(userId) {
  cacheHelpers.invalidate(`configuracoes:${userId}`);
}
async function saveConfiguracao(userId, chave, valor) {
 // Validação para evitar SQL Injection, permitindo apenas colunas conhecidas
 const colunasPermitidas = ['whatsapp_template', 'privacidade_global', 'divisao_casa_minimo', 'regras_sync', 'onboarding_completed'];
 if (!colunasPermitidas.includes(chave)) {
    throw new Error('Chave de configuração inválida.');
  }

  // Usamos a sintaxe de placeholder do pg para o nome da coluna de forma segura
  const query = `
    INSERT INTO configuracoes (usuario_id, ${chave}) VALUES ($1, $2)
    ON CONFLICT (usuario_id) DO UPDATE SET ${chave} = EXCLUDED.${chave}
 `;

  await db.query(query, [userId, valor]);

  // Invalida cache após salvar
  invalidateCache(userId);
}

module.exports = { getConfiguracoes, saveConfiguracao, invalidateCache };
