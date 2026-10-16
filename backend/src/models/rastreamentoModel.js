const pool = require("../database/connection");

async function listarRastreamentos() {
    const resultado = await pool.query(
        "SELECT * FROM rastreamento ORDER BY id"
    );
    return resultado.rows;
}

async function buscarRastreamentoPorId(id) {
    const resultado = await pool.query(
        "SELECT * FROM rastreamento WHERE id = $1",
        [id]
    );
    return resultado.rows[0];
}

async function listarRastreamentosPorEntrega(entrega_id) {
    const resultado = await pool.query(
        "SELECT * FROM rastreamento WHERE entrega_id = $1 ORDER BY data_hora",
        [entrega_id]
    );
    return resultado.rows;
}

async function criarRastreamento({ entrega_id, localizacao_atual, status }) {
    const statusFinal = status || "em transito";

    const resultado = await pool.query(
        `INSERT INTO rastreamento (entrega_id, localizacao_atual, status)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [entrega_id, localizacao_atual, statusFinal]
    );

    // A entrega passa a ter o status do último ponto de rastreamento
    await pool.query(
        "UPDATE entregas SET status = $1 WHERE id = $2",
        [statusFinal, entrega_id]
    );

    return resultado.rows[0];
}

// Campos não enviados continuam com o valor atual
async function atualizarRastreamento(id, { localizacao_atual, status }) {
    const resultado = await pool.query(
        `UPDATE rastreamento
         SET localizacao_atual = COALESCE($1, localizacao_atual),
             status = COALESCE($2, status)
         WHERE id = $3
         RETURNING *`,
        [localizacao_atual, status, id]
    );
    return resultado.rows[0];
}

async function deletarRastreamento(id) {
    const resultado = await pool.query(
        "DELETE FROM rastreamento WHERE id = $1 RETURNING *",
        [id]
    );
    return resultado.rows[0];
}

module.exports = {
    listarRastreamentos,
    buscarRastreamentoPorId,
    listarRastreamentosPorEntrega,
    criarRastreamento,
    atualizarRastreamento,
    deletarRastreamento
};