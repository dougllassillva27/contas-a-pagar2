// ==============================================================================
// ConfiguracaoRepository — CRUD de Configurações do Usuário
// Com cache em memória (TTL 5min) para evitar queries redundantes
// ==============================================================================

const db = require('../config/db');
// Cache em memória com TTL de 5 minutos
const cache = new Map();
const CACHE_TTL = 5 * 60 * 100; // 5 minutos

async function getConfiguracoes(userId) {
  // Verifica cache primeiro
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
   return cached.data;
  }
  // Busca do banco
  const res = await db.query('SELECT * FROM configuracoes WHERE usuario_id = $1', [userId]);
  const data = res.rows[0] || {};
  // Atualiza cache
  cache.set(userId, { data, timestamp: Date.now() });
  return data;
}
function invalidateCache(userId) {
  cache.delete(userId);
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
