const produtoModel = require("../models/produtoModel");

async function listar(req, res) {
    try {
        const produtos = await produtoModel.listarProdutos();
        res.json(produtos);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao listar produtos" });
    }
}

async function buscarPorId(req, res) {
    try {
        const produto = await produtoModel.buscarProdutoPorId(req.params.id);

        if (!produto) {
            return res.status(404).json({ erro: "Produto não encontrado" });
        }

        res.json(produto);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao buscar produto" });
    }
}

async function criar(req, res) {
    try {
        const { nome, descricao, preco, quantidade } = req.body;

        if (!nome || preco === undefined) {
            return res.status(400).json({ erro: "Nome e preço são obrigatórios" });
        }

        const novoProduto = await produtoModel.criarProduto({
            nome,
            descricao,
            preco,
            quantidade
        });

        res.status(201).json(novoProduto);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao criar produto" });
    }
}

async function atualizar(req, res) {
    try {
        const { nome, descricao, preco, quantidade } = req.body;

        const produtoAtualizado = await produtoModel.atualizarProduto(
            req.params.id,
            { nome, descricao, preco, quantidade }
        );

        if (!produtoAtualizado) {
            return res.status(404).json({ erro: "Produto não encontrado" });
        }

        res.json(produtoAtualizado);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao atualizar produto" });
    }
}

async function deletar(req, res) {
    try {
        const produtoDeletado = await produtoModel.deletarProduto(req.params.id);

        if (!produtoDeletado) {
            return res.status(404).json({ erro: "Produto não encontrado" });
        }

        res.json({ mensagem: "Produto deletado com sucesso" });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao deletar produto" });
    }
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    deletar
};
