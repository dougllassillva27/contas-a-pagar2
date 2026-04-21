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
    // Índices de Performance (B-Tree) para queries pesadas de Lancamentos
    await db.query('CREATE INDEX IF NOT EXISTS idx_lancamentos_usuarioid ON Lancamentos(UsuarioId)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_lancamentos_datavencimento ON Lancamentos(DataVencimento)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON Lancamentos(Tipo)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON Lancamentos(Status)');

    // 1. Tabela OrdemCards
    await db.query(` 
      CREATE TABLE IF NOT EXISTS OrdemCards (
          Id SERIAL PRIMARY KEY,
          Nome VARCHAR(255) NOT NULL,
          Ordem INT NOT NULL,
          UsuarioId INT DEFAULT 1
      )
     `);

    // 4. Constraints UNIQUE para UPSERTs
    await db.query(` 
      CREATE UNIQUE INDEX IF NOT EXISTS uq_faturamanual_usuario_mes_ano
      ON FaturaManual (UsuarioId, Mes, Ano)
     `);

    // Remove o índice antigo que não considerava Mês e Ano, caso exista
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

    // 7. Tabela Lajeado (Para painel customizado público com suporte a JSONB)
    await db.query(`
      CREATE TABLE IF NOT EXISTS Lajeado (
          Id SERIAL PRIMARY KEY,
          UsuarioId INT UNIQUE REFERENCES Usuarios(Id) ON DELETE CASCADE,
          Dados JSONB,
          Mural TEXT,
          AtualizadoEm TIMESTAMP DEFAULT NOW()
      )
    `);

    // 8. Tabela registros_luz (Módulo Calcular Luz integrado)
    await db.query(`
      CREATE TABLE IF NOT EXISTS registros_luz (
          id SERIAL PRIMARY KEY,
          usuario_id INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
          mes_referencia VARCHAR(50) NOT NULL,
          leitura_anterior NUMERIC(10, 2) NOT NULL,
          leitura_atual NUMERIC(10, 2) NOT NULL,
          consumo_kwh NUMERIC(10, 2) NOT NULL,
          valor_estimado NUMERIC(10, 2) NOT NULL,
          data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Tabela Terceiros (Contatos para WhatsApp)
    await db.query(`
      CREATE TABLE IF NOT EXISTS terceiros (
          id SERIAL PRIMARY KEY,
          usuario_id INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
          nome VARCHAR(100) NOT NULL,
          telefone VARCHAR(20),
          UNIQUE(usuario_id, nome)
      )
    `);

    // 10. Tabela configuracoes (Preferências do usuário)
    await db.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
          usuario_id INT PRIMARY KEY REFERENCES Usuarios(Id) ON DELETE CASCADE,
          whatsapp_template TEXT
      )
    `);

    console.log('✅ Database inicializado com sucesso.');
  } catch (err) {
    console.error('❌ Erro ao inicializar o database:', err.message);
  }
}

module.exports = initDatabase;
