const pool = require("../database/connection");

// No pg, os placeholders são $1, $2, $3... (diferente do "?" do mysql2)

async function listarProdutos() {
    const resultado = await pool.query(
        "SELECT * FROM produtos ORDER BY id"
    );
    return resultado.rows;
}

async function buscarProdutoPorId(id) {
    const resultado = await pool.query(
        "SELECT * FROM produtos WHERE id = $1",
        [id]
    );
    return resultado.rows[0];
}

async function criarProduto({ nome, descricao, preco, quantidade }) {
    const resultado = await pool.query(
        `INSERT INTO produtos (nome, descricao, preco, quantidade)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [nome, descricao, preco, quantidade ?? 0]
    );
    return resultado.rows[0];
}

// Campos não enviados continuam com o valor atual
async function atualizarProduto(id, { nome, descricao, preco, quantidade }) {
    const resultado = await pool.query(
        `UPDATE produtos
         SET nome = COALESCE($1, nome),
             descricao = COALESCE($2, descricao),
             preco = COALESCE($3, preco),
             quantidade = COALESCE($4, quantidade)
         WHERE id = $5
         RETURNING *`,
        [nome, descricao, preco, quantidade, id]
    );
    return resultado.rows[0];
}

async function deletarProduto(id) {
    const resultado = await pool.query(
        "DELETE FROM produtos WHERE id = $1 RETURNING *",
        [id]
    );
    return resultado.rows[0];
}

module.exports = {
    listarProdutos,
    buscarProdutoPorId,
    criarProduto,
    atualizarProduto,
    deletarProduto
};
