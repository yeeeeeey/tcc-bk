const entregaModel = require("../models/entregaModel");

async function listar(req, res) {
    try {
        const entregas = await entregaModel.listarEntregas();
        res.json(entregas);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao listar entregas" });
    }
}

async function buscarPorId(req, res) {
    try {
        const entrega = await entregaModel.buscarEntregaPorId(req.params.id);

        if (!entrega) {
            return res.status(404).json({ erro: "Entrega não encontrada" });
        }

        res.json(entrega);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao buscar entrega" });
    }
}

async function criar(req, res) {
    try {
        const { produto_id, quantidade, destino, data_prevista, status } = req.body;

        if (!produto_id || !destino) {
            return res.status(400).json({ erro: "produto_id e destino são obrigatórios" });
        }

        const novaEntrega = await entregaModel.criarEntrega({
            produto_id,
            quantidade,
            destino,
            data_prevista,
            status
        });

        res.status(201).json(novaEntrega);
    } catch (erro) {
        console.error(erro);

        if (erro.code === "23503") {
            return res.status(400).json({ erro: "produto_id informado não existe" });
        }

        res.status(500).json({ erro: "Erro ao criar entrega" });
    }
}

async function atualizar(req, res) {
    try {
        const { produto_id, quantidade, destino, data_prevista, status } = req.body;

        const entregaAtualizada = await entregaModel.atualizarEntrega(
            req.params.id,
            { produto_id, quantidade, destino, data_prevista, status }
        );

        if (!entregaAtualizada) {
            return res.status(404).json({ erro: "Entrega não encontrada" });
        }

        res.json(entregaAtualizada);
    } catch (erro) {
        console.error(erro);

        if (erro.code === "23503") {
            return res.status(400).json({ erro: "produto_id informado não existe" });
        }

        res.status(500).json({ erro: "Erro ao atualizar entrega" });
    }
}

async function deletar(req, res) {
    try {
        const entregaDeletada = await entregaModel.deletarEntrega(req.params.id);

        if (!entregaDeletada) {
            return res.status(404).json({ erro: "Entrega não encontrada" });
        }

        res.json({ mensagem: "Entrega deletada com sucesso" });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao deletar entrega" });
    }
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    deletar
};