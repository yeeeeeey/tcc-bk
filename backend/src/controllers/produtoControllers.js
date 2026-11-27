// No Express 5, erros lançados em funções async chegam sozinhos ao tratador
// central (middlewares/erros.js), que devolve 400/404/409 ou 500 sem vazar detalhes.
const produtoModel = require("../models/produtoModel");
const estoque = require("../services/estoque");
const { gravarComAuditoria, camposAlterados } = require("../services/auditoria");
const { naoEncontrado } = require("../utils/erros");

async function listar(req, res) {
    res.json(await produtoModel.listarProdutos(req.dados.query));
}

async function buscarPorId(req, res) {
    const produto = await produtoModel.buscarProdutoPorId(req.dados.params.id);
    if (!produto) throw naoEncontrado("Produto não encontrado");
    res.json(produto);
}

async function criar(req, res) {
    const { quantidade, armazem_id: armazemId, ...campos } = req.dados.body;

    const produto = await gravarComAuditoria(
        req,
        { acao: "criar", recurso: "produtos", detalhes: { campos: camposAlterados(req.dados.body) } },
        async (cliente) => {
            const novo = await produtoModel.criarProduto(cliente, campos);

            // Estoque inicial entra no armazém informado (o total é atualizado pelo gatilho)
            if (quantidade > 0) {
                const armazem = (await estoque.bloquearArmazens(cliente, [armazemId])).get(armazemId);
                estoque.exigirArmazemAtivo(armazem);
                await estoque.creditar(cliente, { produtoId: novo.id, armazem, quantidade });
            }

            return produtoModel.buscarProdutoPorId(novo.id, cliente);
        }
    );

    res.status(201).json(produto);
}

async function atualizar(req, res) {
    const produto = await gravarComAuditoria(
        req,
        { acao: "editar", recurso: "produtos", detalhes: { campos: camposAlterados(req.dados.body) } },
        (cliente) => produtoModel.atualizarProduto(cliente, req.dados.params.id, req.dados.body)
    );

    if (!produto) throw naoEncontrado("Produto não encontrado");
    res.json(produto);
}

async function deletar(req, res) {
    const produto = await gravarComAuditoria(
        req,
        { acao: "excluir", recurso: "produtos", detalhes: (p) => ({ nome: p.nome }) },
        (cliente) => produtoModel.excluirProduto(cliente, req.dados.params.id)
    );

    if (!produto) throw naoEncontrado("Produto não encontrado");
    res.json({ mensagem: "Produto excluído com sucesso" });
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    deletar
};
