const transportadoraModel = require("../models/transportadoraModel");
const { gravarComAuditoria, camposAlterados } = require("../services/auditoria");
const { naoEncontrado } = require("../utils/erros");

async function listar(req, res) {
    res.json(await transportadoraModel.listarTransportadoras(req.dados.query));
}

async function buscarPorId(req, res) {
    const transportadora = await transportadoraModel.buscarTransportadoraPorId(req.dados.params.id);
    if (!transportadora) throw naoEncontrado("Transportadora não encontrada");
    res.json(transportadora);
}

async function criar(req, res) {
    const transportadora = await gravarComAuditoria(
        req,
        { acao: "criar", recurso: "transportadoras", detalhes: { campos: camposAlterados(req.dados.body) } },
        (cliente) => transportadoraModel.criarTransportadora(cliente, req.dados.body)
    );
    res.status(201).json(transportadora);
}

async function atualizar(req, res) {
    const transportadora = await gravarComAuditoria(
        req,
        { acao: "editar", recurso: "transportadoras", detalhes: { campos: camposAlterados(req.dados.body) } },
        (cliente) => transportadoraModel.atualizarTransportadora(cliente, req.dados.params.id, req.dados.body)
    );
    if (!transportadora) throw naoEncontrado("Transportadora não encontrada");
    res.json(transportadora);
}

async function deletar(req, res) {
    const transportadora = await gravarComAuditoria(
        req,
        { acao: "excluir", recurso: "transportadoras", detalhes: (t) => ({ nome: t.nome }) },
        (cliente) => transportadoraModel.excluirTransportadora(cliente, req.dados.params.id)
    );
    if (!transportadora) throw naoEncontrado("Transportadora não encontrada");
    res.json({ mensagem: "Transportadora excluída com sucesso" });
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    deletar
};
