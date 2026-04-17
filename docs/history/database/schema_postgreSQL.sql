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
    Ordem INT DEFAULT 9999,
    Conferido BOOLEAN DEFAULT FALSE,
    DataCriacao TIMESTAMP DEFAULT NOW(),
    ConferidoExtrato BOOLEAN DEFAULT FALSE
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
    Valor DECIMAL(18, 2) DEFAULT 0,
    UNIQUE(UsuarioId, Mes, Ano)
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

-- Índice para busca rápida por token
CREATE UNIQUE INDEX IF NOT EXISTS idx_tokens_token ON TokensPersistentes(Token);

-- Índice para limpeza de tokens expirados
CREATE INDEX IF NOT EXISTS idx_tokens_expires ON TokensPersistentes(DataExpiracao);

-- Limpeza automática de tokens expirados (opcional - rodar periodicamente)
-- 6. Tabela MesesFechados (Controle de Mês Trancado)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS MesesFechados (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
    Mes INT NOT NULL,
    Ano INT NOT NULL,
    DataFechamento TIMESTAMP DEFAULT NOW(),
    UNIQUE(UsuarioId, Mes, Ano)
);

-- ==============================================================================
-- 7. Tabela Lajeado (Painel Público Customizado)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS Lajeado (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT UNIQUE REFERENCES Usuarios(Id) ON DELETE CASCADE,
    Dados JSONB,
    Mural TEXT,
    AtualizadoEm TIMESTAMP DEFAULT NOW()
);

-- ==============================================================================
-- 8. Tabela registros_luz (Módulo Calcular Luz)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS registros_luz (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
    mes_referencia VARCHAR(50) NOT NULL,
    leitura_anterior NUMERIC(10, 2) NOT NULL,
    leitura_atual NUMERIC(10, 2) NOT NULL,
    consumo_kwh NUMERIC(10, 2) NOT NULL,
    valor_estimado NUMERIC(10, 2) NOT NULL,
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 9. Tabela Terceiros (Contatos de Terceiros / WhatsApp)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS Terceiros (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
    Nome VARCHAR(100) NOT NULL,
    Telefone VARCHAR(20),
    UNIQUE(UsuarioId, Nome)
);

-- ==============================================================================
-- 10. Tabela configuracoes (Preferências do Usuário)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS configuracoes (
    usuario_id INT PRIMARY KEY REFERENCES Usuarios(Id) ON DELETE CASCADE,
    whatsapp_template TEXT
);
