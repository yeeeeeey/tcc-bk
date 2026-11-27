const pool = require("../database/connection");

// Escapa % e _ para que a busca do usuário seja tratada como texto literal no ILIKE
function escaparLike(texto) {
    return texto.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
}

// Monta "(col1::text ILIKE $n OR col2::text ILIKE $n)" e adiciona o termo em params.
// Os nomes das colunas sempre vêm do código, nunca da requisição.
function filtroBusca(colunas, busca, params) {
    if (!busca) return null;
    params.push(`%${escaparLike(busca)}%`);
    const posicao = params.length;
    return `(${colunas.map((coluna) => `${coluna}::text ILIKE $${posicao}`).join(" OR ")})`;
}

// Listagem paginada: devolve { dados, pagina, limite, total }
async function consultarPaginado({ select, from, condicoes = [], params = [], ordem, pagina = 1, limite = 20, executor = pool }) {
    const filtros = condicoes.filter(Boolean);
    const where = filtros.length > 0 ? `WHERE ${filtros.join(" AND ")}` : "";

    const total = await executor.query(`SELECT COUNT(*)::int AS total FROM ${from} ${where}`, params);
    const dados = await executor.query(
        `SELECT ${select} FROM ${from} ${where} ORDER BY ${ordem} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limite, (pagina - 1) * limite]
    );

    return { dados: dados.rows, pagina, limite, total: total.rows[0].total };
}

// UPDATE parcial: só as colunas presentes em "campos" e listadas em "permitidas"
function montarAtualizacao(campos, permitidas, params = []) {
    const sets = [];
    for (const coluna of permitidas) {
        if (campos[coluna] !== undefined) {
            params.push(campos[coluna]);
            sets.push(`${coluna} = $${params.length}`);
        }
    }
    return { sets, params };
}

module.exports = { escaparLike, filtroBusca, consultarPaginado, montarAtualizacao };
