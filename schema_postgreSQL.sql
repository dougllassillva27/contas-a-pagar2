-- 1. Tabela Usuarios
CREATE TABLE IF NOT EXISTS Usuarios (
    Id SERIAL PRIMARY KEY,
    Nome VARCHAR(50) NOT NULL,
    Login VARCHAR(50) NOT NULL UNIQUE,
    SenhaHash VARCHAR(255) NOT NULL
);

-- Insere usuários padrão se não existirem
INSERT INTO Usuarios (Nome, Login, SenhaHash) 
VALUES 
('Dodo', 'dodo', '$2a$10$E.gH1.J1.K1.L1.M1.N1.O1P2Q3R4S5T6U7V8W9X0Y1Z2'),
('Vitoria', 'vitoria', '$2a$10$E.gH1.J1.K1.L1.M1.N1.O1P2Q3R4S5T6U7V8W9X0Y1Z2')
ON CONFLICT (Login) DO NOTHING;

-- 2. Tabela Lancamentos
CREATE TABLE IF NOT EXISTS Lancamentos (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id),
    Descricao VARCHAR(255) NOT NULL,
    Valor DECIMAL(18, 2) NOT NULL,
    Tipo VARCHAR(20) NOT NULL, -- 'RENDA', 'FIXA', 'CARTAO'
    Categoria VARCHAR(50), -- 'Salário', 'Extra', etc
    Status VARCHAR(20) DEFAULT 'PENDENTE',
    DataVencimento DATE NOT NULL,
    ParcelaAtual INT,
    TotalParcelas INT,
    NomeTerceiro VARCHAR(100),
    Ordem INT DEFAULT 0,
    Conferido BOOLEAN DEFAULT FALSE
);

-- 3. Tabela Anotacoes
CREATE TABLE IF NOT EXISTS Anotacoes (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id),
    Mes INT,
    Ano INT,
    Conteudo TEXT,
    UNIQUE(UsuarioId, Mes, Ano)
);

-- Insere anotações iniciais
INSERT INTO Anotacoes (UsuarioId, Mes, Ano, Conteudo) VALUES (1, 1, 2025, ''), (2, 1, 2025, '')
ON CONFLICT DO NOTHING; 

-- 4. Tabela OrdemCards
CREATE TABLE IF NOT EXISTS OrdemCards (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id),
    Nome VARCHAR(255) NOT NULL,
    Ordem INT NOT NULL
);

-- 5. Tabela FaturaManual
CREATE TABLE IF NOT EXISTS FaturaManual (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id),
    Mes INT NOT NULL,
    Ano INT NOT NULL,
    Valor DECIMAL(18, 2) DEFAULT 0
);

-- ==============================================================================
-- Tabela de Tokens Persistentes (Lembrar de mim)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS TokensPersistentes (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
    Token VARCHAR(255) NOT NULL UNIQUE,
    DataExpiracao TIMESTAMP NOT NULL,
    CriadoEm TIMESTAMP DEFAULT NOW()
);

-- ==============================================================================
-- MIGRATION: Ajuste caso a tabela já exista com estrutura antiga (ExpiresAt)
-- ==============================================================================
DO $$
BEGIN
    ALTER TABLE TokensPersistentes ALTER COLUMN Token TYPE VARCHAR(255);
    ALTER TABLE TokensPersistentes ADD COLUMN IF NOT EXISTS DataExpiracao TIMESTAMP;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tokenspersistentes' AND column_name='expiresat') THEN
        EXECUTE 'UPDATE TokensPersistentes SET DataExpiracao = ExpiresAt WHERE DataExpiracao IS NULL';
        ALTER TABLE TokensPersistentes DROP COLUMN ExpiresAt;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tokenspersistentes' AND column_name='revogado') THEN
        ALTER TABLE TokensPersistentes DROP COLUMN Revogado;
    END IF;
END $$;

-- Índice para busca rápida por token
CREATE UNIQUE INDEX IF NOT EXISTS idx_tokens_token ON TokensPersistentes(Token);

-- Índice para limpeza de tokens expirados
CREATE INDEX IF NOT EXISTS idx_tokens_expires ON TokensPersistentes(DataExpiracao);

-- Limpeza automática de tokens expirados (opcional - rodar periodicamente)
-- DELETE FROM TokensPersistentes WHERE DataExpiracao < NOW();
