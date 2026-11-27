const pool = require("../database/connection");
const { consultarPaginado, filtroBusca, montarAtualizacao } = require("../utils/consultas");
const { conflito } = require("../utils/erros");

const COLUNAS = "id, nome, localizacao, capacidade_maxima, status, criado_em";
const EDITAVEIS = ["nome", "localizacao", "capacidade_maxima", "status"];

async function ocupacao(executor, id) {
    const resultado = await executor.query(
        "SELECT COALESCE(SUM(quantidade_disponivel), 0)::int AS total FROM estoque WHERE armazem_id = $1",
        [id]
    );
    return resultado.rows[0].total;
}

async function listarArmazens({ pagina, limite, busca }) {
    const params = [];
    return consultarPaginado({
        select: `${COLUNAS}, (SELECT COALESCE(SUM(e.quantidade_disponivel), 0)::int FROM estoque e WHERE e.armazem_id = armazens.id) AS ocupacao`,
        from: "armazens",
        condicoes: ["excluido_em IS NULL", filtroBusca(["nome", "localizacao", "status"], busca, params)],
        params,
        ordem: "id",
        pagina,
        limite
    });
}

async function buscarArmazemPorId(id, executor = pool) {
    const resultado = await executor.query(
        `SELECT ${COLUNAS} FROM armazens WHERE id = $1 AND excluido_em IS NULL`,
        [id]
    );
    const armazem = resultado.rows[0];
    if (armazem) armazem.ocupacao = await ocupacao(executor, id);
    return armazem;
}

async function criarArmazem(cliente, { nome, localizacao, capacidade_maxima, status }) {
    const resultado = await cliente.query(
        `INSERT INTO armazens (nome, localizacao, capacidade_maxima, status)
         VALUES ($1, $2, $3, $4)
         RETURNING ${COLUNAS}`,
        [nome, localizacao, capacidade_maxima ?? 0, status || "ativo"]
    );
    return resultado.rows[0];
}

// Campos não enviados continuam com o valor atual
async function atualizarArmazem(cliente, id, campos) {
    const atual = await cliente.query(
        "SELECT id FROM armazens WHERE id = $1 AND excluido_em IS NULL FOR UPDATE",
        [id]
    );
    if (!atual.rows[0]) return null;

    // A capacidade não pode ficar abaixo do que já está guardado (SEC-14)
    if (campos.capacidade_maxima !== undefined && campos.capacidade_maxima > 0) {
        const total = await ocupacao(cliente, id);
        if (campos.capacidade_maxima < total) {
            throw conflito(`A capacidade não pode ser menor que a ocupação atual (${total} unidades)`);
        }
    }

    const { sets, params } = montarAtualizacao(campos, EDITAVEIS);
    params.push(id);
    const resultado = await cliente.query(
        `UPDATE armazens SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING ${COLUNAS}`,
        params
    );
    return resultado.rows[0];
}

async function excluirArmazem(cliente, id) {
    const atual = await cliente.query(
        "SELECT id, nome FROM armazens WHERE id = $1 AND excluido_em IS NULL FOR UPDATE",
        [id]
    );
    if (!atual.rows[0]) return null;

    const total = await ocupacao(cliente, id);
    if (total > 0) {
        throw conflito(`O armazém ainda guarda ${total} unidade(s); transfira o estoque antes de excluí-lo`);
    }

    const reservas = await cliente.query(
        `SELECT COUNT(*)::int AS total FROM entregas
         WHERE armazem_id = $1 AND excluido_em IS NULL AND status NOT IN ('entregue', 'cancelado')`,
        [id]
    );
    if (reservas.rows[0].total > 0) {
        throw conflito("O armazém tem entregas em andamento e não pode ser excluído");
    }

    const resultado = await cliente.query(
        "UPDATE armazens SET excluido_em = NOW(), status = 'inativo' WHERE id = $1 RETURNING id, nome",
        [id]
    );
    return resultado.rows[0];
}

module.exports = {
    listarArmazens,
    buscarArmazemPorId,
    criarArmazem,
    atualizarArmazem,
    excluirArmazem
};
