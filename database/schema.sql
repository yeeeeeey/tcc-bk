-- =============================================================================
-- Schema do Bankai (PostgreSQL)
--
-- Pode ser executado várias vezes ("npm run db:schema"): só usa
-- CREATE ... IF NOT EXISTS, ALTER ... IF NOT EXISTS e blocos que conferem o
-- catálogo antes de alterar. Bancos criados com a versão anterior do schema
-- são migrados sem perda de dados. O script inteiro roda em uma única
-- transação implícita: se algo falhar, nada é aplicado.
-- =============================================================================

-- Funções auxiliares temporárias (somem ao fim da conexão) --------------------

-- Cria uma restrição CHECK se ainda não existir. Ela entra como NOT VALID (vale
-- para gravações novas imediatamente) e depois tenta validar os dados antigos;
-- se algum registro antigo violar a regra, só emite um aviso.
CREATE OR REPLACE FUNCTION pg_temp.garantir_check(tabela text, nome text, expressao text)
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = nome AND conrelid = tabela::regclass
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s) NOT VALID', tabela, nome, expressao);
    END IF;

    BEGIN
        EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I', tabela, nome);
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'Registros antigos de "%" violam a regra "%". Ela já vale para novos dados; corrija os antigos e rode o schema de novo.', tabela, nome;
    END;
END;
$$ LANGUAGE plpgsql;

-- (Re)cria uma chave estrangeira com a regra de exclusão desejada. Usado para
-- trocar o antigo ON DELETE CASCADE por RESTRICT (SEC-18).
CREATE OR REPLACE FUNCTION pg_temp.garantir_fk(tabela text, nome text, coluna text, referencia text, regra text)
RETURNS void AS $$
DECLARE
    regra_atual "char";
    codigo_regra "char" := CASE regra WHEN 'RESTRICT' THEN 'r' WHEN 'SET NULL' THEN 'n' WHEN 'CASCADE' THEN 'c' ELSE 'a' END;
BEGIN
    SELECT confdeltype INTO regra_atual
    FROM pg_constraint
    WHERE conname = nome AND conrelid = tabela::regclass;

    IF regra_atual IS DISTINCT FROM codigo_regra THEN
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', tabela, nome);
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s ON DELETE %s',
                       tabela, nome, coluna, referencia, regra);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- produtos --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    preco NUMERIC(10, 2) NOT NULL DEFAULT 0,
    -- Total do produto em todos os armazéns. É mantido pelo gatilho da tabela
    -- estoque (não deve ser editado diretamente).
    quantidade INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE produtos ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS codigo VARCHAR(50) UNIQUE;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS peso NUMERIC(10, 3);
-- Exclusão lógica: o registro some das listagens, mas o histórico continua.
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP;

-- armazens --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS armazens (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    localizacao VARCHAR(255) NOT NULL,
    capacidade_maxima INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'ativo',
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE armazens ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP;

-- transportadoras ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transportadoras (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    contato VARCHAR(100),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE transportadoras ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP;

-- usuarios ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    login VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(30) NOT NULL DEFAULT 'operador' CHECK (perfil IN ('administrador', 'gerente_logistico', 'operador')),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- dados do formulário de cadastro do front (login continua sendo o e-mail)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nome VARCHAR(150);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(150) UNIQUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);
-- O login aceitava só 100 caracteres, mas o e-mail (que vira login) aceita 150:
-- um e-mail longo gerava erro 500 no cadastro.
ALTER TABLE usuarios ALTER COLUMN login TYPE VARCHAR(150);
-- Contas criadas pelo cadastro público nascem inativas e só entram após
-- aprovação de um administrador. Contas que já existiam continuam ativas.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS preferencias JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP;

-- Login e e-mail únicos sem diferenciar maiúsculas (evita duas contas
-- "Maria@x.com" e "maria@x.com" disputando o mesmo login).
DO $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS usuarios_login_minusculo_idx ON usuarios (LOWER(login));
    CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_minusculo_idx ON usuarios (LOWER(email));
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Há logins ou e-mails repetidos com maiúsculas diferentes; os índices únicos sem diferenciar maiúsculas não foram criados.';
END;
$$;

-- veiculos ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS veiculos (
    id SERIAL PRIMARY KEY,
    placa VARCHAR(10) NOT NULL UNIQUE,
    modelo VARCHAR(100) NOT NULL,
    capacidade_carga NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'disponivel',
    transportadora_id INTEGER REFERENCES transportadoras(id) ON DELETE SET NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP;

-- entregas ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entregas (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade INTEGER NOT NULL DEFAULT 1,
    destino VARCHAR(255) NOT NULL,
    data_prevista DATE,
    -- Projeção do último evento de rastreamento (a fonte da verdade é o
    -- histórico em "rastreamento"). Só muda pelos endpoints de rastreamento.
    status VARCHAR(50) NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Armazém de onde saiu a mercadoria reservada para a entrega. Entregas antigas
-- (sem armazém) não tiveram estoque reservado.
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS armazem_id INTEGER REFERENCES armazens(id) ON DELETE RESTRICT;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP;

-- estoque (saldo de cada produto em cada armazém) --------------------------------
CREATE TABLE IF NOT EXISTS estoque (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    armazem_id INTEGER NOT NULL REFERENCES armazens(id) ON DELETE RESTRICT,
    quantidade_disponivel INTEGER NOT NULL DEFAULT 0,
    UNIQUE (produto_id, armazem_id)
);

-- rastreamento ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rastreamento (
    id SERIAL PRIMARY KEY,
    entrega_id INTEGER NOT NULL REFERENCES entregas(id) ON DELETE RESTRICT,
    localizacao_atual VARCHAR(255) NOT NULL,
    data_hora TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'em transito'
);

ALTER TABLE rastreamento ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE rastreamento ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP;

-- movimentacoes -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimentacoes (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    origem VARCHAR(255) NOT NULL,
    destino VARCHAR(255) NOT NULL,
    data_movimentacao TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Movimentações novas sempre informam quantidade e pelo menos um armazém, e
-- alteram os saldos na mesma transação. As antigas ficam com NULL.
ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS quantidade INTEGER;
ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS armazem_origem_id INTEGER REFERENCES armazens(id) ON DELETE RESTRICT;
ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS armazem_destino_id INTEGER REFERENCES armazens(id) ON DELETE RESTRICT;
ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS estornado_em TIMESTAMP;

-- sessoes (login com cookie HttpOnly validado no servidor) -----------------------
CREATE TABLE IF NOT EXISTS sessoes (
    -- Guardamos só o hash SHA-256 do token; o token em si fica apenas no cookie.
    token_hash CHAR(64) PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_em TIMESTAMP NOT NULL,
    ip VARCHAR(64),
    user_agent VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS sessoes_usuario_idx ON sessoes (usuario_id);
CREATE INDEX IF NOT EXISTS sessoes_expira_idx ON sessoes (expira_em);

-- tentativas_login (limite de tentativas por conta/IP) --------------------------
CREATE TABLE IF NOT EXISTS tentativas_login (
    chave VARCHAR(255) PRIMARY KEY,
    falhas INTEGER NOT NULL DEFAULT 0,
    bloqueado_ate TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- auditoria (quem fez o quê, quando e com qual resultado) ------------------------
CREATE TABLE IF NOT EXISTS auditoria (
    id BIGSERIAL PRIMARY KEY,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_login VARCHAR(150),
    perfil VARCHAR(30),
    acao VARCHAR(40) NOT NULL,
    recurso VARCHAR(50) NOT NULL,
    recurso_id VARCHAR(50),
    resultado VARCHAR(20) NOT NULL DEFAULT 'sucesso',
    ip VARCHAR(64),
    -- Nunca contém senhas, hashes ou tokens (filtrados no backend).
    detalhes JSONB
);

CREATE INDEX IF NOT EXISTS auditoria_criado_idx ON auditoria (criado_em DESC);
CREATE INDEX IF NOT EXISTS auditoria_recurso_idx ON auditoria (recurso, recurso_id);

-- Índices de consulta frequente --------------------------------------------------
CREATE INDEX IF NOT EXISTS entregas_status_idx ON entregas (status);
CREATE INDEX IF NOT EXISTS rastreamento_entrega_idx ON rastreamento (entrega_id, data_hora);
CREATE INDEX IF NOT EXISTS movimentacoes_produto_idx ON movimentacoes (produto_id);
CREATE INDEX IF NOT EXISTS estoque_armazem_idx ON estoque (armazem_id);

-- Integridade histórica (SEC-18) --------------------------------------------------
-- Antes, excluir um produto apagava em cascata entregas, rastreamentos,
-- movimentações e saldos. Agora o banco recusa a exclusão física de registros
-- com histórico; a API usa exclusão lógica (coluna excluido_em).
SELECT pg_temp.garantir_fk('entregas', 'entregas_produto_id_fkey', 'produto_id', 'produtos(id)', 'RESTRICT');
SELECT pg_temp.garantir_fk('estoque', 'estoque_produto_id_fkey', 'produto_id', 'produtos(id)', 'RESTRICT');
SELECT pg_temp.garantir_fk('estoque', 'estoque_armazem_id_fkey', 'armazem_id', 'armazens(id)', 'RESTRICT');
SELECT pg_temp.garantir_fk('rastreamento', 'rastreamento_entrega_id_fkey', 'entrega_id', 'entregas(id)', 'RESTRICT');
SELECT pg_temp.garantir_fk('movimentacoes', 'movimentacoes_produto_id_fkey', 'produto_id', 'produtos(id)', 'RESTRICT');

-- Regras de negócio no banco (SEC-14) ---------------------------------------------
SELECT pg_temp.garantir_check('produtos', 'produtos_preco_chk', 'preco >= 0');
SELECT pg_temp.garantir_check('produtos', 'produtos_quantidade_chk', 'quantidade >= 0');
SELECT pg_temp.garantir_check('produtos', 'produtos_peso_chk', 'peso IS NULL OR peso >= 0');

SELECT pg_temp.garantir_check('armazens', 'armazens_capacidade_chk', 'capacidade_maxima >= 0');
SELECT pg_temp.garantir_check('armazens', 'armazens_status_chk', $$status IN ('ativo', 'inativo', 'manutencao')$$);

SELECT pg_temp.garantir_check('veiculos', 'veiculos_capacidade_chk', 'capacidade_carga >= 0');
SELECT pg_temp.garantir_check('veiculos', 'veiculos_status_chk', $$status IN ('disponivel', 'em rota', 'manutencao', 'inativo')$$);

SELECT pg_temp.garantir_check('entregas', 'entregas_quantidade_chk', 'quantidade > 0');
SELECT pg_temp.garantir_check('entregas', 'entregas_status_chk', $$status IN ('pendente', 'processando', 'em transito', 'entregue', 'cancelado')$$);

SELECT pg_temp.garantir_check('rastreamento', 'rastreamento_status_chk', $$status IN ('processando', 'em transito', 'entregue', 'cancelado')$$);

SELECT pg_temp.garantir_check('estoque', 'estoque_quantidade_chk', 'quantidade_disponivel >= 0');

SELECT pg_temp.garantir_check('movimentacoes', 'movimentacoes_quantidade_chk', 'quantidade IS NULL OR quantidade > 0');
SELECT pg_temp.garantir_check('movimentacoes', 'movimentacoes_armazens_chk', 'armazem_origem_id IS NULL OR armazem_destino_id IS NULL OR armazem_origem_id <> armazem_destino_id');

-- Total do produto = soma dos saldos nos armazéns (SEC-22/SEC-23) -----------------
-- Gatilho incremental: soma/subtrai a diferença em produtos.quantidade. Como o
-- UPDATE usa "quantidade + delta", ele é seguro com transações concorrentes, e
-- a CHECK produtos_quantidade_chk impede total negativo.
CREATE OR REPLACE FUNCTION sincronizar_total_produto() RETURNS trigger AS $$
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        UPDATE produtos SET quantidade = quantidade - OLD.quantidade_disponivel WHERE id = OLD.produto_id;
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        UPDATE produtos SET quantidade = quantidade + NEW.quantidade_disponivel WHERE id = NEW.produto_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS estoque_sincroniza_produto ON estoque;
CREATE TRIGGER estoque_sincroniza_produto
AFTER INSERT OR UPDATE OF quantidade_disponivel, produto_id OR DELETE ON estoque
FOR EACH ROW EXECUTE FUNCTION sincronizar_total_produto();

-- Dados iniciais ------------------------------------------------------------------
-- armazens não tem coluna UNIQUE, então ON CONFLICT nunca dispara:
-- o NOT EXISTS evita criar outro "Armazém Central" a cada execução do script
INSERT INTO armazens (nome, localizacao, capacidade_maxima, status)
SELECT 'Armazém Central', 'São Paulo, SP', 5000, 'ativo'
WHERE NOT EXISTS (SELECT 1 FROM armazens WHERE nome = 'Armazém Central');

INSERT INTO transportadoras (nome, cnpj, contato)
VALUES ('Transportadora Rápida Ltda', '12.345.678/0001-90', '(11) 91234-5678')
ON CONFLICT DO NOTHING;

-- Migração do estoque antigo ------------------------------------------------------
-- Na versão anterior, produtos.quantidade era editado livremente e não tinha
-- relação com a tabela estoque. Aqui a diferença (quantidade sem armazém) é
-- alocada no armazém principal e o total é recalculado a partir dos saldos.
-- Em bancos já migrados as duas instruções não alteram nada.
DO $$
DECLARE
    armazem_principal INTEGER;
BEGIN
    SELECT id INTO armazem_principal
    FROM armazens
    WHERE excluido_em IS NULL
    ORDER BY (nome = 'Armazém Central') DESC, id
    LIMIT 1;

    IF armazem_principal IS NULL THEN
        RAISE NOTICE 'Nenhum armazém ativo: a sincronização de estoque foi pulada.';
        RETURN;
    END IF;

    INSERT INTO estoque (produto_id, armazem_id, quantidade_disponivel)
    SELECT p.id, armazem_principal, p.quantidade - COALESCE(s.total, 0)
    FROM produtos p
    LEFT JOIN (SELECT produto_id, SUM(quantidade_disponivel) AS total FROM estoque GROUP BY produto_id) s
           ON s.produto_id = p.id
    WHERE p.quantidade > COALESCE(s.total, 0)
    ON CONFLICT (produto_id, armazem_id)
    DO UPDATE SET quantidade_disponivel = estoque.quantidade_disponivel + EXCLUDED.quantidade_disponivel;

    UPDATE produtos p
    SET quantidade = COALESCE(s.total, 0)
    FROM produtos p2
    LEFT JOIN (SELECT produto_id, SUM(quantidade_disponivel) AS total FROM estoque GROUP BY produto_id) s
           ON s.produto_id = p2.id
    WHERE p.id = p2.id AND p.quantidade <> COALESCE(s.total, 0);
END;
$$;
