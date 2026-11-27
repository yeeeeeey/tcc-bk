const pool = require("../database/connection");
const { consultarPaginado, filtroBusca, montarAtualizacao } = require("../utils/consultas");

const COLUNAS = `e.id, e.produto_id, p.nome AS produto_nome, e.quantidade, e.destino, e.data_prevista,
                 e.status, e.armazem_id, a.nome AS armazem_nome, e.criado_em`;
const ORIGEM = "entregas e JOIN produtos p ON p.id = e.produto_id LEFT JOIN armazens a ON a.id = e.armazem_id";
const EDITAVEIS = ["produto_id", "quantidade", "destino", "data_prevista", "armazem_id"];

async function listarEntregas({ pagina, limite, busca }) {
    const params = [];
    return consultarPaginado({
        select: COLUNAS,
        from: ORIGEM,
        condicoes: ["e.excluido_em IS NULL", filtroBusca(["e.id", "e.destino", "e.status", "p.nome"], busca, params)],
        params,
        ordem: "e.id",
        pagina,
        limite
    });
}

async function buscarEntregaPorId(id, executor = pool) {
    const resultado = await executor.query(
        `SELECT ${COLUNAS} FROM ${ORIGEM} WHERE e.id = $1 AND e.excluido_em IS NULL`,
        [id]
    );
    return resultado.rows[0];
}

// Trava a linha da entrega até o fim da transação: alterações de status,
// eventos de rastreamento e reservas de estoque da mesma entrega ficam em fila.
async function bloquearEntrega(cliente, id) {
    const resultado = await cliente.query(
        `SELECT id, produto_id, quantidade, destino, data_prevista, status, armazem_id
         FROM entregas WHERE id = $1 AND excluido_em IS NULL FOR UPDATE`,
        [id]
    );
    return resultado.rows[0];
}

// Toda entrega nasce "pendente" (SEC-24)
async function inserirEntrega(cliente, { produto_id, quantidade, destino, data_prevista, armazem_id }) {
    const resultado = await cliente.query(
        `INSERT INTO entregas (produto_id, quantidade, destino, data_prevista, status, armazem_id)
         VALUES ($1, $2, $3, $4, 'pendente', $5)
         RETURNING id`,
        [produto_id, quantidade, destino, data_prevista ?? null, armazem_id]
    );
    return resultado.rows[0].id;
}

// Campos não enviados continuam com o valor atual (status não é editável aqui)
async function atualizarCampos(cliente, id, campos) {
    const { sets, params } = montarAtualizacao(campos, EDITAVEIS);
    if (sets.length === 0) return;
    params.push(id);
    await cliente.query(`UPDATE entregas SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
}

async function atualizarStatus(cliente, id, status) {
    await cliente.query("UPDATE entregas SET status = $1 WHERE id = $2", [status, id]);
}

async function marcarExcluida(cliente, id) {
    const resultado = await cliente.query(
        "UPDATE entregas SET excluido_em = NOW() WHERE id = $1 RETURNING id",
        [id]
    );
    return resultado.rows[0];
}

module.exports = {
    listarEntregas,
    buscarEntregaPorId,
    bloquearEntrega,
    inserirEntrega,
    atualizarCampos,
    atualizarStatus,
    marcarExcluida
};
