const pool = require("../database/connection");
const { consultarPaginado, filtroBusca, montarAtualizacao } = require("../utils/consultas");
const { conflito } = require("../utils/erros");

// No pg, os placeholders são $1, $2, $3... (diferente do "?" do mysql2)

const COLUNAS = "id, nome, descricao, preco, quantidade, categoria, codigo, peso, criado_em";
// quantidade fica de fora: é a soma do estoque, mantida pelo gatilho do banco
const EDITAVEIS = ["nome", "descricao", "preco", "categoria", "codigo", "peso"];

async function listarProdutos({ pagina, limite, busca }) {
    const params = [];
    return consultarPaginado({
        select: COLUNAS,
        from: "produtos",
        condicoes: ["excluido_em IS NULL", filtroBusca(["nome", "descricao", "categoria", "codigo"], busca, params)],
        params,
        ordem: "id",
        pagina,
        limite
    });
}

async function buscarProdutoPorId(id, executor = pool) {
    const resultado = await executor.query(
        `SELECT ${COLUNAS} FROM produtos WHERE id = $1 AND excluido_em IS NULL`,
        [id]
    );
    return resultado.rows[0];
}

async function criarProduto(cliente, { nome, descricao, preco, categoria, codigo, peso }) {
    const resultado = await cliente.query(
        `INSERT INTO produtos (nome, descricao, preco, categoria, codigo, peso)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${COLUNAS}`,
        [nome, descricao ?? null, preco, categoria ?? null, codigo ?? null, peso ?? null]
    );
    return resultado.rows[0];
}

// Campos não enviados continuam com o valor atual
async function atualizarProduto(cliente, id, campos) {
    const { sets, params } = montarAtualizacao(campos, EDITAVEIS);
    params.push(id);
    const resultado = await cliente.query(
        `UPDATE produtos SET ${sets.join(", ")}
         WHERE id = $${params.length} AND excluido_em IS NULL
         RETURNING ${COLUNAS}`,
        params
    );
    return resultado.rows[0];
}

// Exclusão lógica (SEC-18): o produto some das listagens, o histórico fica
async function excluirProduto(cliente, id) {
    const atual = await cliente.query(
        "SELECT id, nome, quantidade FROM produtos WHERE id = $1 AND excluido_em IS NULL FOR UPDATE",
        [id]
    );
    const produto = atual.rows[0];
    if (!produto) return null;

    if (produto.quantidade > 0) {
        throw conflito(`O produto ainda tem ${produto.quantidade} unidade(s) em estoque; registre a saída antes de excluí-lo`);
    }

    const abertas = await cliente.query(
        `SELECT COUNT(*)::int AS total FROM entregas
         WHERE produto_id = $1 AND excluido_em IS NULL AND status NOT IN ('entregue', 'cancelado')`,
        [id]
    );
    if (abertas.rows[0].total > 0) {
        throw conflito("O produto tem entregas em andamento e não pode ser excluído");
    }

    const resultado = await cliente.query(
        "UPDATE produtos SET excluido_em = NOW() WHERE id = $1 RETURNING id, nome",
        [id]
    );
    return resultado.rows[0];
}

module.exports = {
    listarProdutos,
    buscarProdutoPorId,
    criarProduto,
    atualizarProduto,
    excluirProduto
};
