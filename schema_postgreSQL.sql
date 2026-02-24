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
    Conteudo TEXT
);

-- Insere anotações iniciais
INSERT INTO Anotacoes (UsuarioId, Conteudo) VALUES (1, ''), (2, '')
ON CONFLICT DO NOTHING; 
-- (Nota: Postgres não tem conflito direto em INSERT sem chave, 
-- se rodar varias vezes pode duplicar, ideal limpar antes se for recriar)

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