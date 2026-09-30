const transportadoraModel = require("../models/transportadoraModel");

async function listar(req, res) {
    try {
        const transportadoras = await transportadoraModel.listarTransportadoras();
        res.json(transportadoras);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao listar transportadoras" });
    }
}

async function buscarPorId(req, res) {
    try {
        const transportadora = await transportadoraModel.buscarTransportadoraPorId(req.params.id);

        if (!transportadora) {
            return res.status(404).json({ erro: "Transportadora não encontrada" });
        }

        res.json(transportadora);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao buscar transportadora" });
    }
}

async function criar(req, res) {
    try {
        const { nome, cnpj, contato } = req.body;

        if (!nome || !cnpj) {
            return res.status(400).json({ erro: "Nome e CNPJ são obrigatórios" });
        }

        const novaTransportadora = await transportadoraModel.criarTransportadora({
            nome,
            cnpj,
            contato
        });

        res.status(201).json(novaTransportadora);
    } catch (erro) {
        console.error(erro);

        // 23505 = violação de UNIQUE (cnpj já cadastrado)
        if (erro.code === "23505") {
            return res.status(409).json({ erro: "CNPJ já cadastrado" });
        }

        res.status(500).json({ erro: "Erro ao criar transportadora" });
    }
}

async function atualizar(req, res) {
    try {
        const { nome, cnpj, contato } = req.body;

        const transportadoraAtualizada = await transportadoraModel.atualizarTransportadora(
            req.params.id,
            { nome, cnpj, contato }
        );

        if (!transportadoraAtualizada) {
            return res.status(404).json({ erro: "Transportadora não encontrada" });
        }

        res.json(transportadoraAtualizada);
    } catch (erro) {
        console.error(erro);

        if (erro.code === "23505") {
            return res.status(409).json({ erro: "CNPJ já cadastrado" });
        }

        res.status(500).json({ erro: "Erro ao atualizar transportadora" });
    }
}

async function deletar(req, res) {
    try {
        const transportadoraDeletada = await transportadoraModel.deletarTransportadora(req.params.id);

        if (!transportadoraDeletada) {
            return res.status(404).json({ erro: "Transportadora não encontrada" });
        }

        res.json({ mensagem: "Transportadora deletada com sucesso" });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao deletar transportadora" });
    }
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    deletar
};