const movimentacaoModel = require("../models/movimentacaoModel");
 
async function listar(req, res) {
    try {
        const movimentacoes = await movimentacaoModel.listarMovimentacoes();
        res.json(movimentacoes);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao listar movimentações" });
    }
}
 
async function buscarPorId(req, res) {
    try {
        const movimentacao = await movimentacaoModel.buscarMovimentacaoPorId(req.params.id);
 
        if (!movimentacao) {
            return res.status(404).json({ erro: "Movimentação não encontrada" });
        }
 
        res.json(movimentacao);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao buscar movimentação" });
    }
}
 
async function criar(req, res) {
    try {
        const { produto_id, origem, destino } = req.body;
 
        if (!produto_id || !origem || !destino) {
            return res.status(400).json({ erro: "produto_id, origem e destino são obrigatórios" });
        }
 
        const novaMovimentacao = await movimentacaoModel.criarMovimentacao({
            produto_id,
            origem,
            destino
        });
 
        res.status(201).json(novaMovimentacao);
    } catch (erro) {
        console.error(erro);
 
        // 23503 = violação de chave estrangeira (produto_id não existe)
        if (erro.code === "23503") {
            return res.status(400).json({ erro: "produto_id informado não existe" });
        }
 
        res.status(500).json({ erro: "Erro ao criar movimentação" });
    }
}
 
async function atualizar(req, res) {
    try {
        const { produto_id, origem, destino } = req.body;
 
        const movimentacaoAtualizada = await movimentacaoModel.atualizarMovimentacao(
            req.params.id,
            { produto_id, origem, destino }
        );
 
        if (!movimentacaoAtualizada) {
            return res.status(404).json({ erro: "Movimentação não encontrada" });
        }
 
        res.json(movimentacaoAtualizada);
    } catch (erro) {
        console.error(erro);
 
        if (erro.code === "23503") {
            return res.status(400).json({ erro: "produto_id informado não existe" });
        }
 
        res.status(500).json({ erro: "Erro ao atualizar movimentação" });
    }
}
 
async function deletar(req, res) {
    try {
        const movimentacaoDeletada = await movimentacaoModel.deletarMovimentacao(req.params.id);
 
        if (!movimentacaoDeletada) {
            return res.status(404).json({ erro: "Movimentação não encontrada" });
        }
 
        res.json({ mensagem: "Movimentação deletada com sucesso" });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao deletar movimentação" });
    }
}
 
module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    deletar
};