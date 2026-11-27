const pool = require("../database/connection");

// Produtos com quantidade abaixo disso aparecem nos alertas
const ESTOQUE_MINIMO = 10;

// COUNT/SUM do Postgres voltam como texto (bigint); o ::int converte para número
async function buscarTotais() {
    const resultado = await pool.query(
        `SELECT
            (SELECT COUNT(*) FROM produtos WHERE excluido_em IS NULL)::int AS produtos,
            (SELECT COUNT(*) FROM armazens WHERE status = 'ativo' AND excluido_em IS NULL)::int AS armazens_ativos,
            (SELECT COUNT(*) FROM entregas WHERE excluido_em IS NULL)::int AS entregas,
            (SELECT COUNT(*) FROM entregas WHERE status = 'em transito' AND excluido_em IS NULL)::int AS em_transito,
            (SELECT COUNT(*) FROM entregas
                WHERE data_prevista < CURRENT_DATE AND status NOT IN ('entregue', 'cancelado')
                  AND excluido_em IS NULL)::int AS atrasos`
    );
    return resultado.rows[0];
}

async function contarEntregasPorStatus() {
    const resultado = await pool.query(
        `SELECT status, COUNT(*)::int AS total
         FROM entregas
         WHERE excluido_em IS NULL
         GROUP BY status
         ORDER BY total DESC`
    );
    return resultado.rows;
}

async function somarEstoquePorArmazem() {
    const resultado = await pool.query(
        `SELECT a.id, a.nome, COALESCE(SUM(e.quantidade_disponivel), 0)::int AS quantidade
         FROM armazens a
         LEFT JOIN estoque e ON e.armazem_id = a.id
         WHERE a.excluido_em IS NULL
         GROUP BY a.id, a.nome
         ORDER BY quantidade DESC, a.nome`
    );
    return resultado.rows;
}

// Entrega mais recente que ainda não foi entregue (ou a última, se todas foram),
// com o histórico de rastreamento dela
async function buscarEntregaEmDestaque() {
    const entregas = await pool.query(
        `SELECT e.id, e.produto_id, e.quantidade, e.destino, e.data_prevista, e.status, e.armazem_id, p.nome AS produto_nome
         FROM entregas e
         JOIN produtos p ON p.id = e.produto_id
         WHERE e.excluido_em IS NULL
         ORDER BY CASE WHEN e.status IN ('entregue', 'cancelado') THEN 1 ELSE 0 END, e.id DESC
         LIMIT 1`
    );

    const entrega = entregas.rows[0];
    if (!entrega) {
        return null;
    }

    const historico = await pool.query(
        "SELECT id, entrega_id, localizacao_atual, data_hora, status FROM rastreamento WHERE entrega_id = $1 AND excluido_em IS NULL ORDER BY data_hora, id",
        [entrega.id]
    );

    return { ...entrega, historico: historico.rows };
}

async function listarEntregasAtrasadas() {
    const resultado = await pool.query(
        `SELECT e.id, e.destino, e.data_prevista, e.status, p.nome AS produto_nome
         FROM entregas e
         JOIN produtos p ON p.id = e.produto_id
         WHERE e.data_prevista < CURRENT_DATE AND e.status NOT IN ('entregue', 'cancelado')
           AND e.excluido_em IS NULL
         ORDER BY e.data_prevista
         LIMIT 5`
    );
    return resultado.rows;
}

async function listarProdutosComEstoqueBaixo() {
    const resultado = await pool.query(
        `SELECT id, nome, quantidade
         FROM produtos
         WHERE quantidade < $1 AND excluido_em IS NULL
         ORDER BY quantidade
         LIMIT 5`,
        [ESTOQUE_MINIMO]
    );
    return resultado.rows;
}

module.exports = {
    buscarTotais,
    contarEntregasPorStatus,
    somarEstoquePorArmazem,
    buscarEntregaEmDestaque,
    listarEntregasAtrasadas,
    listarProdutosComEstoqueBaixo
};
