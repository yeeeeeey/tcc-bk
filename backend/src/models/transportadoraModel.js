const pool = require("../database/connection");
const { consultarPaginado, filtroBusca, montarAtualizacao } = require("../utils/consultas");
const { conflito } = require("../utils/erros");

const COLUNAS = "id, nome, cnpj, contato, criado_em";
const EDITAVEIS = ["nome", "cnpj", "contato"];

async function listarTransportadoras({ pagina, limite, busca }) {
    const params = [];
    return consultarPaginado({
        select: COLUNAS,
        from: "transportadoras",
        condicoes: ["excluido_em IS NULL", filtroBusca(["nome", "cnpj", "contato"], busca, params)],
        params,
        ordem: "id",
        pagina,
        limite
    });
}

async function buscarTransportadoraPorId(id, executor = pool) {
    const resultado = await executor.query(
        `SELECT ${COLUNAS} FROM transportadoras WHERE id = $1 AND excluido_em IS NULL`,
        [id]
    );
    return resultado.rows[0];
}

async function criarTransportadora(cliente, { nome, cnpj, contato }) {
    const resultado = await cliente.query(
        `INSERT INTO transportadoras (nome, cnpj, contato)
         VALUES ($1, $2, $3)
         RETURNING ${COLUNAS}`,
        [nome, cnpj, contato ?? null]
    );
    return resultado.rows[0];
}

// Campos não enviados continuam com o valor atual
async function atualizarTransportadora(cliente, id, campos) {
    const { sets, params } = montarAtualizacao(campos, EDITAVEIS);
    params.push(id);
    const resultado = await cliente.query(
        `UPDATE transportadoras SET ${sets.join(", ")}
         WHERE id = $${params.length} AND excluido_em IS NULL
         RETURNING ${COLUNAS}`,
        params
    );
    return resultado.rows[0];
}

async function excluirTransportadora(cliente, id) {
    const atual = await cliente.query(
        "SELECT id, nome FROM transportadoras WHERE id = $1 AND excluido_em IS NULL FOR UPDATE",
        [id]
    );
    if (!atual.rows[0]) return null;

    const veiculos = await cliente.query(
        "SELECT COUNT(*)::int AS total FROM veiculos WHERE transportadora_id = $1 AND excluido_em IS NULL",
        [id]
    );
    if (veiculos.rows[0].total > 0) {
        throw conflito("A transportadora tem veículos cadastrados; remova ou transfira os veículos antes");
    }

    const resultado = await cliente.query(
        "UPDATE transportadoras SET excluido_em = NOW() WHERE id = $1 RETURNING id, nome",
        [id]
    );
    return resultado.rows[0];
}

module.exports = {
    listarTransportadoras,
    buscarTransportadoraPorId,
    criarTransportadora,
    atualizarTransportadora,
    excluirTransportadora
};
