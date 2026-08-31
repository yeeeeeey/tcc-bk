-- Execute este script no editor SQL do Neon (ou via psql).

CREATE TABLE IF NOT EXISTS produtos (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(150) NOT NULL,
	descricao TEXT,
	preco NUMERIC(10, 2) NOT NULL DEFAULT 0,
	quantidade INTEGER NOT NULL DEFAULT 0,
	criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO produtos (nome, descricao, preco, quantidade)
VALUES
	('Caixa de papelão', 'Caixa reforçada para transporte', 12.50, 100),
	('Palete de madeira', 'Palete padrão para armazenagem', 45.00, 30)
ON CONFLICT DO NOTHING;
