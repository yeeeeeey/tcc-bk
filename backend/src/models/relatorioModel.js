const pool = require("../database/connection");

// Relatório gerencial de um período [de, ate] (datas AAAA-MM-DD, inclusivas).
// As entregas consideradas são as CRIADAS no período; os status são os atuais.
// Registros excluídos logicamente ficam de fora. Todas as consultas são de leitura.

async function resumoDasEntregas(de, ate) {
    const resultado = await pool.query(
        `WITH periodo AS (
             SELECT e.*,
                    (SELECT MAX(r.data_hora)::date FROM rastreamento r
                     WHERE r.entrega_id = e.id AND r.status = 'entregue' AND r.excluido_em IS NULL) AS entregue_em
             FROM entregas e
             WHERE e.excluido_em IS NULL AND e.criado_em::date BETWEEN $1::date AND $2::date
         )
         SELECT
             COUNT(*)::int AS criadas,
             COUNT(*) FILTER (WHERE status = 'entregue')::int AS entregues,
             COUNT(*) FILTER (WHERE status = 'cancelado')::int AS canceladas,
             COUNT(*) FILTER (WHERE status NOT IN ('entregue', 'cancelado'))::int AS em_andamento,
             COUNT(*) FILTER (WHERE status NOT IN ('entregue', 'cancelado') AND data_prevista < CURRENT_DATE)::int AS atrasadas,
             COUNT(*) FILTER (WHERE status = 'entregue' AND data_prevista IS NOT NULL)::int AS entregues_com_previsao,
             COUNT(*) FILTER (WHERE status = 'entregue' AND data_prevista IS NOT NULL AND entregue_em <= data_prevista)::int AS entregues_no_prazo,
             COALESCE(SUM(quantidade) FILTER (WHERE status <> 'cancelado'), 0)::int AS unidades_enviadas
         FROM periodo`,
        [de, ate]
    );
    return resultado.rows[0];
}

async function entregasPorDia(de, ate) {
    const resultado = await pool.query(
        `SELECT TO_CHAR(dia, 'YYYY-MM-DD') AS dia, COUNT(e.id)::int AS total
         FROM generate_series($1::date, $2::date, INTERVAL '1 day') AS dia
         LEFT JOIN entregas e ON e.criado_em::date = dia::date AND e.excluido_em IS NULL
         GROUP BY dia
         ORDER BY dia`,
        [de, ate]
    );
    return resultado.rows;
}

async function entregasPorStatus(de, ate) {
    const resultado = await pool.query(
        `SELECT status, COUNT(*)::int AS total
         FROM entregas
         WHERE excluido_em IS NULL AND criado_em::date BETWEEN $1::date AND $2::date
         GROUP BY status
         ORDER BY total DESC, status`,
        [de, ate]
    );
    return resultado.rows;
}

async function produtosMaisEnviados(de, ate) {
    const resultado = await pool.query(
        `SELECT p.id, p.nome, SUM(e.quantidade)::int AS unidades, COUNT(*)::int AS entregas
         FROM entregas e
         JOIN produtos p ON p.id = e.produto_id
         WHERE e.excluido_em IS NULL AND e.status <> 'cancelado'
           AND e.criado_em::date BETWEEN $1::date AND $2::date
         GROUP BY p.id, p.nome
         ORDER BY unidades DESC, p.nome
         LIMIT 5`,
        [de, ate]
    );
    return resultado.rows;
}

// Movimentações do período, separadas por tipo (estornadas não contam)
async function resumoDasMovimentacoes(de, ate) {
    const resultado = await pool.query(
        `SELECT
             COALESCE(SUM(quantidade) FILTER (WHERE armazem_origem_id IS NULL AND armazem_destino_id IS NOT NULL), 0)::int AS entradas,
             COALESCE(SUM(quantidade) FILTER (WHERE armazem_origem_id IS NOT NULL AND armazem_destino_id IS NULL), 0)::int AS saidas,
             COALESCE(SUM(quantidade) FILTER (WHERE armazem_origem_id IS NOT NULL AND armazem_destino_id IS NOT NULL), 0)::int AS transferencias,
             COUNT(*)::int AS registros
         FROM movimentacoes
         WHERE estornado_em IS NULL AND quantidade IS NOT NULL
           AND data_movimentacao::date BETWEEN $1::date AND $2::date`,
        [de, ate]
    );
    return resultado.rows[0];
}

// Ocupação atual de cada armazém (não depende do período)
async function ocupacaoDosArmazens() {
    const resultado = await pool.query(
        `SELECT a.id, a.nome, a.status, a.capacidade_maxima,
                COALESCE(SUM(e.quantidade_disponivel), 0)::int AS ocupacao
         FROM armazens a
         LEFT JOIN estoque e ON e.armazem_id = a.id
         WHERE a.excluido_em IS NULL
         GROUP BY a.id
         ORDER BY a.nome`
    );
    return resultado.rows;
}

async function gerarRelatorio(de, ate) {
    const [resumo, porDia, porStatus, produtos, movimentacoes, armazens] = await Promise.all([
        resumoDasEntregas(de, ate),
        entregasPorDia(de, ate),
        entregasPorStatus(de, ate),
        produtosMaisEnviados(de, ate),
        resumoDasMovimentacoes(de, ate),
        ocupacaoDosArmazens()
    ]);

    const taxaNoPrazo = resumo.entregues_com_previsao > 0
        ? Math.round((resumo.entregues_no_prazo / resumo.entregues_com_previsao) * 1000) / 10
        : null;

    return {
        periodo: { de, ate },
        entregas: { ...resumo, taxa_no_prazo: taxaNoPrazo },
        entregas_por_dia: porDia,
        entregas_por_status: porStatus,
        produtos_mais_enviados: produtos,
        movimentacoes,
        armazens
    };
}

module.exports = { gerarRelatorio };
