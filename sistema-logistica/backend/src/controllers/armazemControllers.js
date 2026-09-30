const armazemModel = require("../models/armazemModel");
 
async function listar(req, res) {
    try {
        const armazens = await armazemModel.listarArmazens();
        res.json(armazens);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao listar armazéns" });
    }
}
 
async function buscarPorId(req, res) {
    try {
        const armazem = await armazemModel.buscarArmazemPorId(req.params.id);
 
        if (!armazem) {
            return res.status(404).json({ erro: "Armazém não encontrado" });
        }
 
        res.json(armazem);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao buscar armazém" });
    }
}
 
async function criar(req, res) {
    try {
        const { nome, localizacao, capacidade_maxima, status } = req.body;
 
        if (!nome || !localizacao) {
            return res.status(400).json({ erro: "Nome e localização são obrigatórios" });
        }
 
        const novoArmazem = await armazemModel.criarArmazem({
            nome,
            localizacao,
            capacidade_maxima,
            status
        });
 
        res.status(201).json(novoArmazem);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao criar armazém" });
    }
}
 
async function atualizar(req, res) {
    try {
        const { nome, localizacao, capacidade_maxima, status } = req.body;
 
        const armazemAtualizado = await armazemModel.atualizarArmazem(
            req.params.id,
            { nome, localizacao, capacidade_maxima, status }
        );
 
        if (!armazemAtualizado) {
            return res.status(404).json({ erro: "Armazém não encontrado" });
        }
 
        res.json(armazemAtualizado);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao atualizar armazém" });
    }
}
 
async function deletar(req, res) {
    try {
        const armazemDeletado = await armazemModel.deletarArmazem(req.params.id);
 
        if (!armazemDeletado) {
            return res.status(404).json({ erro: "Armazém não encontrado" });
        }
 
        res.json({ mensagem: "Armazém deletado com sucesso" });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao deletar armazém" });
    }
}
 
module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    deletar
};