const pool = require("../database/connection");
const { consultarPaginado, filtroBusca } = require("../utils/consultas");

const COLUNAS = `m.id, m.produto_id, p.nome AS produto_nome, m.quantidade,
                 m.armazem_origem_id, ao.nome AS armazem_origem_nome,
                 m.armazem_destino_id, ad.nome AS armazem_destino_nome,
                 m.origem, m.destino, m.data_movimentacao, m.usuario_id, m.estornado_em`;
const ORIGEM = `movimentacoes m
                JOIN produtos p ON p.id = m.produto_id
                LEFT JOIN armazens ao ON ao.id = m.armazem_origem_id
                LEFT JOIN armazens ad ON ad.id = m.armazem_destino_id`;

async function listarMovimentacoes({ pagina, limite, busca }) {
    const params = [];
    return consultarPaginado({
        select: COLUNAS,
        from: ORIGEM,
        condicoes: [filtroBusca(["p.nome", "m.origem", "m.destino"], busca, params)],
        params,
        ordem: "m.id DESC",
        pagina,
        limite
    });
}

async function buscarMovimentacaoPorId(id, executor = pool) {
    const resultado = await executor.query(`SELECT ${COLUNAS} FROM ${ORIGEM} WHERE m.id = $1`, [id]);
    return resultado.rows[0];
}

async function bloquearMovimentacao(cliente, id) {
    const resultado = await cliente.query(
        `SELECT id, produto_id, quantidade, armazem_origem_id, armazem_destino_id, estornado_em
         FROM movimentacoes WHERE id = $1 FOR UPDATE`,
        [id]
    );
    return resultado.rows[0];
}

async function inserirMovimentacao(cliente, dados) {
    const resultado = await cliente.query(
        `INSERT INTO movimentacoes (produto_id, quantidade, armazem_origem_id, armazem_destino_id, origem, destino, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [dados.produto_id, dados.quantidade, dados.armazem_origem_id ?? null, dados.armazem_destino_id ?? null,
         dados.origem, dados.destino, dados.usuario_id]
    );
    return resultado.rows[0].id;
}

async function marcarEstornada(cliente, id) {
    await cliente.query("UPDATE movimentacoes SET estornado_em = NOW() WHERE id = $1", [id]);
}

module.exports = {
    listarMovimentacoes,
    buscarMovimentacaoPorId,
    bloquearMovimentacao,
    inserirMovimentacao,
    marcarEstornada
};
