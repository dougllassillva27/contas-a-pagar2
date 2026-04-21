-- 1. Tabela Usuarios
-- ==============================================================================
-- 🏛️ DOCUMENTAÇÃO DO SCHEMA DE BANCO DE DADOS (POSTGRESQL)
-- Referência estrutural do sistema Gestão Financeira Cloud
-- ==============================================================================

-- ==============================================================================
-- 1. Tabela Usuarios
-- Responsabilidade: Armazenar as credenciais de acesso do sistema.
-- ==============================================================================
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

-- ==============================================================================
-- 2. Tabela Lancamentos
-- Responsabilidade: Tabela central do sistema. Armazena todas as contas (Fixas, 
-- Cartão e Rendas), incluindo controle de parcelas, status e pertencimento a terceiros.
-- ==============================================================================
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

-- Índices B-Tree para alta performance nas consultas do Dashboard e Relatórios
CREATE INDEX IF NOT EXISTS idx_lancamentos_usuarioid ON Lancamentos(UsuarioId);
CREATE INDEX IF NOT EXISTS idx_lancamentos_datavencimento ON Lancamentos(DataVencimento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON Lancamentos(Tipo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON Lancamentos(Status);

-- ==============================================================================
-- 3. Tabela Anotacoes
-- Responsabilidade: Armazenar os textos do Bloco de Notas (Mensal e Global).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS Anotacoes (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id),
    Mes INT,
    Ano INT,
    Conteudo TEXT,
    UNIQUE(UsuarioId, Mes, Ano)
);

-- ==============================================================================
-- 4. Tabela OrdemCards
-- Responsabilidade: Persistir a ordem de exibição dos painéis de terceiros 
-- na tela principal, configurada via Drag & Drop.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS OrdemCards (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id),
    Nome VARCHAR(255) NOT NULL,
    Ordem INT NOT NULL
);

-- ==============================================================================
-- 5. Tabela FaturaManual
-- Responsabilidade: Gravar o valor digitado manualmente no input "Fatura App" 
-- para servir de comparativo com o total calculado pelo sistema.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS FaturaManual (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id),
    Mes INT NOT NULL,
    Ano INT NOT NULL,
    Valor DECIMAL(18, 2) DEFAULT 0,
    UNIQUE(UsuarioId, Mes, Ano)
);

-- ==============================================================================
-- 6. Tabela TokensPersistentes (Lembrar de mim)
-- Responsabilidade: Gerenciar sessões longas de forma segura usando Hash SHA-256,
-- prevenindo o roubo de senhas ou sequestro de contas em caso de vazamento.
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

-- ==============================================================================
-- 7. Tabela MesesFechados (Controle de Mês Trancado)
-- Responsabilidade: Gravar quais meses foram "trancados" pelo usuário (Month Lock),
-- bloqueando inserções, cópias ou exclusões acidentais naquela competência.
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
-- 8. Tabela Lajeado (Painel Público Customizado)
-- Responsabilidade: Armazenar a configuração visual (em formato JSONB) e o texto 
-- do mural do Portal Público Integrado (Lajeado).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS Lajeado (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT UNIQUE REFERENCES Usuarios(Id) ON DELETE CASCADE,
    Dados JSONB,
    Mural TEXT,
    AtualizadoEm TIMESTAMP DEFAULT NOW()
);

-- ==============================================================================
-- 9. Tabela registros_luz (Módulo Calcular Luz)
-- Responsabilidade: Microsserviço interno. Armazena o histórico das leituras 
-- (anterior/atual) do relógio de energia elétrica para estimativa de gastos.
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
-- 10. Tabela Terceiros (Contatos de Terceiros / WhatsApp)
-- Responsabilidade: Agenda de contatos. Relaciona o nome do terceiro mapeado 
-- nos lançamentos ao seu número de telefone para o disparo de cobranças.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS Terceiros (
    Id SERIAL PRIMARY KEY,
    UsuarioId INT REFERENCES Usuarios(Id) ON DELETE CASCADE,
    Nome VARCHAR(100) NOT NULL,
    Telefone VARCHAR(20),
    UNIQUE(UsuarioId, Nome)
);

-- ==============================================================================
-- 11. Tabela configuracoes (Preferências do Usuário)
-- Responsabilidade: Persistir configurações globais da conta, como o template 
-- de WhatsApp e a preferência de Privacidade Global (Sincronia PC/Mobile).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS configuracoes (
    usuario_id INT PRIMARY KEY REFERENCES Usuarios(Id) ON DELETE CASCADE,
    whatsapp_template TEXT,
    privacidade_global BOOLEAN DEFAULT FALSE
);
