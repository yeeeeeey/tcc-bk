const veiculoModel = require("../models/veiculoModel");
const { gravarComAuditoria, camposAlterados } = require("../services/auditoria");
const { naoEncontrado } = require("../utils/erros");

async function listar(req, res) {
    res.json(await veiculoModel.listarVeiculos(req.dados.query));
}

async function buscarPorId(req, res) {
    const veiculo = await veiculoModel.buscarVeiculoPorId(req.dados.params.id);
    if (!veiculo) throw naoEncontrado("Veículo não encontrado");
    res.json(veiculo);
}

async function criar(req, res) {
    const veiculo = await gravarComAuditoria(
        req,
        { acao: "criar", recurso: "veiculos", detalhes: { campos: camposAlterados(req.dados.body) } },
        (cliente) => veiculoModel.criarVeiculo(cliente, req.dados.body)
    );
    res.status(201).json(veiculo);
}

async function atualizar(req, res) {
    const veiculo = await gravarComAuditoria(
        req,
        { acao: "editar", recurso: "veiculos", detalhes: { campos: camposAlterados(req.dados.body) } },
        (cliente) => veiculoModel.atualizarVeiculo(cliente, req.dados.params.id, req.dados.body)
    );
    if (!veiculo) throw naoEncontrado("Veículo não encontrado");
    res.json(veiculo);
}

async function deletar(req, res) {
    const veiculo = await gravarComAuditoria(
        req,
        { acao: "excluir", recurso: "veiculos", detalhes: (v) => ({ placa: v.placa }) },
        (cliente) => veiculoModel.excluirVeiculo(cliente, req.dados.params.id)
    );
    if (!veiculo) throw naoEncontrado("Veículo não encontrado");
    res.json({ mensagem: "Veículo excluído com sucesso" });
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    deletar
};
