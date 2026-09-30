const veiculoModel = require("../models/veiculoModel");

async function listar(req, res) {
    try {
        const veiculos = await veiculoModel.listarVeiculos();
        res.json(veiculos);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao listar veículos" });
    }
}

async function buscarPorId(req, res) {
    try {
        const veiculo = await veiculoModel.buscarVeiculoPorId(req.params.id);

        if (!veiculo) {
            return res.status(404).json({ erro: "Veículo não encontrado" });
        }

        res.json(veiculo);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao buscar veículo" });
    }
}

async function criar(req, res) {
    try {
        const { placa, modelo, capacidade_carga, status, transportadora_id } = req.body;

        if (!placa || !modelo) {
            return res.status(400).json({ erro: "Placa e modelo são obrigatórios" });
        }

        const novoVeiculo = await veiculoModel.criarVeiculo({
            placa,
            modelo,
            capacidade_carga,
            status,
            transportadora_id
        });

        res.status(201).json(novoVeiculo);
    } catch (erro) {
        console.error(erro);

        if (erro.code === "23505") {
            return res.status(409).json({ erro: "Placa já cadastrada" });
        }

        if (erro.code === "23503") {
            return res.status(400).json({ erro: "transportadora_id informado não existe" });
        }

        res.status(500).json({ erro: "Erro ao criar veículo" });
    }
}

async function atualizar(req, res) {
    try {
        const { placa, modelo, capacidade_carga, status, transportadora_id } = req.body;

        const veiculoAtualizado = await veiculoModel.atualizarVeiculo(
            req.params.id,
            { placa, modelo, capacidade_carga, status, transportadora_id }
        );

        if (!veiculoAtualizado) {
            return res.status(404).json({ erro: "Veículo não encontrado" });
        }

        res.json(veiculoAtualizado);
    } catch (erro) {
        console.error(erro);

        if (erro.code === "23505") {
            return res.status(409).json({ erro: "Placa já cadastrada" });
        }

        if (erro.code === "23503") {
            return res.status(400).json({ erro: "transportadora_id informado não existe" });
        }

        res.status(500).json({ erro: "Erro ao atualizar veículo" });
    }
}

async function deletar(req, res) {
    try {
        const veiculoDeletado = await veiculoModel.deletarVeiculo(req.params.id);

        if (!veiculoDeletado) {
            return res.status(404).json({ erro: "Veículo não encontrado" });
        }

        res.json({ mensagem: "Veículo deletado com sucesso" });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao deletar veículo" });
    }
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    deletar
};