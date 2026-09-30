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
        [placa, modelo, capacidade_carga, status || "disponivel", transportadora_id || null]
    );
    return resultado.rows[0];
}

async function atualizarVeiculo(id, { placa, modelo, capacidade_carga, status, transportadora_id }) {
    const resultado = await pool.query(
        `UPDATE veiculos
         SET placa = $1, modelo = $2, capacidade_carga = $3, status = $4, transportadora_id = $5
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