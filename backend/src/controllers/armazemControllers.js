const armazemModel = require("../models/armazemModel");
const { gravarComAuditoria, camposAlterados } = require("../services/auditoria");
const { naoEncontrado } = require("../utils/erros");

async function listar(req, res) {
    res.json(await armazemModel.listarArmazens(req.dados.query));
}

async function buscarPorId(req, res) {
    const armazem = await armazemModel.buscarArmazemPorId(req.dados.params.id);
    if (!armazem) throw naoEncontrado("Armazém não encontrado");
    res.json(armazem);
}

async function criar(req, res) {
    const armazem = await gravarComAuditoria(
        req,
        { acao: "criar", recurso: "armazens", detalhes: { campos: camposAlterados(req.dados.body) } },
        (cliente) => armazemModel.criarArmazem(cliente, req.dados.body)
    );
    res.status(201).json(armazem);
}

async function atualizar(req, res) {
    const armazem = await gravarComAuditoria(
        req,
        { acao: "editar", recurso: "armazens", detalhes: { campos: camposAlterados(req.dados.body) } },
        (cliente) => armazemModel.atualizarArmazem(cliente, req.dados.params.id, req.dados.body)
    );
    if (!armazem) throw naoEncontrado("Armazém não encontrado");
    res.json(armazem);
}

async function deletar(req, res) {
    const armazem = await gravarComAuditoria(
        req,
        { acao: "excluir", recurso: "armazens", detalhes: (a) => ({ nome: a.nome }) },
        (cliente) => armazemModel.excluirArmazem(cliente, req.dados.params.id)
    );
    if (!armazem) throw naoEncontrado("Armazém não encontrado");
    res.json({ mensagem: "Armazém excluído com sucesso" });
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    deletar
};
