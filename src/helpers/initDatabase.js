// ==============================================================================
// initDatabase — Inicializações de schema executadas no startup
//
// Move as migrações que antes ficavam no construtor do FinanceiroRepository
// para uma função explícita, chamada apenas uma vez no app.js ao iniciar.
// Isso elimina o side-effect escondido no construtor (Clean Code).
// ==============================================================================

const db = require('../config/db');

/**
 * Executa as inicializações de schema necessárias.
 * Deve ser chamada UMA VEZ no startup do servidor.
 *
 * Operações:
 * 1. Cria a tabela OrdemCards (se não existir)
 * 2. Adiciona coluna DataCriacao em Lancamentos (se não existir)
 * 3. Cria índices UNIQUE para queries UPSERT funcionarem
 */
async function initDatabase() {
  try {
    // 1. Tabela OrdemCards
    await db.query(`
      CREATE TABLE IF NOT EXISTS OrdemCards (
          Id SERIAL PRIMARY KEY,
          Nome VARCHAR(255) NOT NULL,
          Ordem INT NOT NULL,
          UsuarioId INT DEFAULT 1
      )
    `);

    // 2. Coluna DataCriacao em Lancamentos
    await db.query(`
      ALTER TABLE Lancamentos
      ADD COLUMN IF NOT EXISTS DataCriacao TIMESTAMP DEFAULT NOW()
    `);

    // 3. Constraints UNIQUE para UPSERTs
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_faturamanual_usuario_mes_ano
      ON FaturaManual (UsuarioId, Mes, Ano)
    `);
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_anotacoes_usuario
      ON Anotacoes (UsuarioId)
    `);

    console.log('✅ Database inicializado com sucesso.');
  } catch (err) {
    console.error('❌ Erro ao inicializar o database:', err.message);
  }
}

module.exports = initDatabase;
