const pool = require("../database/connection");

async function listarTransportadoras() {
    const resultado = await pool.query(
        "SELECT * FROM transportadoras ORDER BY id"
    );
    return resultado.rows;
}

async function buscarTransportadoraPorId(id) {
    const resultado = await pool.query(
        "SELECT * FROM transportadoras WHERE id = $1",
        [id]
    );
    return resultado.rows[0];
}

async function criarTransportadora({ nome, cnpj, contato }) {
    const resultado = await pool.query(
        `INSERT INTO transportadoras (nome, cnpj, contato)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [nome, cnpj, contato]
    );
    return resultado.rows[0];
}

// Campos não enviados continuam com o valor atual
async function atualizarTransportadora(id, { nome, cnpj, contato }) {
    const resultado = await pool.query(
        `UPDATE transportadoras
         SET nome = COALESCE($1, nome),
             cnpj = COALESCE($2, cnpj),
             contato = COALESCE($3, contato)
         WHERE id = $4
         RETURNING *`,
        [nome, cnpj, contato, id]
    );
    return resultado.rows[0];
}

async function deletarTransportadora(id) {
    const resultado = await pool.query(
        "DELETE FROM transportadoras WHERE id = $1 RETURNING *",
        [id]
    );
    return resultado.rows[0];
}

module.exports = {
    listarTransportadoras,
    buscarTransportadoraPorId,
    criarTransportadora,
    atualizarTransportadora,
    deletarTransportadora
};