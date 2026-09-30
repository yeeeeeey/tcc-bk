const pool = require("../database/connection");

async function listarEntregas() {
    const resultado = await pool.query(
        "SELECT * FROM entregas ORDER BY id"
    );
    return resultado.rows;
}

async function buscarEntregaPorId(id) {
    const resultado = await pool.query(
        "SELECT * FROM entregas WHERE id = $1",
        [id]
    );
    return resultado.rows[0];
}

async function criarEntrega({ produto_id, quantidade, destino, data_prevista, status }) {
    const resultado = await pool.query(
        `INSERT INTO entregas (produto_id, quantidade, destino, data_prevista, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [produto_id, quantidade || 1, destino, data_prevista, status || "pendente"]
    );
    return resultado.rows[0];
}

async function atualizarEntrega(id, { produto_id, quantidade, destino, data_prevista, status }) {
    const resultado = await pool.query(
        `UPDATE entregas
         SET produto_id = $1, quantidade = $2, destino = $3, data_prevista = $4, status = $5
         WHERE id = $6
         RETURNING *`,
        [produto_id, quantidade, destino, data_prevista, status, id]
    );
    return resultado.rows[0];
}

async function deletarEntrega(id) {
    const resultado = await pool.query(
        "DELETE FROM entregas WHERE id = $1 RETURNING *",
        [id]
    );
    return resultado.rows[0];
}

module.exports = {
    listarEntregas,
    buscarEntregaPorId,
    criarEntrega,
    atualizarEntrega,
    deletarEntrega
};        