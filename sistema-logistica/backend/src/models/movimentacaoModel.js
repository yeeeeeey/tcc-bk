const pool = require("../database/connection");

async function listarMovimentacoes() {
    const resultado = await pool.query(
        "SELECT * FROM movimentacoes ORDER BY id"
    );
    return resultado.rows;
}

async function buscarMovimentacaoPorId(id) {
    const resultado = await pool.query(
        "SELECT * FROM movimentacoes WHERE id = $1",
        [id]
    );
    return resultado.rows[0];
}

async function criarMovimentacao({ produto_id, origem, destino }) {
    const resultado = await pool.query(
        `INSERT INTO movimentacoes (produto_id, origem, destino)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [produto_id, origem, destino]
    );
    return resultado.rows[0];
}

async function atualizarMovimentacao(id, { produto_id, origem, destino }) {
    const resultado = await pool.query(
        `UPDATE movimentacoes
         SET produto_id = $1, origem = $2, destino = $3
         WHERE id = $4
         RETURNING *`,
        [produto_id, origem, destino, id]
    );
    return resultado.rows[0];
}

async function deletarMovimentacao(id) {
    const resultado = await pool.query(
        "DELETE FROM movimentacoes WHERE id = $1 RETURNING *",
        [id]
    );
    return resultado.rows[0];
}

module.exports = {
    listarMovimentacoes,
    buscarMovimentacaoPorId,
    criarMovimentacao,
    atualizarMovimentacao,
    deletarMovimentacao
};