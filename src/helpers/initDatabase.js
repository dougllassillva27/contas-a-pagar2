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
 * 4. Cria tabela TokensPersistentes (se não existir)
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

    // 2.5 Coluna ConferidoExtrato (para separar do checkbox de Últimas Edições)
    await db.query(` 
      ALTER TABLE Lancamentos
      ADD COLUMN IF NOT EXISTS ConferidoExtrato BOOLEAN DEFAULT false
     `);

    // 3. Adiciona colunas Mes e Ano na tabela Anotacoes se não existirem
    // Se a tabela já existia e tinha dados, eles ficarão com Mes e Ano = NULL temporariamente
    await db.query(` 
      ALTER TABLE Anotacoes
      ADD COLUMN IF NOT EXISTS Mes INT,
      ADD COLUMN IF NOT EXISTS Ano INT
     `);

    // Atualiza os registros antigos (que não tem mês/ano) para o mês/ano atual
    // Assim não perdemos nenhuma anotação antiga e ela fica no mês vigente.
    const hoje = new Date();
    await db.query(
      ` 
      UPDATE Anotacoes
      SET Mes = $1, Ano = $2
      WHERE Mes IS NULL OR Ano IS NULL
     `,
      [hoje.getMonth() + 1, hoje.getFullYear()]
    );

    // 4. Constraints UNIQUE para UPSERTs
    await db.query(` 
      CREATE UNIQUE INDEX IF NOT EXISTS uq_faturamanual_usuario_mes_ano
      ON FaturaManual (UsuarioId, Mes, Ano)
     `);

    // Remove o índice antigo que não considerava Mês e Ano, caso exista
    await db.query(`DROP INDEX IF EXISTS uq_anotacoes_usuario `);

    // Habilita a nova constraint UNIQUE por Usuario, Mês e Ano
    await db.query(` 
      CREATE UNIQUE INDEX IF NOT EXISTS uq_anotacoes_usuario_mes_ano
      ON Anotacoes (UsuarioId, Mes, Ano)
     `);

    // 5. Tabela TokensPersistentes (Lembrar de mim) - Ajustada com nomes corretos
    await db.query(`
      CREATE TABLE IF NOT EXISTS TokensPersistentes (
          Id SERIAL PRIMARY KEY,
          UsuarioId INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
          Token VARCHAR(255) NOT NULL UNIQUE,
          DataExpiracao TIMESTAMP NOT NULL,
          CriadoEm TIMESTAMP DEFAULT NOW()
      )
    `);

    // Índices para performance
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tokens_token 
      ON TokensPersistentes(Token)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_tokens_expires 
      ON TokensPersistentes(DataExpiracao)
    `);

    // 6. Tabela MesesFechados
    await db.query(`
      CREATE TABLE IF NOT EXISTS MesesFechados (
          Id SERIAL PRIMARY KEY,
          UsuarioId INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
          Mes INT NOT NULL,
          Ano INT NOT NULL,
          DataFechamento TIMESTAMP DEFAULT NOW(),
          UNIQUE(UsuarioId, Mes, Ano)
      )
    `);

    console.log('✅ Database inicializado com sucesso.');
  } catch (err) {
    console.error('❌ Erro ao inicializar o database:', err.message);
  }
}

module.exports = initDatabase;
