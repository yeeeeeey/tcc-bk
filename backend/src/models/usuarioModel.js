const pool = require("../database/connection");

// Nunca devolve a coluna senha
const CAMPOS_PUBLICOS = "id, login, nome, email, cnpj, perfil, criado_em";

async function listarUsuarios() {
    const resultado = await pool.query(
        `SELECT ${CAMPOS_PUBLICOS} FROM usuarios ORDER BY id`
    );
    return resultado.rows;
}

async function buscarUsuarioPorId(id) {
    const resultado = await pool.query(
        `SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = $1`,
        [id]
    );
    return resultado.rows[0];
}

// Usado no login: aceita tanto o login quanto o e-mail cadastrado, sem diferenciar maiúsculas
async function buscarUsuarioPorLogin(login) {
    const resultado = await pool.query(
        "SELECT * FROM usuarios WHERE LOWER(login) = LOWER($1) OR LOWER(email) = LOWER($1)",
        [login]
    );
    return resultado.rows[0];
}

async function criarUsuario({ login, senhaHash, perfil, nome, email, cnpj }) {
    const resultado = await pool.query(
        `INSERT INTO usuarios (login, senha, perfil, nome, email, cnpj)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${CAMPOS_PUBLICOS}`,
        [login, senhaHash, perfil, nome || null, email || null, cnpj || null]
    );
    return resultado.rows[0];
}

// Campos não enviados continuam com o valor atual
async function atualizarUsuario(id, { login, perfil, nome, email, cnpj }) {
    const resultado = await pool.query(
        `UPDATE usuarios
         SET login = COALESCE($1, login),
             perfil = COALESCE($2, perfil),
             nome = COALESCE($3, nome),
             email = COALESCE($4, email),
             cnpj = COALESCE($5, cnpj)
         WHERE id = $6
         RETURNING ${CAMPOS_PUBLICOS}`,
        [login, perfil, nome, email, cnpj, id]
    );
    return resultado.rows[0];
}

async function deletarUsuario(id) {
    const resultado = await pool.query(
        "DELETE FROM usuarios WHERE id = $1 RETURNING id",
        [id]
    );
    return resultado.rows[0];
}

module.exports = {
    listarUsuarios,
    buscarUsuarioPorId,
    buscarUsuarioPorLogin,
    criarUsuario,
    atualizarUsuario,
    deletarUsuario
};
