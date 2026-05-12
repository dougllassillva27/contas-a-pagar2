// ==============================================================================
// ConfiguracaoRepository — CRUD de Configurações do Usuário
// ==============================================================================

const db = require('../config/db');

async function getConfiguracoes(userId) {
  const res = await db.query('SELECT * FROM configuracoes WHERE usuario_id = $1', [userId]);
  // Retorna um objeto vazio como fallback para evitar erros de desestruturação
  return res.rows[0] || {};
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
}

module.exports = { getConfiguracoes, saveConfiguracao };
