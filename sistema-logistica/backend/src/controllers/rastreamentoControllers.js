const rastreamentoModel = require("../models/rastreamentoModel");

async function listar(req, res) {
    try {
        const rastreamentos = await rastreamentoModel.listarRastreamentos();
        res.json(rastreamentos);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao listar rastreamentos" });
    }
}

async function buscarPorId(req, res) {
    try {
        const rastreamento = await rastreamentoModel.buscarRastreamentoPorId(req.params.id);

        if (!rastreamento) {
            return res.status(404).json({ erro: "Rastreamento não encontrado" });
        }

        res.json(rastreamento);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao buscar rastreamento" });
    }
}

// Histórico de localização de uma entrega específica
// GET /rastreamento/entrega/:entrega_id
async function buscarPorEntrega(req, res) {
    try {
        const rastreamentos = await rastreamentoModel.listarRastreamentosPorEntrega(req.params.entrega_id);
        res.json(rastreamentos);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao buscar rastreamento da entrega" });
    }
}

async function criar(req, res) {
    try {
        const { entrega_id, localizacao_atual, status } = req.body;

        if (!entrega_id || !localizacao_atual) {
            return res.status(400).json({ erro: "entrega_id e localizacao_atual são obrigatórios" });
        }

        const novoRastreamento = await rastreamentoModel.criarRastreamento({
            entrega_id,
            localizacao_atual,
            status
        });

        res.status(201).json(novoRastreamento);
    } catch (erro) {
        console.error(erro);

        if (erro.code === "23503") {
            return res.status(400).json({ erro: "entrega_id informado não existe" });
        }

        res.status(500).json({ erro: "Erro ao criar rastreamento" });
    }
}

async function atualizar(req, res) {
    try {
        const { localizacao_atual, status } = req.body;

        const rastreamentoAtualizado = await rastreamentoModel.atualizarRastreamento(
            req.params.id,
            { localizacao_atual, status }
        );

        if (!rastreamentoAtualizado) {
            return res.status(404).json({ erro: "Rastreamento não encontrado" });
        }

        res.json(rastreamentoAtualizado);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao atualizar rastreamento" });
    }
}

async function deletar(req, res) {
    try {
        const rastreamentoDeletado = await rastreamentoModel.deletarRastreamento(req.params.id);

        if (!rastreamentoDeletado) {
            return res.status(404).json({ erro: "Rastreamento não encontrado" });
        }

        res.json({ mensagem: "Rastreamento deletado com sucesso" });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao deletar rastreamento" });
    }
}

module.exports = {
    listar,
    buscarPorId,
    buscarPorEntrega,
    criar,
    atualizar,
    deletar
};