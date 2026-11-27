const rastreamentoModel = require("../models/rastreamentoModel");
const entregaModel = require("../models/entregaModel");
const { aplicarMudancaDeStatus } = require("../services/entregas");
const { registrarAuditoria } = require("../services/auditoria");
const { comTransacao } = require("../utils/transacao");
const { validarTransicao } = require("../regras/statusEntrega");
const { naoEncontrado, requisicaoInvalida, conflito } = require("../utils/erros");

async function listar(req, res) {
    res.json(await rastreamentoModel.listarRastreamentos(req.dados.query));
}

async function buscarPorId(req, res) {
    const rastreamento = await rastreamentoModel.buscarRastreamentoPorId(req.dados.params.id);
    if (!rastreamento) throw naoEncontrado("Rastreamento não encontrado");
    res.json(rastreamento);
}

// Histórico de localização de uma entrega específica
// GET /rastreamento/entrega/:entrega_id
async function buscarPorEntrega(req, res) {
    const entrega = await entregaModel.buscarEntregaPorId(req.dados.params.entrega_id);
    if (!entrega) throw naoEncontrado("Entrega não encontrada");
    res.json(await rastreamentoModel.listarRastreamentosPorEntrega(entrega.id));
}

// Registra o evento e atualiza o status da entrega na MESMA transação (SEC-20):
// se qualquer passo falhar, o ROLLBACK desfaz os dois.
async function criar(req, res) {
    const { entrega_id, localizacao_atual, status } = req.dados.body;

    const evento = await comTransacao(async (cliente) => {
        const entrega = await entregaModel.bloquearEntrega(cliente, entrega_id);
        if (!entrega) throw requisicaoInvalida("entrega_id informado não existe");

        const statusAnterior = entrega.status;
        validarTransicao(statusAnterior, status);

        const novo = await rastreamentoModel.inserirEvento(cliente, {
            entrega_id,
            localizacao_atual,
            status,
            usuario_id: req.usuario.id
        });

        await aplicarMudancaDeStatus(cliente, entrega, status);

        await registrarAuditoria(req, {
            acao: "criar",
            recurso: "rastreamento",
            recursoId: novo.id,
            cliente,
            detalhes: { entrega_id, status_anterior: statusAnterior, status_novo: status }
        });

        return novo;
    });

    res.status(201).json(evento);
}

// Correções retroativas (SEC-21): só administradores, só no evento mais recente
// da entrega e respeitando as transições. O status da entrega é recalculado a
// partir do histórico e a correção fica registrada na auditoria (antes/depois).
async function corrigirEvento(req, { excluir }) {
    const id = req.dados.params.id;
    const campos = req.dados.body || {};

    return comTransacao(async (cliente) => {
        const evento = await rastreamentoModel.buscarRastreamentoPorId(id, cliente);
        if (!evento) return null;

        const entrega = await entregaModel.bloquearEntrega(cliente, evento.entrega_id);
        if (!entrega) throw conflito("A entrega deste evento foi excluída; o histórico não pode ser alterado");

        const [ultimo, anterior] = await rastreamentoModel.ultimosEventos(cliente, entrega.id, 2);
        if (ultimo.id !== evento.id) {
            throw conflito("Somente o evento mais recente da entrega pode ser corrigido; os anteriores fazem parte do histórico");
        }

        const statusAntesDoEvento = anterior?.status ?? "pendente";
        const statusDaEntregaAntes = entrega.status;
        let resultado;
        let novoStatus;

        if (excluir) {
            await rastreamentoModel.marcarExcluido(cliente, evento.id);
            novoStatus = statusAntesDoEvento;
            resultado = evento;
        } else {
            novoStatus = campos.status ?? evento.status;
            if (campos.status !== undefined) {
                validarTransicao(statusAntesDoEvento, novoStatus);
            }
            resultado = await rastreamentoModel.atualizarEvento(cliente, evento.id, campos);
        }

        await aplicarMudancaDeStatus(cliente, entrega, novoStatus);

        await registrarAuditoria(req, {
            acao: excluir ? "excluir" : "corrigir",
            recurso: "rastreamento",
            recursoId: evento.id,
            cliente,
            detalhes: {
                entrega_id: entrega.id,
                antes: { localizacao_atual: evento.localizacao_atual, status: evento.status },
                depois: excluir ? null : { localizacao_atual: resultado.localizacao_atual, status: resultado.status },
                status_entrega: { de: statusDaEntregaAntes, para: novoStatus }
            }
        });

        return resultado;
    });
}

async function atualizar(req, res) {
    const rastreamento = await corrigirEvento(req, { excluir: false });
    if (!rastreamento) throw naoEncontrado("Rastreamento não encontrado");
    res.json(rastreamento);
}

async function deletar(req, res) {
    const rastreamento = await corrigirEvento(req, { excluir: true });
    if (!rastreamento) throw naoEncontrado("Rastreamento não encontrado");
    res.json({ mensagem: "Evento de rastreamento removido e status da entrega recalculado" });
}

module.exports = {
    listar,
    buscarPorId,
    buscarPorEntrega,
    criar,
    atualizar,
    deletar
};
