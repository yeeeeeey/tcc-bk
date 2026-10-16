const pool = require("../database/connection");

async function listarVeiculos() {
    const resultado = await pool.query(
        "SELECT * FROM veiculos ORDER BY id"
    );
    return resultado.rows;
}

async function buscarVeiculoPorId(id) {
    const resultado = await pool.query(
        "SELECT * FROM veiculos WHERE id = $1",
        [id]
    );
    return resultado.rows[0];
}

async function criarVeiculo({ placa, modelo, capacidade_carga, status, transportadora_id }) {
    const resultado = await pool.query(
        `INSERT INTO veiculos (placa, modelo, capacidade_carga, status, transportadora_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [placa, modelo, capacidade_carga ?? 0, status || "disponivel", transportadora_id || null]
    );
    return resultado.rows[0];
}

// Campos não enviados continuam com o valor atual
async function atualizarVeiculo(id, { placa, modelo, capacidade_carga, status, transportadora_id }) {
    const resultado = await pool.query(
        `UPDATE veiculos
         SET placa = COALESCE($1, placa),
             modelo = COALESCE($2, modelo),
             capacidade_carga = COALESCE($3, capacidade_carga),
             status = COALESCE($4, status),
             transportadora_id = COALESCE($5, transportadora_id)
         WHERE id = $6
         RETURNING *`,
        [placa, modelo, capacidade_carga, status, transportadora_id || null, id]
    );
    return resultado.rows[0];
}

async function deletarVeiculo(id) {
    const resultado = await pool.query(
        "DELETE FROM veiculos WHERE id = $1 RETURNING *",
        [id]
    );
    return resultado.rows[0];
}

module.exports = {
    listarVeiculos,
    buscarVeiculoPorId,
    criarVeiculo,
    atualizarVeiculo,
    deletarVeiculo
};