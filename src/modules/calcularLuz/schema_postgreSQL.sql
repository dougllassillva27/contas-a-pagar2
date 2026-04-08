-- =============================================================================
-- Schema: Estimativa de Conta de Luz
-- Banco: PostgreSQL (Neon)
-- =============================================================================

-- DDL para criação da tabela de registros de energia elétrica (Versão Simplificada)
CREATE TABLE IF NOT EXISTS registros_luz (
    id SERIAL PRIMARY KEY,
    mes_referencia VARCHAR(50) NOT NULL,
    leitura_anterior NUMERIC(10, 2) NOT NULL,
    leitura_atual NUMERIC(10, 2) NOT NULL,
    consumo_kwh NUMERIC(10, 2) NOT NULL,
    valor_estimado NUMERIC(10, 2) NOT NULL,
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NOTA DE MIGRAÇÃO: 
-- Se você já possui a tabela antiga rodando no Neon, execute o comando abaixo no console SQL do Neon 
-- para remover as colunas antigas em vez de dar DROP na tabela e perder seu histórico:
-- ALTER TABLE registros_luz DROP COLUMN IF EXISTS valor_conta;
-- ALTER TABLE registros_luz DROP COLUMN IF EXISTS consumo_conta;


