const pool = require("../database/connection");
 
async function listarArmazens() {
    const resultado = await pool.query(
        "SELECT * FROM armazens ORDER BY id"
    );
    return resultado.rows;
}
 
async function buscarArmazemPorId(id) {
    const resultado = await pool.query(
        "SELECT * FROM armazens WHERE id = $1",
        [id]
    );
    return resultado.rows[0];
}
 
async function criarArmazem({ nome, localizacao, capacidade_maxima, status }) {
    const resultado = await pool.query(
        `INSERT INTO armazens (nome, localizacao, capacidade_maxima, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [nome, localizacao, capacidade_maxima ?? 0, status || "ativo"]
    );
    return resultado.rows[0];
}

// Campos não enviados continuam com o valor atual
async function atualizarArmazem(id, { nome, localizacao, capacidade_maxima, status }) {
    const resultado = await pool.query(
        `UPDATE armazens
         SET nome = COALESCE($1, nome),
             localizacao = COALESCE($2, localizacao),
             capacidade_maxima = COALESCE($3, capacidade_maxima),
             status = COALESCE($4, status)
         WHERE id = $5
         RETURNING *`,
        [nome, localizacao, capacidade_maxima, status, id]
    );
    return resultado.rows[0];
}
 
async function deletarArmazem(id) {
    const resultado = await pool.query(
        "DELETE FROM armazens WHERE id = $1 RETURNING *",
        [id]
    );
    return resultado.rows[0];
}
 
module.exports = {
    listarArmazens,
    buscarArmazemPorId,
    criarArmazem,
    atualizarArmazem,
    deletarArmazem
};