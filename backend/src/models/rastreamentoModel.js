const pool = require("../database/connection");
const { consultarPaginado, filtroBusca, montarAtualizacao } = require("../utils/consultas");

const COLUNAS = "r.id, r.entrega_id, r.localizacao_atual, r.data_hora, r.status, r.usuario_id";

async function listarRastreamentos({ pagina, limite, busca }) {
    const params = [];
    return consultarPaginado({
        select: COLUNAS,
        from: "rastreamento r",
        condicoes: ["r.excluido_em IS NULL", filtroBusca(["r.entrega_id", "r.localizacao_atual", "r.status"], busca, params)],
        params,
        ordem: "r.data_hora DESC, r.id DESC",
        pagina,
        limite
    });
}

async function buscarRastreamentoPorId(id, executor = pool) {
    const resultado = await executor.query(
        `SELECT ${COLUNAS} FROM rastreamento r WHERE r.id = $1 AND r.excluido_em IS NULL`,
        [id]
    );
    return resultado.rows[0];
}

async function listarRastreamentosPorEntrega(entregaId) {
    const resultado = await pool.query(
        `SELECT ${COLUNAS} FROM rastreamento r
         WHERE r.entrega_id = $1 AND r.excluido_em IS NULL
         ORDER BY r.data_hora, r.id`,
        [entregaId]
    );
    return resultado.rows;
}

// Últimos eventos válidos da entrega, do mais recente para o mais antigo
async function ultimosEventos(cliente, entregaId, quantidade = 2) {
    const resultado = await cliente.query(
        `SELECT id, status FROM rastreamento
         WHERE entrega_id = $1 AND excluido_em IS NULL
         ORDER BY data_hora DESC, id DESC
         LIMIT $2`,
        [entregaId, quantidade]
    );
    return resultado.rows;
}

async function inserirEvento(cliente, { entrega_id, localizacao_atual, status, usuario_id }) {
    const resultado = await cliente.query(
        `INSERT INTO rastreamento (entrega_id, localizacao_atual, status, usuario_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, entrega_id, localizacao_atual, data_hora, status, usuario_id`,
        [entrega_id, localizacao_atual, status, usuario_id]
    );
    return resultado.rows[0];
}

async function atualizarEvento(cliente, id, campos) {
    const { sets, params } = montarAtualizacao(campos, ["localizacao_atual", "status"]);
    params.push(id);
    const resultado = await cliente.query(
        `UPDATE rastreamento SET ${sets.join(", ")} WHERE id = $${params.length}
         RETURNING id, entrega_id, localizacao_atual, data_hora, status, usuario_id`,
        params
    );
    return resultado.rows[0];
}

async function marcarExcluido(cliente, id) {
    await cliente.query("UPDATE rastreamento SET excluido_em = NOW() WHERE id = $1", [id]);
}

module.exports = {
    listarRastreamentos,
    buscarRastreamentoPorId,
    listarRastreamentosPorEntrega,
    ultimosEventos,
    inserirEvento,
    atualizarEvento,
    marcarExcluido
};
