
-- produtos 
CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    preco NUMERIC(10, 2) NOT NULL DEFAULT 0,
    quantidade INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE produtos ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS codigo VARCHAR(50) UNIQUE;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS peso NUMERIC(10, 3);

-- armazens
CREATE TABLE IF NOT EXISTS armazens (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    localizacao VARCHAR(255) NOT NULL,
    capacidade_maxima INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'ativo',
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- transportadoras
CREATE TABLE IF NOT EXISTS transportadoras (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    contato VARCHAR(100),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    login VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(30) NOT NULL DEFAULT 'operador' CHECK (perfil IN ('administrador', 'gerente_logistico', 'operador')),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- veiculos
CREATE TABLE IF NOT EXISTS veiculos (
    id SERIAL PRIMARY KEY,
    placa VARCHAR(10) NOT NULL UNIQUE,
    modelo VARCHAR(100) NOT NULL,
    capacidade_carga NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'disponivel',
    transportadora_id INTEGER REFERENCES transportadoras(id) ON DELETE SET NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- entregas
CREATE TABLE IF NOT EXISTS entregas (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    quantidade INTEGER NOT NULL DEFAULT 1,
    destino VARCHAR(255) NOT NULL,
    data_prevista DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- estoque
CREATE TABLE IF NOT EXISTS estoque (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    armazem_id INTEGER NOT NULL REFERENCES armazens(id) ON DELETE CASCADE,
    quantidade_disponivel INTEGER NOT NULL DEFAULT 0,
    UNIQUE (produto_id, armazem_id)
);

-- rastreamento
CREATE TABLE IF NOT EXISTS rastreamento (
    id SERIAL PRIMARY KEY,
    entrega_id INTEGER NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
    localizacao_atual VARCHAR(255) NOT NULL,
    data_hora TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'em transito'
);

-- movimentacoes
CREATE TABLE IF NOT EXISTS movimentacoes (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    origem VARCHAR(255) NOT NULL,
    destino VARCHAR(255) NOT NULL,
    data_movimentacao TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ex
INSERT INTO armazens (nome, localizacao, capacidade_maxima, status)
VALUES ('Armazém Central', 'São Paulo, SP', 5000, 'ativo')
ON CONFLICT DO NOTHING;

INSERT INTO transportadoras (nome, cnpj, contato)
VALUES ('Transportadora Rápida Ltda', '12.345.678/0001-90', '(11) 91234-5678')
ON CONFLICT DO NOTHING;